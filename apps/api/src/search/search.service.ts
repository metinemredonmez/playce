import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { eventCard, flattenEvent, genreCard } from '../common/selects';
import { normalize } from '../common/text';
import { liveEventWhere } from '../events/events.service';

/**
 * Bulanık eşleşme eşiği (pg_trgm word_similarity). Ölçülen değerler:
 * "tarkn" → Tarkan 0.67, "black cofee" → Black Coffee 0.79, "ezel" → Ezhel 0.40; alakasızlar < 0.35.
 */
const FUZZY = 0.4;
/** Daha kısa sorguda yalnız önek eşleşmesi: "joy" Norah Jones'u getirmesin. */
const FUZZY_MIN_LENGTH = 4;
const PER_KIND = 5;

type Table = 'Artist' | 'Venue' | 'Event' | 'Station';

/**
 * Birleşik arama. Her tablonun `searchText` sütunu DB tetikleyicisiyle normalize edilmiş halde tutulur
 * (playce_norm = common/text normalize); sorgu da aynı şekilde normalize edilir.
 * Eşleşme: tam önek, kelime öneki ya da (4+ harfte) trigram benzerliği. Sıra: önek eşleşmesi, sonra benzerlik.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(raw: string) {
    const q = normalize(raw);
    if (q.length < 2) return { artists: [], venues: [], events: [], stations: [] };

    const [, artistIds, venueIds, eventIds, stationIds] = await this.prisma.$transaction([
      // Eşik yalnız bu işlem için (havuzdaki bağlantı kalıcı ayar taşımasın).
      this.prisma.$queryRaw`SELECT set_config('pg_trgm.word_similarity_threshold', ${String(FUZZY)}, true)`,
      this.match('Artist', q, PER_KIND),
      this.match('Venue', q, PER_KIND),
      this.match('Event', q, 30, Prisma.sql`AND status = 'PUBLISHED'`),
      this.match('Station', q, PER_KIND, Prisma.sql`AND status <> 'DOWN'`),
    ]);

    const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
    const [artists, venues, events, stations] = await Promise.all([
      this.prisma.artist.findMany({ where: { id: { in: ids(artistIds) } }, select: { id: true, slug: true, name: true, imageUrl: true } }),
      this.prisma.venue.findMany({ where: { id: { in: ids(venueIds) } }, select: { id: true, slug: true, name: true, district: true, coverUrl: true } }),
      // Başlığı eşleşen ya da lineup'ında eşleşen sanatçı olan yaklaşan etkinlikler
      this.prisma.event.findMany({
        where: {
          AND: [
            liveEventWhere(),
            { OR: [{ id: { in: ids(eventIds) } }, { artists: { some: { artistId: { in: ids(artistIds) } } } }] },
          ],
        },
        orderBy: { startsAt: 'asc' },
        take: PER_KIND * 2,
        select: eventCard,
      }),
      this.prisma.station.findMany({
        where: { id: { in: ids(stationIds) } },
        select: { id: true, slug: true, name: true, streamUrl: true, logoUrl: true, hasMetadata: true, status: true, genre: genreCard },
      }),
    ]);

    return {
      artists: inOrder(artists, artistIds),
      venues: inOrder(venues, venueIds),
      events: events.map(flattenEvent),
      stations: inOrder(stations, stationIds).map(({ status, hasMetadata, ...s }) => ({ ...s, hasMetadata: hasMetadata && status === 'OK' })),
    };
  }

  /** q normalize edilmiş olduğundan yalnız [a-z0-9 ] içerir: LIKE joker karakteri kaçırmaya gerek yok. */
  private match(table: Table, q: string, limit: number, extra = Prisma.empty) {
    const fuzzy = q.length >= FUZZY_MIN_LENGTH ? Prisma.sql`OR ${q} <% "searchText"` : Prisma.empty;
    return this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM ${Prisma.raw(`"${table}"`)}
      WHERE ("searchText" LIKE ${`${q}%`} OR "searchText" LIKE ${`% ${q}%`} ${fuzzy}) ${extra}
      ORDER BY "searchText" LIKE ${`${q}%`} DESC, word_similarity(${q}, "searchText") DESC, "searchText"
      LIMIT ${limit}`;
  }
}

/** Sıralamayı eşleşme puanına göre koru, iç kimliği yanıttan çıkar. */
function inOrder<T extends { id: string }>(rows: T[], order: { id: string }[]) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return order.flatMap(({ id }) => {
    const row = byId.get(id);
    if (!row) return [];
    const { id: _id, ...rest } = row;
    return [rest];
  });
}
