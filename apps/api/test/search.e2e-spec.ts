import { createTestApp, resetDb, seedBasics, TestContext } from './utils';

type Named = { name?: string; title?: string; slug: string };
const names = (rows: Named[]) => rows.map((r) => r.name ?? r.title);

describe('arama', () => {
  let ctx: TestContext;
  let seed: Awaited<ReturnType<typeof seedBasics>>;
  const search = (q: string) => ctx.http().get('/v1/search').query({ q });

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    seed = await seedBasics(ctx.prisma);
    await ctx.prisma.artist.createMany({
      data: [
        { slug: 'dedubluman', name: 'Dedublüman' },
        { slug: 'mor-ve-otesi', name: 'Mor ve Ötesi', aliases: ['MVÖ'] },
        { slug: 'norah-jones', name: 'Norah Jones' },
      ],
    });
    await ctx.prisma.venue.create({ data: { slug: 'arkaoda', name: 'Arkaoda', district: 'Kadıköy' } });
    await ctx.prisma.station.create({
      data: { slug: 'joy-turk', name: 'Joy Türk', streamUrl: 'https://stream.example.com/joy', genreId: seed.rock.id },
    });
  });

  it('Türkçe karakter ve büyük/küçük harf duyarsız', async () => {
    expect(names((await search('dedubluman').expect(200)).body.artists)).toEqual(['Dedublüman']);
    expect(names((await search('DEDUBLÜMAN').expect(200)).body.artists)).toEqual(['Dedublüman']);
    expect(names((await search('mor ve otesi')).body.artists)).toEqual(['Mor ve Ötesi']);
    expect(names((await search('mvo')).body.artists)).toEqual(['Mor ve Ötesi']); // alias
    expect(names((await search('kadikoy')).body.venues)).toEqual(['Arkaoda']); // semt
    expect(names((await search('türk')).body.stations)).toEqual(['Joy Türk']); // kelime öneki
  });

  it('küçük yazım hatalarını tolere eder; kısa sorguda yalnız önek', async () => {
    expect(names((await search('dedublman')).body.artists)).toEqual(['Dedublüman']);
    expect(names((await search('mor otesi')).body.artists)).toEqual(['Mor ve Ötesi']);
    const joy = (await search('joy')).body;
    expect(names(joy.stations)).toEqual(['Joy Türk']);
    expect(joy.artists).toEqual([]); // "Norah Jones" bulanık eşleşmeyle gelmez
  });

  it('etkinlik: başlığı ya da lineup sanatçısı eşleşen, yalnız yayında ve bitmemiş olanlar', async () => {
    await ctx.prisma.event.create({
      data: { slug: 'duman-taslak', title: 'Duman Gizli Konser', startsAt: new Date(Date.now() + 86_400_000), venueId: seed.venue.id, status: 'REVIEW' },
    });
    const body = (await search('duman')).body;
    expect(names(body.artists)).toEqual(['Duman', 'Dedublüman']); // önek eşleşmesi önce, sonra benzerlik
    // eski-konser bitti, duman-taslak moderasyonda
    expect(body.events.map((e: Named) => e.slug)).toEqual(['duman-blind']);
    expect(body.events[0]).toMatchObject({ venue: { slug: 'blind' }, artists: [{ slug: 'duman', name: 'Duman' }] });
  });

  it('DOWN istasyon aramada çıkmaz; NO_METADATA çıkar ama "şu an çalan" yok', async () => {
    await ctx.prisma.station.update({ where: { slug: 'rock-fm' }, data: { status: 'NO_METADATA' } });
    await ctx.prisma.station.update({ where: { slug: 'joy-turk' }, data: { status: 'DOWN' } });
    expect((await search('joy')).body.stations).toEqual([]);
    expect((await search('rock fm')).body.stations).toEqual([
      expect.objectContaining({ slug: 'rock-fm', hasMetadata: false, genre: { slug: 'rock', name: 'Rock', color: '#f00' } }),
    ]);
  });

  it('arama metnini tetikleyici güncel tutar (admin alias ekleyince bulunur)', async () => {
    expect((await search('teoman')).body.artists).toEqual([]);
    await ctx.http().patch('/v1/admin/artists/manga').set('X-Admin-Key', process.env.ADMIN_KEY!).send({ aliases: ['Teoman Manga'] }).expect(200);
    expect(names((await search('teoman')).body.artists)).toEqual(['maNga']);
  });

  it('en az 2 karakter ister', async () => {
    await search('a').expect(400);
    await ctx.http().get('/v1/search').expect(400);
  });
});
