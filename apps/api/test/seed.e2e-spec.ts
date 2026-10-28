import { GENRES, seedBase, STATIONS, TAGS } from '../prisma/seed/base';
import { seedDemo } from '../prisma/seed/demo';
import { normalize } from '../src/common/text';
import { createTestApp, resetDb, TestContext } from './utils';

describe('seed ve arama normalizasyonu', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(() => resetDb(ctx.prisma));

  it('temel seed tekrar çalıştırılabilir: yerel türler, etiket eşlemesi, istasyonlar', async () => {
    await seedBase(ctx.prisma);
    await seedBase(ctx.prisma);

    const genres = await ctx.prisma.genre.findMany({ orderBy: { sort: 'asc' }, include: { _count: { select: { stations: true } } } });
    expect(genres.map((g) => g.slug)).toEqual(GENRES.map((g) => g.slug));
    expect(genres.map((g) => g.slug)).toEqual(expect.arrayContaining(['turkce-rap', 'arabesk', 'anadolu-rock', 'fasil']));
    // Her türün en az bir küratörlü istasyonu var
    expect(genres.filter((g) => g._count.stations === 0).map((g) => g.slug)).toEqual([]);

    expect(await ctx.prisma.station.count()).toBe(STATIONS.length);
    expect(STATIONS.every((s) => s.url.startsWith('https://'))).toBe(true);

    const tags = await ctx.prisma.tagGenreMap.findMany({ include: { genre: { select: { slug: true } } } });
    expect(tags).toHaveLength(Object.values(TAGS).flat().length);
    expect(tags.every((t) => t.tag === normalize(t.tag))).toBe(true);
    const afro = tags.filter((t) => t.tag === 'afro house').map((t) => [t.genre.slug, t.weight]);
    expect(afro).toEqual(expect.arrayContaining([['deep-house', 0.7], ['techno', 0.3]]));
    // Bölünen etiketlerin ağırlıkları 1'e tamamlanır
    for (const [tag, targets] of Object.entries(TAGS)) {
      expect([tag, targets.reduce((sum, [, w]) => sum + w, 0)]).toEqual([tag, expect.closeTo(1, 5)]);
    }
  });

  it('demo seed temel verinin üstüne kurulur ve her etkinlik geçerli türe/mekâna bağlanır', async () => {
    const genreId = await seedBase(ctx.prisma);
    await seedDemo(ctx.prisma, genreId);
    const events = await ctx.prisma.event.findMany({ include: { genres: true, artists: true } });
    expect(events.length).toBeGreaterThan(20);
    expect(events.every((e) => e.source === 'DEMO' && e.genres.length > 0 && e.artists.length > 0 && e.fanoutAt)).toBe(true);
    expect(events.filter((e) => e.priceFrom === 0).every((e) => e.isFree)).toBe(true);
  });

  it('veritabanı playce_norm() ile uygulama normalize() aynı sonucu verir', async () => {
    const samples = ['Dedublüman', 'MOR VE ÖTESİ', 'İlhan Erşahin', 'IŞIK', 'Âşık Veysel', 'Beyoncé', 'Sigur Rós', 'MØ', 'Straße', 'Łódź', 'Tefo & Seza', 'R&B', '  çok   boşluk  '];
    const rows = await ctx.prisma.$queryRaw<{ v: string }[]>`SELECT playce_norm(x) AS v FROM unnest(${samples}::text[]) WITH ORDINALITY AS t(x, i) ORDER BY i`;
    expect(rows.map((r) => r.v)).toEqual(samples.map(normalize));
  });
});
