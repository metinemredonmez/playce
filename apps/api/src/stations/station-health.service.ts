import { Injectable, NotFoundException } from '@nestjs/common';
import { Station, StationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RadioService, tritonMount } from '../radio/radio.service';
import { forEachLimit } from '../common/async';

/** Bu kadar ardışık başarısız kontrolden sonra istasyon DOWN olur ve uygulamada gizlenir. */
export const DOWN_AFTER = 3;
const CONCURRENCY = 6;

type Checked = Pick<Station, 'id' | 'slug' | 'streamUrl' | 'hasMetadata' | 'status' | 'failCount'>;

/**
 * İstasyon sağlığı (worker'da saatte bir; admin "test et" ile anında).
 * Başarısız kontrol failCount'u artırır, 3'te DOWN. Başarılı kontrol sayacı sıfırlar:
 * ICY bekleniyorken gelmiyorsa NO_METADATA (çalar ama "şu an çalan" yok), değilse OK.
 */
@Injectable()
export class StationHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly radio: RadioService,
  ) {}

  async checkAll(now = new Date()) {
    const stations = await this.prisma.station.findMany({
      select: { id: true, slug: true, streamUrl: true, hasMetadata: true, status: true, failCount: true },
    });
    let down = 0;
    let recovered = 0;
    await forEachLimit(stations, CONCURRENCY, async (s) => {
      const { status } = await this.check(s, now);
      if (status === 'DOWN' && s.status !== 'DOWN') down++;
      if (status !== 'DOWN' && s.status === 'DOWN') recovered++;
    });
    return { checked: stations.length, down, recovered };
  }

  async check(station: Checked, now = new Date()) {
    const probe = await this.radio.probe(station.streamUrl);
    const failCount = probe.ok ? 0 : station.failCount + 1;
    const status: StationStatus = !probe.ok
      ? failCount >= DOWN_AFTER
        ? 'DOWN'
        : station.status
      : station.hasMetadata && !probe.icy
        ? 'NO_METADATA'
        : 'OK';
    await this.prisma.station.update({
      where: { id: station.id },
      data: {
        status,
        failCount,
        lastCheckedAt: now,
        lastError: probe.error,
        ...(probe.ok ? { codec: probe.codec, bitrate: probe.bitrate } : {}),
      },
    });
    return { status, failCount, probe };
  }

  /** Admin "test et": hemen kontrol et, ICY varsa çalan parçayı da göster. */
  async test(slug: string) {
    const station = await this.prisma.station.findUnique({ where: { slug } });
    if (!station) throw new NotFoundException('İstasyon bulunamadı');
    const result = await this.check(station);
    const nowPlaying = result.probe.icy ? await this.radio.nowPlaying(station.streamUrl) : null;
    return { slug, previous: station.status, ...result, nowPlaying };
  }

  /** Admin sağlık listesi: sorunlular üstte, son çalma zamanıyla. */
  async report() {
    const [stations, lastPlays] = await Promise.all([
      this.prisma.station.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          streamUrl: true,
          hasMetadata: true,
          status: true,
          failCount: true,
          lastCheckedAt: true,
          lastError: true,
          codec: true,
          bitrate: true,
          genre: { select: { slug: true } },
        },
      }),
      this.prisma.playLog.groupBy({ by: ['stationId'], _max: { at: true } }),
    ]);
    const lastPlay = new Map(lastPlays.map((p) => [p.stationId, p._max.at]));
    const rank: Record<StationStatus, number> = { DOWN: 0, NO_METADATA: 1, OK: 2 };
    return stations
      .map(({ id, genre, ...s }) => ({
        ...s,
        genre: genre.slug,
        // "Şu an çalan" kaynağı: Triton (kapaklı) > ICY > yok (HLS)
        metadataSource: tritonMount(s.streamUrl) ? 'triton' : s.hasMetadata ? 'icy' : null,
        lastPlayAt: lastPlay.get(id) ?? null,
      }))
      .sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name, 'tr'));
  }
}
