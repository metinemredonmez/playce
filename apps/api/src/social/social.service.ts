import { Injectable, NotFoundException } from '@nestjs/common';
import { SaveStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { eventCard, flattenEvent } from '../common/selects';
import { endedWhere, liveEventWhere, notEndedWhere } from '../events/events.service';
import { FavStationDto, MergeDeviceDto } from './social.dto';

// Takip / kaydet / favori istasyon. Tüm yazmalar idempotent: aynı PUT iki kez = tek kayıt.
@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- sanatçı ----
  async followArtist(userId: string, slug: string, notifyOnRadio?: boolean) {
    const artistId = await this.id('artist', slug);
    const f = await this.prisma.artistFollow.upsert({
      where: { userId_artistId: { userId, artistId } },
      create: { userId, artistId, notifyOnRadio: notifyOnRadio ?? true },
      update: notifyOnRadio === undefined ? {} : { notifyOnRadio },
    });
    return { following: true, notifyOnRadio: f.notifyOnRadio };
  }

  async unfollowArtist(userId: string, slug: string) {
    await this.prisma.artistFollow.deleteMany({ where: { userId, artist: { slug } } });
    return { following: false };
  }

  // ---- mekân ----
  async followVenue(userId: string, slug: string) {
    const venueId = await this.id('venue', slug);
    await this.prisma.venueFollow.upsert({
      where: { userId_venueId: { userId, venueId } },
      create: { userId, venueId },
      update: {},
    });
    return { following: true };
  }

  async unfollowVenue(userId: string, slug: string) {
    await this.prisma.venueFollow.deleteMany({ where: { userId, venue: { slug } } });
    return { following: false };
  }

  async following(userId: string) {
    const [artists, venues] = await Promise.all([
      this.prisma.artistFollow.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          notifyOnRadio: true,
          artist: {
            select: {
              slug: true,
              name: true,
              imageUrl: true,
              events: {
                where: { event: liveEventWhere() },
                orderBy: { event: { startsAt: 'asc' } },
                take: 1,
                select: { event: { select: { slug: true, title: true, startsAt: true } } },
              },
            },
          },
        },
      }),
      this.prisma.venueFollow.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { venue: { select: { slug: true, name: true, district: true, coverUrl: true } } },
      }),
    ]);
    return {
      artists: artists.map(({ notifyOnRadio, artist: { events, ...a } }) => ({
        ...a,
        notifyOnRadio,
        nextEvent: events[0]?.event ?? null,
      })),
      venues: venues.map((v) => v.venue),
    };
  }

  // ---- etkinlik kaydet ----
  async save(userId: string, slug: string, status?: SaveStatus) {
    const eventId = await this.id('event', slug);
    const s = await this.prisma.savedEvent.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, status: status ?? 'INTERESTED' },
      update: status ? { status } : {},
    });
    return { saved: true, status: s.status };
  }

  async unsave(userId: string, slug: string) {
    await this.prisma.savedEvent.deleteMany({ where: { userId, event: { slug } } });
    return { saved: false };
  }

  /** Takvimim: yaklaşanlar (iptal edilenler dahil, rozetle gösterilsin) veya geçmiş. */
  async saves(userId: string, when: 'upcoming' | 'past' = 'upcoming') {
    const now = new Date();
    const rows = await this.prisma.savedEvent.findMany({
      where: {
        userId,
        event: when === 'upcoming' ? { status: { not: 'DRAFT' }, ...notEndedWhere(now) } : endedWhere(now),
      },
      orderBy: { event: { startsAt: when === 'upcoming' ? 'asc' : 'desc' } },
      take: 100,
      select: { status: true, createdAt: true, event: { select: { ...eventCard, status: true } } },
    });
    return rows.map((r) => ({ ...flattenEvent(r.event), save: { status: r.status, createdAt: r.createdAt } }));
  }

  // ---- favori istasyon ----
  stations(userId: string) {
    return this.prisma.favoriteStation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, streamUrl: true, genreSlug: true, logoUrl: true, hasMetadata: true, createdAt: true },
    });
  }

  async saveStation(userId: string, dto: FavStationDto) {
    // Küratörlü istasyonsa bağla (istasyon adı/logosu değişirse oradan okunabilsin).
    const curated = await this.prisma.station.findFirst({ where: { streamUrl: dto.streamUrl }, select: { id: true } });
    const data = { ...dto, hasMetadata: dto.hasMetadata ?? !/\.m3u8(\?|$)/i.test(dto.streamUrl), stationId: curated?.id ?? null };
    await this.prisma.favoriteStation.upsert({
      where: { userId_streamUrl: { userId, streamUrl: dto.streamUrl } },
      create: { userId, ...data },
      update: data,
    });
    return this.stations(userId);
  }

  async removeStation(userId: string, streamUrl: string) {
    await this.prisma.favoriteStation.deleteMany({ where: { userId, streamUrl } });
    return this.stations(userId);
  }

  /** Cihazdaki favorileri hesaba taşır. Var olanlara dokunmaz, bilinmeyen slug'ları atlar. */
  async mergeDevice(userId: string, dto: MergeDeviceDto) {
    const result = { stations: 0, venues: 0, artists: 0, events: 0 };
    for (const s of dto.stations ?? []) {
      const exists = await this.prisma.favoriteStation.findUnique({ where: { userId_streamUrl: { userId, streamUrl: s.streamUrl } } });
      if (!exists) {
        await this.saveStation(userId, s);
        result.stations++;
      }
    }
    if (dto.venues?.length) {
      const rows = await this.prisma.venue.findMany({ where: { slug: { in: dto.venues } }, select: { id: true } });
      const r = await this.prisma.venueFollow.createMany({ data: rows.map((v) => ({ userId, venueId: v.id })), skipDuplicates: true });
      result.venues = r.count;
    }
    if (dto.artists?.length) {
      const rows = await this.prisma.artist.findMany({ where: { slug: { in: dto.artists } }, select: { id: true } });
      const r = await this.prisma.artistFollow.createMany({ data: rows.map((a) => ({ userId, artistId: a.id })), skipDuplicates: true });
      result.artists = r.count;
    }
    if (dto.events?.length) {
      const rows = await this.prisma.event.findMany({ where: { slug: { in: dto.events } }, select: { id: true } });
      const r = await this.prisma.savedEvent.createMany({ data: rows.map((e) => ({ userId, eventId: e.id })), skipDuplicates: true });
      result.events = r.count;
    }
    return { merged: result };
  }

  private async id(kind: 'artist' | 'venue' | 'event', slug: string): Promise<string> {
    const where = { where: { slug }, select: { id: true } } as const;
    const row =
      kind === 'artist'
        ? await this.prisma.artist.findUnique(where)
        : kind === 'venue'
          ? await this.prisma.venue.findUnique(where)
          : await this.prisma.event.findUnique(where);
    if (!row) throw new NotFoundException(`${{ artist: 'Sanatçı', venue: 'Mekân', event: 'Etkinlik' }[kind]} bulunamadı`);
    return row.id;
  }
}
