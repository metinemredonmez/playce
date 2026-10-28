import { createTestApp, loginAs, resetDb, seedBasics, TestContext } from './utils';

type Item = { slug: string };

describe('admin etkinlik listesi ve formu', () => {
  let ctx: TestContext;
  let seed: Awaited<ReturnType<typeof seedBasics>>;
  let editor: { id: string; auth: { Authorization: string } };
  const HOUR = 60 * 60 * 1000;
  const list = async (query: Record<string, string | number> = {}) =>
    (await ctx.http().get('/v1/admin/events').query(query).set(editor.auth).expect(200)).body as {
      items: (Item & { saves: number; genres: { slug: string }[] })[];
      nextCursor: string | null;
      counts: Record<string, number>;
    };
  const slugs = async (query: Record<string, string | number> = {}) => (await list(query)).items.map((e) => e.slug);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    seed = await seedBasics(ctx.prisma);
    editor = await loginAs(ctx, 'editor@ornek.com', 'EDITOR');
    // Başka mekânda, kapaklı ve bilet linkli taslak (türsüz, içe aktarma kaynaklı)
    const babylon = await ctx.prisma.venue.create({ data: { slug: 'babylon', name: 'Babylon Bomonti', district: 'Şişli' } });
    await ctx.prisma.event.create({
      data: {
        slug: 'taslak-gece',
        title: 'Taslak Gece',
        startsAt: new Date(Date.now() + 30 * HOUR),
        venueId: babylon.id,
        status: 'DRAFT',
        source: 'IMPORT',
        coverUrl: 'https://img.example.com/a.jpg',
        ticketUrl: 'https://www.biletix.com/etkinlik/X',
      },
    });
  });

  it('tarih, arama, tür, mekân, kaynak ve eksik alan süzgeçleri; durum sayıları', async () => {
    expect(await slugs({ when: 'upcoming' })).toEqual(['duman-blind', 'taslak-gece', 'manga-blind']);
    expect(await slugs({ when: 'week' })).toEqual(['duman-blind', 'taslak-gece', 'manga-blind']);
    expect(await slugs({ when: 'past' })).toEqual(['eski-konser']);
    expect(await slugs()).toEqual(['eski-konser', 'duman-blind', 'taslak-gece', 'manga-blind']);

    expect(await slugs({ q: 'DUMAN' })).toEqual(['duman-blind']);
    expect(await slugs({ q: 'bomonti', when: 'upcoming' })).toEqual(['taslak-gece']); // mekân adıyla
    expect(await slugs({ genre: 'rock', when: 'upcoming' })).toEqual(['duman-blind', 'manga-blind']);
    expect(await slugs({ venue: 'babylon' })).toEqual(['taslak-gece']);
    expect(await slugs({ source: 'IMPORT' })).toEqual(['taslak-gece']);
    expect(await slugs({ missing: 'cover', when: 'upcoming' })).toEqual(['duman-blind', 'manga-blind']);
    expect(await slugs({ missing: 'ticket', when: 'upcoming' })).toEqual(['duman-blind', 'manga-blind']);

    // Sayılar durum dışındaki süzgeçlere göre: sekme rozetleri
    const page = await list({ when: 'upcoming', status: 'DRAFT' });
    expect(page.items.map((e) => e.slug)).toEqual(['taslak-gece']);
    expect(page.counts).toEqual({ PUBLISHED: 2, DRAFT: 1 });
    expect(page.items[0]).toMatchObject({ saves: 0, genres: [], venue: { slug: 'babylon', name: 'Babylon Bomonti' } });

    await ctx.http().get('/v1/admin/events').query({ when: 'yarin' }).set(editor.auth).expect(400);
    await ctx.http().get('/v1/admin/events').query({ missing: 'kapak' }).set(editor.auth).expect(400);
  });

  it('cursor ile sayfalama (bitmişler yeniden eskiye)', async () => {
    const first = await list({ limit: 2 });
    expect(first.items.map((e) => e.slug)).toEqual(['eski-konser', 'duman-blind']);
    const second = await list({ limit: 2, cursor: first.nextCursor! });
    expect(second.items.map((e) => e.slug)).toEqual(['taslak-gece', 'manga-blind']);
    expect(second.nextCursor).toBeNull();

    const older = new Date(Date.now() - 96 * HOUR);
    await ctx.prisma.event.create({ data: { slug: 'daha-eski', title: 'Daha Eski', startsAt: older, venueId: seed.venue.id } });
    expect(await slugs({ when: 'past' })).toEqual(['eski-konser', 'daha-eski']);
  });

  it('tek etkinlik: lineup sırası, türler, kaydetme sayısı, bayraklar', async () => {
    await ctx.http().patch('/v1/admin/events/duman-blind').set(editor.auth).send({ artistSlugs: ['manga', 'duman'], description: 'Happy hour 22:00' }).expect(200);
    await ctx.prisma.savedEvent.create({ data: { userId: editor.id, eventId: seed.events.soon.id } });

    const e = (await ctx.http().get('/v1/admin/events/duman-blind').set(editor.auth).expect(200)).body;
    expect(e).toMatchObject({
      slug: 'duman-blind',
      status: 'REVIEW', // işaretli metin yayından incelemeye düştü
      source: 'ADMIN',
      venue: { slug: 'blind', name: 'Blind', district: 'Beyoğlu', ageLimit: null },
      genres: [{ slug: 'rock', name: 'Rock' }],
      artists: [{ slug: 'manga' }, { slug: 'duman' }],
      saves: 1,
      refs: [],
      flags: ['happy hour'],
    });
    expect(e.searchText).toBeUndefined();
    await ctx.http().get('/v1/admin/events/yok').set(editor.auth).expect(404);
  });

  it('kaydetmeden önce kontrol: alkol bayrağı ve olası kopya (kendisi hariç)', async () => {
    const startsAt = new Date(seed.events.soon.startsAt.getTime() + HOUR).toISOString();
    const check = (body: Record<string, unknown>) => ctx.http().post('/v1/admin/events/check').set(editor.auth).send(body).expect(200);

    const dup = (await check({ title: 'Duman Blind Konseri', venueSlug: 'blind', startsAt, description: 'Tuborg sunar' })).body;
    expect(dup.flags).toEqual(['alkol markası']);
    expect(dup.duplicates).toEqual([expect.objectContaining({ slug: 'duman-blind', status: 'PUBLISHED', source: 'ADMIN' })]);
    expect(dup.duplicates[0].id).toBeUndefined();

    expect((await check({ title: 'duman-blind', venueSlug: 'blind', startsAt, exclude: 'duman-blind' })).body.duplicates).toEqual([]);
    expect((await check({ title: 'Başka Gece', venueSlug: 'blind', startsAt })).body).toEqual({ flags: [], duplicates: [] });
    expect((await check({ title: 'Duman', venueSlug: 'yok-boyle', startsAt })).body.duplicates).toEqual([]);
    // Kontrol yazmaz: denetim kaydına düşmez
    expect(await ctx.prisma.auditLog.count()).toBe(0);
  });

  it('saat kuralları: bitiş > başlangıç, kapı ≤ başlangıç, bitmiş etkinlik yayınlanamaz', async () => {
    const base = { title: 'Saat Testi', slug: 'saat-testi', venueSlug: 'blind', startsAt: '2030-03-01T21:00:00+03:00' };
    const post = (body: Record<string, unknown>) => ctx.http().post('/v1/admin/events').set(editor.auth).send(body);

    expect((await post({ ...base, endsAt: '2030-03-01T20:00:00+03:00' }).expect(400)).body.message).toBe('Bitiş, başlangıçtan sonra olmalı');
    expect((await post({ ...base, doorsAt: '2030-03-01T22:00:00+03:00' }).expect(400)).body.message).toBe('Kapı açılışı başlangıçtan sonra olamaz');
    expect((await post({ ...base, startsAt: '2020-03-01T21:00:00+03:00' }).expect(400)).body.message).toBe('Bitmiş etkinlik yayınlanamaz');
    await post({ ...base, slug: 'eski-taslak', startsAt: '2020-03-01T21:00:00+03:00', status: 'DRAFT' }).expect(201);
    await ctx.http().patch('/v1/admin/events/eski-taslak').set(editor.auth).send({ status: 'PUBLISHED' }).expect(400);

    await post({ ...base, doorsAt: '2030-03-01T20:00:00+03:00', endsAt: '2030-03-02T02:00:00+03:00' }).expect(201);
    const patch = (body: Record<string, unknown>) => ctx.http().patch('/v1/admin/events/saat-testi').set(editor.auth).send(body);
    await patch({ endsAt: '2030-03-01T20:30:00+03:00' }).expect(400);
    await patch({ startsAt: '2030-03-01T19:00:00+03:00' }).expect(400); // kapı 20:00 > başlangıç
    await patch({ endsAt: null }).expect(200);

    // Yayındaki bitmiş etkinlikte saat dışı alan güncellemesi serbest
    await ctx.http().patch('/v1/admin/events/eski-konser').set(editor.auth).send({ priceFrom: 10_000 }).expect(200);
  });

  it('mekân ve sanatçı seçicisi: Türkçe karakter ve yazım hatası duyarsız', async () => {
    const venues = (await ctx.http().get('/v1/admin/lookup/venues').query({ q: 'BLİND' }).set(editor.auth).expect(200)).body;
    expect(venues).toEqual([{ slug: 'blind', name: 'Blind', district: 'Beyoğlu', ageLimit: null }]);
    const artists = (await ctx.http().get('/v1/admin/lookup/artists').query({ q: 'dumn' }).set(editor.auth).expect(200)).body;
    expect(artists.map((a: Item) => a.slug)).toEqual(['duman']);
    await ctx.http().get('/v1/admin/lookup/artists').query({ q: 'd' }).set(editor.auth).expect(400);

    const user = await loginAs(ctx, 'kullanici@ornek.com', 'USER');
    await ctx.http().get('/v1/admin/lookup/venues').query({ q: 'blind' }).set(user.auth).expect(403);
  });
});
