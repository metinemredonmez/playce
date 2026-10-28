import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/text';

/** Mekânların semtleri (filtre listesi). Aynı semt farklı yazılmışsa ("Beyoğlu" / "beyoglu") tek satır olur. */
export async function districts(prisma: PrismaService) {
  const rows = await prisma.venue.groupBy({ by: ['district'], _count: { _all: true } });
  const bySlug = new Map<string, { slug: string; name: string; venues: number }>();
  for (const r of rows) {
    const slug = slugify(r.district);
    const d = bySlug.get(slug);
    if (d) d.venues += r._count._all;
    else bySlug.set(slug, { slug, name: r.district, venues: r._count._all });
  }
  return [...bySlug.values()].sort((a, b) => b.venues - a.venues || a.name.localeCompare(b.name, 'tr'));
}

/** Filtre parametresi slug ("beyoglu") ya da ad ("Beyoğlu") olabilir → veritabanındaki yazılışlar. */
export async function districtNames(prisma: PrismaService, param: string) {
  const slug = slugify(param);
  const rows = await prisma.venue.findMany({ distinct: ['district'], select: { district: true } });
  return rows.map((r) => r.district).filter((d) => slugify(d) === slug);
}
