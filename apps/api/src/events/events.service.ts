import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { eventCard, flattenEvent } from '../common/selects';
import { DEFAULT_EVENT_HOURS, HOUR_MS, When, windowFor } from '../common/time';

export type EventQuery = {
  when?: When;
  genre?: string;
  venue?: string;
  artist?: string;
  limit?: number;
};

/** Henüz bitmemiş etkinlik koşulu (bitiş saati yoksa varsayılan süre). */
export function notEndedWhere(now = new Date()): Prisma.EventWhereInput {
  return {
    OR: [
      { endsAt: { gte: now } },
      { endsAt: null, startsAt: { gte: new Date(now.getTime() - DEFAULT_EVENT_HOURS * HOUR_MS) } },
    ],
  };
}

/** notEndedWhere'in tersi. NOT kullanılmaz: SQL'de NULL karşılaştırması satırı düşürür. */
export function endedWhere(now = new Date()): Prisma.EventWhereInput {
  return {
    OR: [
      { endsAt: { lt: now } },
      { endsAt: null, startsAt: { lt: new Date(now.getTime() - DEFAULT_EVENT_HOURS * HOUR_MS) } },
    ],
  };
}

/** Yayında ve henüz bitmemiş etkinlik koşulu. */
export function liveEventWhere(now = new Date()): Prisma.EventWhereInput {
  return { status: 'PUBLISHED', ...notEndedWhere(now) };
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: EventQuery) {
    const now = new Date();
    const { from, to } = windowFor(q.when ?? 'upcoming', now);
    const where: Prisma.EventWhereInput = {
      AND: [
        liveEventWhere(now),
        { startsAt: { gte: from, ...(to ? { lt: to } : {}) } },
        q.genre ? { genres: { some: { slug: q.genre } } } : {},
        q.venue ? { venue: { slug: q.venue } } : {},
        q.artist ? { artists: { some: { artist: { slug: q.artist } } } } : {},
      ],
    };
    const rows = await this.prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      take: Math.min(q.limit ?? 50, 100),
      select: eventCard,
    });
    return rows.map(flattenEvent);
  }

  async get(slug: string) {
    const e = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        ...eventCard,
        description: true,
        status: true,
        venue: {
          select: { slug: true, name: true, district: true, address: true, lat: true, lng: true, coverUrl: true },
        },
        artists: {
          orderBy: { sort: 'asc' },
          select: { artist: { select: { slug: true, name: true, imageUrl: true } } },
        },
      },
    });
    if (!e || e.status === 'DRAFT') throw new NotFoundException('Etkinlik bulunamadı');
    return { ...e, artists: e.artists.map((a) => a.artist) };
  }
}
