import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UnmatchedStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArtistsService, MatchedArtist } from '../artists/artists.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RadioService, Track } from '../radio/radio.service';
import { normalize, slugify } from '../common/text';
import { trDateKey } from '../common/time';
import { forEachLimit } from '../common/async';

type PolledStation = { id: string; slug: string; name: string; streamUrl: string };

/** Aynı anda en fazla bu kadar yayına bağlanılır (her okuma ≤ 6 sn). */
const POLL_CONCURRENCY = 6;

/**
 * Radyo istatistiği: küratörlü ICY yayınlarını dakikada bir okur, parça değiştiyse PlayLog'a yazar.
 * Eşleşmeyen sanatçılar admin "Eşleşmeyenler" kuyruğuna düşer; eşleşen sanatçının takipçilerine
 * "şu an radyoda" bildirimi gider (kullanıcı başına günde en fazla 1).
 */
@Injectable()
export class PlaylogService {
  /** İstasyon → son kaydedilen ham başlık (aynı parçayı her dakika tekrar yazmamak için). */
  private last: Map<string, string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly radio: RadioService,
    private readonly artists: ArtistsService,
    private readonly notifications: NotificationsService,
  ) {}

  async poll(now = new Date()) {
    // Sağlık işi DOWN / NO_METADATA dediyse okumaya çalışma.
    const stations = await this.prisma.station.findMany({
      where: { hasMetadata: true, status: 'OK' },
      select: { id: true, slug: true, name: true, streamUrl: true },
    });
    let logged = 0;
    await forEachLimit(stations, POLL_CONCURRENCY, async (s) => {
      if (await this.record(s, await this.radio.nowPlaying(s.streamUrl), now)) logged++;
    });
    return { stations: stations.length, logged };
  }

  /** Parça yeni ise kaydeder. true = yazıldı. */
  async record(station: PolledStation, track: Track, now = new Date()): Promise<boolean> {
    const last = await this.lastTitles();
    if (!track.raw || last.get(station.id) === track.raw) return false;
    last.set(station.id, track.raw);

    const artistKey = track.artist ? normalize(track.artist) || null : null;
    let artist = await this.artists.match(track.artist, track.raw);
    const write = () =>
      this.prisma.playLog.create({
        data: { stationId: station.id, raw: track.raw!, artistRaw: track.artist, artistKey, title: track.title, artistId: artist?.id ?? null, at: now },
      });
    try {
      await write();
    } catch (e) {
      // Eşleştirme indeksi (60 sn önbellek) bu süreçte silinmiş bir sanatçıyı gösteriyor olabilir.
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003')) throw e;
      this.artists.invalidate();
      artist = await this.artists.match(track.artist, track.raw);
      await write();
    }

    if (artist) {
      await this.notifyOnRadio(artist, station, track, now);
    } else if (artistKey && track.artist) {
      await this.prisma.unmatchedArtist.upsert({
        where: { key: artistKey },
        create: { key: artistKey, display: track.artist, sampleRaw: track.raw, lastSeenAt: now },
        update: { plays: { increment: 1 }, sampleRaw: track.raw, lastSeenAt: now },
      });
    }
    return true;
  }

  private async notifyOnRadio(artist: MatchedArtist, station: PolledStation, track: Track, now: Date) {
    const followers = await this.prisma.artistFollow.findMany({ where: { artistId: artist.id, notifyOnRadio: true }, select: { userId: true } });
    if (!followers.length) return;
    const day = trDateKey(now);
    await this.notifications.notify(
      followers.map(({ userId }) => ({
        userId,
        kind: 'ARTIST_ON_RADIO',
        title: `${artist.name} şu an radyoda`,
        body: [track.title, station.name].filter(Boolean).join(' · '),
        deeplink: `playce://artist/${artist.slug}`,
        data: { artistSlug: artist.slug, stationSlug: station.slug, streamUrl: station.streamUrl },
        dedupeKey: `radio:${userId}:${day}`,
      })),
      now,
    );
  }

  private async lastTitles() {
    if (!this.last) {
      const rows = await this.prisma.$queryRaw<{ stationId: string; raw: string }[]>`
        SELECT DISTINCT ON ("stationId") "stationId", raw FROM "PlayLog" ORDER BY "stationId", at DESC`;
      this.last = new Map(rows.map((r) => [r.stationId, r.raw]));
    }
    return this.last;
  }

  // ---- public ----

  async stationPlays(slug: string, limit = 20) {
    const station = await this.prisma.station.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } });
    if (!station) throw new NotFoundException('İstasyon bulunamadı');
    const plays = await this.prisma.playLog.findMany({
      where: { stationId: station.id },
      orderBy: { at: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: { at: true, raw: true, artistRaw: true, title: true, artist: { select: { slug: true, name: true, imageUrl: true } } },
    });
    return { station, plays };
  }

  // ---- admin: Eşleşmeyenler kuyruğu ----

  /**
   * Kuyruk, çalma sayısına göre. Her kayıtta hangi istasyonlarda çaldığı (en çok 3) ve
   * o istasyonların türleri — "sanatçı oluştur"da tür önerisi için.
   */
  async unmatched(status: UnmatchedStatus = 'OPEN', limit = 50) {
    const items = await this.prisma.unmatchedArtist.findMany({
      where: { status },
      orderBy: [{ plays: 'desc' }, { lastSeenAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
      include: { artist: { select: { slug: true, name: true } } },
    });
    if (!items.length) return [];
    const plays = await this.prisma.playLog.groupBy({
      by: ['artistKey', 'stationId'],
      where: { artistKey: { in: items.map((i) => i.key) } },
      _count: { _all: true },
    });
    const stations = await this.prisma.station.findMany({
      where: { id: { in: [...new Set(plays.map((p) => p.stationId))] } },
      select: { id: true, slug: true, name: true, genre: { select: { slug: true, name: true } } },
    });
    const byId = new Map(stations.map((s) => [s.id, s]));
    return items.map((item) => {
      const top = plays
        .filter((p) => p.artistKey === item.key)
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 3)
        .map((p) => byId.get(p.stationId))
        .filter((s): s is NonNullable<typeof s> => !!s);
      const genres = [...new Map(top.map((s) => [s.genre.slug, s.genre])).values()];
      return { ...item, stations: top.map(({ id: _id, genre, ...s }) => ({ ...s, genre: genre.slug })), suggestedGenres: genres };
    });
  }

  /** Yoksayılanı kuyruğa geri al (yanlışlıkla yoksayıldıysa). */
  async reopen(key: string) {
    const item = await this.unmatchedOr404(key);
    if (item.status === 'LINKED') throw new BadRequestException('Bağlanmış kayıt geri alınamaz; sanatçıdan alias\'ı sil');
    return this.prisma.unmatchedArtist.update({ where: { key }, data: { status: 'OPEN' } });
  }

  /** Mevcut sanatçıya bağla: yazılış alias olur, geçmiş çalmalar geriye dönük eşlenir. */
  async link(key: string, artistSlug: string) {
    const item = await this.unmatchedOr404(key);
    const artist = await this.prisma.artist.findUnique({ where: { slug: artistSlug }, select: { id: true, name: true, aliases: true } });
    if (!artist) throw new BadRequestException(`Bilinmeyen sanatçı: ${artistSlug}`);
    const known = [artist.name, ...artist.aliases].map(normalize);
    await this.prisma.$transaction([
      this.prisma.artist.update({
        where: { id: artist.id },
        data: known.includes(key) ? {} : { aliases: { push: item.display } },
      }),
      ...this.linkOps([key], artist.id),
    ]);
    this.artists.invalidate();
    return this.unmatchedOr404(key);
  }

  async ignore(key: string) {
    await this.unmatchedOr404(key);
    return this.prisma.unmatchedArtist.update({ where: { key }, data: { status: 'IGNORED' } });
  }

  /** Kuyruktaki isimle yeni sanatçı aç ve bağla. */
  async createArtist(key: string, name?: string, slug?: string, genreSlugs: string[] = []) {
    const item = await this.unmatchedOr404(key);
    const displayName = name?.trim() || item.display;
    const genres = await this.prisma.genre.findMany({ where: { slug: { in: genreSlugs } }, select: { id: true, slug: true } });
    const missing = genreSlugs.filter((g) => !genres.some((r) => r.slug === g));
    if (missing.length) throw new BadRequestException(`Bilinmeyen tür: ${missing.join(', ')}`);
    try {
      const artist = await this.prisma.artist.create({
        data: {
          name: displayName,
          slug: slug ?? slugify(displayName),
          aliases: normalize(displayName) === key ? [] : [item.display],
          genres: { connect: genres.map((g) => ({ id: g.id })) },
        },
      });
      await this.prisma.$transaction(this.linkOps([key], artist.id));
      this.artists.invalidate();
      return this.unmatchedOr404(key);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException('Bu slug zaten kullanılıyor');
      throw e;
    }
  }

  /** Admin sanatçı ekleyince/alias girince kuyrukta bekleyen aynı isimleri otomatik bağla. */
  async autoLink(artistId: string) {
    const artist = await this.prisma.artist.findUnique({ where: { id: artistId }, select: { name: true, aliases: true } });
    if (!artist) return 0;
    const keys = [...new Set([artist.name, ...artist.aliases].map(normalize).filter(Boolean))];
    const pending = await this.prisma.unmatchedArtist.findMany({ where: { key: { in: keys }, status: { not: 'LINKED' } }, select: { key: true } });
    if (pending.length) await this.prisma.$transaction(this.linkOps(pending.map((p) => p.key), artistId));
    return pending.length;
  }

  private linkOps(keys: string[], artistId: string) {
    return [
      this.prisma.unmatchedArtist.updateMany({ where: { key: { in: keys } }, data: { status: 'LINKED', artistId } }),
      this.prisma.playLog.updateMany({ where: { artistKey: { in: keys }, artistId: null }, data: { artistId } }),
    ];
  }

  private async unmatchedOr404(key: string) {
    const item = await this.prisma.unmatchedArtist.findUnique({ where: { key }, include: { artist: { select: { slug: true, name: true } } } });
    if (!item) throw new NotFoundException('Kuyrukta böyle bir kayıt yok');
    return item;
  }
}
