import { Prisma } from '@prisma/client';

// Liste kartlarında kullanılan ortak alan seçimleri.
export const genreCard = { select: { slug: true, name: true, color: true } } as const;

export const eventCard = {
  id: true,
  slug: true,
  title: true,
  coverUrl: true,
  startsAt: true,
  endsAt: true,
  priceFrom: true,
  currency: true,
  isFree: true,
  ageLimit: true,
  ticketUrl: true,
  source: true,
  venue: { select: { slug: true, name: true, district: true, lat: true, lng: true } },
  genres: genreCard,
  artists: {
    orderBy: { sort: 'asc' },
    select: { artist: { select: { slug: true, name: true } } },
  },
} satisfies Prisma.EventSelect;

export type EventCardRow = Prisma.EventGetPayload<{ select: typeof eventCard }>;

/** Lineup'ı düz diziye çevirir: artists: [{slug,name}] */
export function flattenEvent<T extends { artists: { artist: { slug: string; name: string } }[] }>(e: T) {
  return { ...e, artists: e.artists.map((a) => a.artist) };
}
