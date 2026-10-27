import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { eventCard, flattenEvent, genreCard } from '../common/selects';
import { windowFor } from '../common/time';
import { liveEventWhere } from '../events/events.service';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mekân listesi — bu gece etkinliği olanlar önce, sonra sıradaki etkinlik tarihine göre. */
  async list(q: { genre?: string; district?: string }) {
    const now = new Date();
    const rows = await this.prisma.venue.findMany({
      where: {
        ...(q.genre ? { genres: { some: { slug: q.genre } } } : {}),
        ...(q.district ? { district: { equals: q.district, mode: 'insensitive' } } : {}),
      },
      select: {
        slug: true,
        name: true,
        district: true,
        coverUrl: true,
        priceLevel: true,
        source: true,
        genres: genreCard,
        events: {
          where: liveEventWhere(now),
          orderBy: { startsAt: 'asc' },
          take: 1,
          select: { slug: true, title: true, startsAt: true },
        },
      },
    });

    const tonightEnd = windowFor('tonight', now).to!.getTime();
    const venues = rows.map(({ events, ...v }) => {
      const next = events[0] ?? null;
      return { ...v, nextEvent: next, tonight: !!next && next.startsAt.getTime() < tonightEnd };
    });
    return venues.sort((a, b) => {
      if (a.tonight !== b.tonight) return a.tonight ? -1 : 1;
      const at = a.nextEvent?.startsAt.getTime() ?? Infinity;
      const bt = b.nextEvent?.startsAt.getTime() ?? Infinity;
      return at - bt || a.name.localeCompare(b.name, 'tr');
    });
  }

  async get(slug: string) {
    const now = new Date();
    const v = await this.prisma.venue.findUnique({
      where: { slug },
      include: {
        genres: {
          orderBy: { sort: 'asc' },
          select: {
            slug: true,
            name: true,
            color: true,
            // "Mekânın sesi": türün ilk küratörlü istasyonu
            stations: { orderBy: { sort: 'asc' }, take: 1 },
          },
        },
        events: {
          where: liveEventWhere(now),
          orderBy: { startsAt: 'asc' },
          take: 20,
          select: eventCard,
        },
      },
    });
    if (!v) throw new NotFoundException('Mekân bulunamadı');
    const sound = v.genres.find((g) => g.stations.length)?.stations[0] ?? null;
    return {
      ...v,
      genres: v.genres.map(({ stations: _s, ...g }) => g),
      events: v.events.map(flattenEvent),
      sound: sound && {
        id: sound.id,
        name: sound.name,
        streamUrl: sound.streamUrl,
        hasMetadata: sound.hasMetadata,
        genre: v.genres.find((g) => g.stations[0]?.id === sound.id)?.slug ?? null,
      },
    };
  }
}
