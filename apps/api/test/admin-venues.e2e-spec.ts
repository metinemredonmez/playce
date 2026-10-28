import { createTestApp, loginAs, resetDb, seedBasics, TestContext } from './utils';

type Item = { slug: string };

describe('admin mekân listesi ve formu', () => {
  let ctx: TestContext;
  let seed: Awaited<ReturnType<typeof seedBasics>>;
  let editor: { id: string; auth: { Authorization: string } };
  const BABYLON = { lat: 41.0573, lng: 28.9789 };
  const list = async (query: Record<string, string | number> = {}) =>
    (await ctx.http().get('/v1/admin/venues').query(query).set(editor.auth).expect(200)).body as {
      items: (Item & Record<string, unknown>)[];
      nextCursor: string | null;
      total: number;
      missing: { location: number; hours: number; cover: number };
    };
  const slugs = async (query: Record<string, string | number> = {}) => (await list(query)).items.map((v) => v.slug);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    seed = await seedBasics(ctx.prisma);
    editor = await loginAs(ctx, 'editor@ornek.com', 'EDITOR');
    // Konumlu, saatli, kapaklı ikinci mekân (türsüz, içe aktarma kaynaklı, etkinliksiz)
    await ctx.prisma.venue.create({
      data: {
        slug: 'babylon',
        name: 'Babylon Bomonti',
        district: 'Şişli',
        ...BABYLON,
        coverUrl: 'https://img.example.com/b.jpg',
        source: 'IMPORT',
        hours: { create: [{ weekday: 5, opensAt: '21:00', closesAt: '03:00' }] },
      },
    });
  });

  it('süzgeçler, sayılar ve eksik alan iş kuyruğu', async () => {
    await ctx.prisma.venueFollow.create({ data: { userId: editor.id, venueId: seed.venue.id } });
    const page = await list();
    expect(page.items.map((v) => v.slug)).toEqual(['babylon', 'blind']);
    expect(page.total).toBe(2);
    expect(page.missing).toEqual({ location: 1, hours: 1, cover: 1 });
    expect(page.items[1]).toMatchObject({
      slug: 'blind',
      hasLocation: false,
      hasHours: false,
      openNow: null,
      upcomingEvents: 2, // bitmiş "eski-konser" sayılmaz
      followers: 1,
      genres: [{ slug: 'rock' }],
      flags: [],
    });
    expect(page.items[0]).toMatchObject({ hasLocation: true, hasHours: true, source: 'IMPORT' });
    expect(page.items[0].lat).toBeUndefined();

    expect(await slugs({ q: 'BOMONTİ' })).toEqual(['babylon']);
    expect(await slugs({ q: 'beyoglu' })).toEqual(['blind']); // semtle
    expect(await slugs({ district: 'sisli' })).toEqual(['babylon']);
    expect(await slugs({ genre: 'rock' })).toEqual(['blind']);
    expect(await slugs({ source: 'IMPORT' })).toEqual(['babylon']);
    expect(await slugs({ missing: 'location' })).toEqual(['blind']);
    expect(await slugs({ missing: 'hours' })).toEqual(['blind']);

    const first = await list({ limit: 1 });
    expect((await list({ limit: 1, cursor: first.nextCursor! })).items.map((v) => v.slug)).toEqual(['blind']);
    await ctx.http().get('/v1/admin/venues').query({ missing: 'telefon' }).set(editor.auth).expect(400);
  });

  it('tek mekân: saatler, iletişim alanları ve "mekânın sesi" seçimi', async () => {
    const deep = await ctx.prisma.genre.create({ data: { slug: 'deep-house', name: 'Deep House', color: '#00f', radioTag: 'deep house' } });
    await ctx.prisma.station.create({ data: { slug: 'deep-fm', name: 'Deep FM', streamUrl: 'https://stream.example.com/deep', genreId: deep.id } });

    const before = (await ctx.http().get('/v1/admin/venues/blind').set(editor.auth).expect(200)).body;
    expect(before).toMatchObject({ slug: 'blind', hours: [], openNow: null, soundStation: null, defaultSound: { slug: 'rock-fm' }, upcomingEvents: 2, refs: [] });
    expect(before.searchText).toBeUndefined();

    const patch = (body: Record<string, unknown>) => ctx.http().patch('/v1/admin/venues/blind').set(editor.auth).send(body);
    await patch({ website: 'web-sitesi-degil' }).expect(400);
    await patch({ soundStationSlug: 'yok-fm' }).expect(400);
    await patch({ phone: '+90 212 000 00 00', website: 'https://blind.example.com', reservationUrl: 'https://blind.example.com/rez', capacity: 400, soundStationSlug: 'deep-fm' }).expect(200);

    const after = (await ctx.http().get('/v1/admin/venues/blind').set(editor.auth).expect(200)).body;
    expect(after).toMatchObject({ phone: '+90 212 000 00 00', capacity: 400, soundStation: { slug: 'deep-fm', name: 'Deep FM', status: 'OK' } });
    // Uygulama: elle seçilen istasyon çalar
    const pub = (await ctx.http().get('/v1/venues/blind').expect(200)).body;
    expect(pub.sound).toMatchObject({ name: 'Deep FM', genre: 'deep-house' });
    expect(pub.reservationUrl).toBe('https://blind.example.com/rez');
    expect(pub.soundStationId).toBeUndefined();

    // Seçili istasyon çökerse varsayılana döner; null seçimi kaldırır
    await ctx.prisma.station.update({ where: { slug: 'deep-fm' }, data: { status: 'DOWN' } });
    expect((await ctx.http().get('/v1/venues/blind')).body.sound).toMatchObject({ name: 'Rock FM', genre: 'rock' });
    await patch({ soundStationSlug: null }).expect(200);
    expect((await ctx.http().get('/v1/admin/venues/blind').set(editor.auth)).body.soundStation).toBeNull();
    await ctx.http().get('/v1/admin/venues/yok').set(editor.auth).expect(404);
  });

  it('kaydetmeden önce kontrol: alkol bayrağı, aynı ad, ~100 m', async () => {
    const check = async (body: Record<string, unknown>) =>
      (await ctx.http().post('/v1/admin/venues/check').set(editor.auth).send(body).expect(200)).body;

    expect(await check({ name: 'BLİND', dressCode: 'Happy hour 18–20' })).toEqual({
      flags: ['happy hour'],
      duplicates: [{ slug: 'blind', name: 'Blind', district: 'Beyoğlu', reason: 'name', meters: null }],
    });
    const near = await check({ name: 'Bomonti Sahne', lat: BABYLON.lat + 0.0004, lng: BABYLON.lng });
    expect(near.duplicates).toEqual([expect.objectContaining({ slug: 'babylon', reason: 'near' })]);
    expect(near.duplicates[0].meters).toBeGreaterThan(30);
    expect(near.duplicates[0].meters).toBeLessThan(60);
    expect((await check({ name: 'Bomonti Sahne', lat: BABYLON.lat + 0.01, lng: BABYLON.lng })).duplicates).toEqual([]);
    expect((await check({ name: 'Blind', exclude: 'blind' })).duplicates).toEqual([]);
    expect(await ctx.prisma.auditLog.count()).toBe(0);
  });

  it('etkinliği olan mekân silinmez', async () => {
    const res = await ctx.http().delete('/v1/admin/venues/blind').set(editor.auth).expect(400);
    expect(res.body.message).toBe('Mekânın 3 etkinliği var: önce etkinlikleri sil ya da başka mekâna taşı');
    await ctx.http().delete('/v1/admin/venues/babylon').set(editor.auth).expect(200);
    await ctx.http().delete('/v1/admin/venues/babylon').set(editor.auth).expect(404);
  });
});
