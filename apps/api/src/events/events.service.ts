import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventCardRow, eventCard, flattenEvent } from '../common/selects';
import { DEFAULT_EVENT_HOURS, HOUR_MS, parseTrDate, windowFor } from '../common/time';
import { boundingBox, distanceKm, LatLng, parseLatLng } from '../common/geo';
import { districtNames } from '../venues/districts';
import { EventsQuery } from './events.dto';
import { eventIcs } from './ics';

/** Uygulamada açılabilen durumlar: iptal edilen de görünür (kaydedenler "iptal" görsün). */
const VISIBLE: EventStatus[] = ['PUBLISHED', 'CANCELLED'];
/** Konuma göre listede bellekte sıralanacak en fazla aday (yarıçap kutusu içinde). */
const NEAR_CAP = 500;

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

  /**
   * Etkinlik listesi → { items, nextCursor }.
   * Konumsuz: başlangıca göre, keyset cursor (son öğenin id'si).
   * Konumlu (near): yarıçap kutusundaki adaylar bellekte kesin mesafeyle süzülür, sıralanır ve
   * aynı cursor mantığıyla sayfalanır; her öğeye distanceKm eklenir.
   */
  async list(q: EventsQuery) {
    const now = new Date();
    const limit = q.limit ?? 20;
    const center = q.near ? parseLatLng(q.near) : null;
    if (q.near && !center) throw new BadRequestException('near geçersiz: "enlem,boylam" bekleniyor');
    const sort = q.sort ?? (center ? 'nearest' : 'soonest');
    if (sort === 'nearest' && !center) throw new BadRequestException('sort=nearest için near gerekli');
    const radiusKm = q.radiusKm ?? 5;

    const range =
      q.from || q.to
        ? { from: q.from ? parseTrDate(q.from) : windowFor('upcoming', now).from, to: q.to ? parseTrDate(q.to) : undefined }
        : windowFor(q.when ?? 'upcoming', now);
    const where: Prisma.EventWhereInput = {
      AND: [
        liveEventWhere(now),
        { startsAt: { gte: range.from, ...(range.to ? { lt: range.to } : {}) } },
        q.genre ? { genres: { some: { slug: q.genre } } } : {},
        q.venue ? { venue: { slug: q.venue } } : {},
        q.artist ? { artists: { some: { artist: { slug: q.artist } } } } : {},
        q.district ? { venue: { district: { in: await districtNames(this.prisma, q.district) } } } : {},
        q.free ? { isFree: true } : {},
        q.priceMax !== undefined ? { OR: [{ isFree: true }, { priceFrom: { lte: q.priceMax } }] } : {},
        center ? { venue: boundingBox(center, radiusKm) } : {},
      ],
    };

    if (!center) {
      const rows = await this.prisma.event.findMany({
        where,
        orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
        select: eventCard,
      });
      return page(rows.map(flattenEvent), limit);
    }

    const rows = await this.prisma.event.findMany({ where, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], take: NEAR_CAP, select: eventCard });
    const near = rows
      .map((e) => withDistance(e, center))
      .filter((e) => e.distanceKm !== null && e.distanceKm <= radiusKm);
    if (sort === 'nearest') near.sort((a, b) => a.distanceKm! - b.distanceKm!);
    const start = q.cursor ? near.findIndex((e) => e.id === q.cursor) + 1 : 0;
    // Bilinmeyen cursor: listenin sonu say (baştan başlatıp kopya göstermektense)
    return page(q.cursor && start === 0 ? [] : near.slice(start, start + limit + 1), limit);
  }

  async get(slug: string) {
    const e = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        ...eventCard,
        description: true,
        status: true,
        doorsAt: true,
        ticketProvider: true,
        venue: {
          select: { slug: true, name: true, district: true, address: true, lat: true, lng: true, coverUrl: true },
        },
        artists: {
          orderBy: { sort: 'asc' },
          select: { artist: { select: { slug: true, name: true, imageUrl: true } } },
        },
      },
    });
    if (!e || !VISIBLE.includes(e.status)) throw new NotFoundException('Etkinlik bulunamadı');
    return { ...e, artists: e.artists.map((a) => a.artist) };
  }

  /** "Takvime ekle" (.ics) */
  async ics(slug: string) {
    const e = await this.prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        ticketUrl: true,
        status: true,
        venue: { select: { name: true, address: true, district: true, lat: true, lng: true } },
      },
    });
    if (!e || !VISIBLE.includes(e.status)) throw new NotFoundException('Etkinlik bulunamadı');
    return { slug: e.slug, body: eventIcs(e) };
  }
}

function withDistance(e: EventCardRow, center: LatLng) {
  const { lat, lng } = e.venue;
  const km = lat !== null && lng !== null ? distanceKm(center, { lat, lng }) : null;
  return { ...flattenEvent(e), distanceKm: km === null ? null : Math.round(km * 10) / 10 };
}

/** limit+1 satırdan sayfa: fazlası varsa son öğenin id'si sonraki cursor. */
function page<T extends { id: string }>(rows: T[], limit: number) {
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items[items.length - 1].id : null };
}
