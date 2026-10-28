import { PrismaService } from '../prisma/prisma.service';
import { normalize } from '../common/text';
import { boundingBox, distanceKm } from '../common/geo';

/** Koordinatı bu kadar yakın mekân aynı sayılır (içe aktarma birleştirir, panel uyarır) */
export const SAME_VENUE_KM = 0.1;

/**
 * Olası aynı mekân: normalize adı aynı ya da ~100 m içinde.
 * searchText "ad semt" biçiminde normalize tutulduğundan ad eşleşmesi önek araması + kesin karşılaştırma.
 */
export async function findSimilarVenues(
  prisma: PrismaService,
  input: { name?: string | null; lat?: number | null; lng?: number | null; excludeId?: string },
) {
  const key = input.name ? normalize(input.name) : '';
  const center = input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : null;
  if (!key && !center) return [];
  const rows = await prisma.venue.findMany({
    where: {
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      OR: [...(key ? [{ searchText: { startsWith: key } }] : []), ...(center ? [boundingBox(center, SAME_VENUE_KM)] : [])],
    },
    select: { id: true, slug: true, name: true, district: true, lat: true, lng: true },
    take: 20,
  });
  return rows.flatMap((r) => {
    const sameName = !!key && normalize(r.name) === key;
    const meters = center && r.lat != null && r.lng != null ? Math.round(distanceKm(center, { lat: r.lat, lng: r.lng }) * 1000) : null;
    if (!sameName && !(meters !== null && meters <= SAME_VENUE_KM * 1000)) return [];
    return [{ ...r, reason: sameName ? ('name' as const) : ('near' as const), meters }];
  });
}
