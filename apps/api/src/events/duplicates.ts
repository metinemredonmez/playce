import { PrismaService } from '../prisma/prisma.service';
import { normalize } from '../common/text';
import { HOUR_MS } from '../common/time';

/** Aynı mekânda bu kadar yakın saatte, başlığı uyan etkinlik aynı sayılır (03 §7) */
export const SAME_EVENT_WINDOW_MS = 2 * HOUR_MS;

/** Normalize başlıklar eşit ya da kısası (4+ harf) uzununun içinde: "Duman" ~ "Duman Akustik". */
export function sameEventTitle(x: string, y: string) {
  const a = normalize(x);
  const b = normalize(y);
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return a === b || (short.length >= 4 && long.includes(short));
}

/**
 * Olası kopyalar: aynı mekân, ±2 saat, benzer başlık.
 * İçe aktarma ilkini birleştirir; panel formda uyarı olarak gösterir.
 */
export async function findDuplicateEvents(
  prisma: PrismaService,
  input: { venueId: string; startsAt: Date; title: string; excludeId?: string },
) {
  const t = input.startsAt.getTime();
  const candidates = await prisma.event.findMany({
    where: {
      venueId: input.venueId,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      startsAt: { gte: new Date(t - SAME_EVENT_WINDOW_MS), lte: new Date(t + SAME_EVENT_WINDOW_MS) },
    },
    orderBy: { startsAt: 'asc' },
    select: { id: true, slug: true, title: true, startsAt: true, status: true, source: true },
  });
  return candidates.filter((c) => sameEventTitle(c.title, input.title));
}
