import { alcoholFlags } from '../src/moderation/alcohol';
import { createTestApp, loginAs, resetDb, seedBasics, TestContext } from './utils';

describe('alkol mevzuatı denetimi (ADR-015)', () => {
  it('promosyon, marka ve içki temalı geceyi yakalar; tür bilgisi ve masum metin serbest', () => {
    const flagged: [string, string][] = [
      ['Happy Hour 20:00–22:00', 'happy hour'],
      ['Kapıda 1 alana 1 bira', 'X alana Y'],
      ['Sınırsız içki ile kapanış partisi', 'sınırsız içki'],
      ['İlk 100 kişiye shot hediye', 'bedava içki'],
      ['İlk birası bizden ikram', 'bedava içki'],
      ['Şarabı indirimli', 'içki kampanyası'],
      ['Tuborg sunar: Yaz Gecesi', 'alkol markası'],
      ['Hoş geldin kokteyli', 'hoş geldin içkisi'],
      ['Open bar 22:00’ye kadar', 'açık bar'],
      ['Rakı balık gecesi', 'içki temalı gece'],
    ];
    for (const [text, label] of flagged) expect([text, alcoholFlags(text)]).toEqual([text, [label]]);

    const clean = ['Kokteyl bar, canlı caz', 'Babylon Bomonti konseri', 'Efes Antik Kenti’nde konser', 'Mac Miller tribute', 'Ücretsiz giriş', 'Erken bilet indirimi kampanyası', 'Kokteyl bar, ücretsiz giriş'];
    for (const text of clean) expect([text, alcoholFlags(text)]).toEqual([text, []]);
  });
});

describe('admin moderasyon akışı', () => {
  let ctx: TestContext;
  let editor: { id: string; auth: { Authorization: string } };
  let moderator: { id: string; auth: { Authorization: string } };
  const event = (extra: Record<string, unknown> = {}) => ({
    title: 'Yaz Partisi',
    slug: 'yaz-partisi',
    startsAt: '2030-07-01T22:00:00+03:00',
    venueSlug: 'blind',
    description: 'Gece boyu house. Happy hour 22:00–23:00!',
    ...extra,
  });
  const publicSlugs = async () => (await ctx.http().get('/v1/events').query({ limit: 100 })).body.items.map((e: { slug: string }) => e.slug);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedBasics(ctx.prisma);
    editor = await loginAs(ctx, 'editor@ornek.com', 'EDITOR');
    moderator = await loginAs(ctx, 'moderator@ornek.com', 'MODERATOR');
  });

  it('işaretli etkinlik yayına çıkmaz, REVIEW kuyruğunda bekler; metin düzelince yayınlanır', async () => {
    const created = await ctx.http().post('/v1/admin/events').set(editor.auth).send(event()).expect(201);
    expect(created.body).toMatchObject({ status: 'REVIEW', moderation: { flags: ['happy hour'], held: true } });
    expect(await publicSlugs()).not.toContain('yaz-partisi');

    // Metin aynıyken yayına almak yine REVIEW'da bırakır
    const retry = await ctx.http().patch('/v1/admin/events/yaz-partisi').set(editor.auth).send({ status: 'PUBLISHED' }).expect(200);
    expect(retry.body).toMatchObject({ status: 'REVIEW', moderation: { held: true } });

    const queue = (await ctx.http().get('/v1/admin/events').query({ status: 'REVIEW' }).set(editor.auth).expect(200)).body;
    expect(queue.items).toEqual([
      expect.objectContaining({ slug: 'yaz-partisi', flags: ['happy hour'], description: event().description, venue: { slug: 'blind', name: 'Blind' } }),
    ]);
    const queues = (await ctx.http().get('/v1/admin/queues').set(editor.auth).expect(200)).body;
    expect(queues).toEqual({ reviewEvents: 1, unmatchedOpen: 0, stationsDown: 0 });

    const fixed = await ctx
      .http()
      .patch('/v1/admin/events/yaz-partisi')
      .set(editor.auth)
      .send({ description: 'Gece boyu house.', status: 'PUBLISHED' })
      .expect(200);
    expect(fixed.body).toMatchObject({ status: 'PUBLISHED', moderation: null });
    expect(await publicSlugs()).toContain('yaz-partisi');
  });

  it('allowFlagged yalnız MODERATOR+; onaylanan içerik sonraki fiyat güncellemesinde geri düşmez', async () => {
    await ctx.http().post('/v1/admin/events').set(editor.auth).send(event({ allowFlagged: true })).expect(403);

    const approved = await ctx.http().post('/v1/admin/events').set(moderator.auth).send(event({ allowFlagged: true })).expect(201);
    expect(approved.body).toMatchObject({ status: 'PUBLISHED', moderation: { flags: ['happy hour'], held: false } });
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({ where: { action: 'event.create' } });
    expect(audit).toMatchObject({ actorId: moderator.id, diff: expect.objectContaining({ allowFlagged: true }) });

    const priced = await ctx.http().patch('/v1/admin/events/yaz-partisi').set(editor.auth).send({ priceFrom: 50_000 }).expect(200);
    expect(priced.body.status).toBe('PUBLISHED');
    // Metne dokunulursa yeniden denetlenir
    const edited = await ctx.http().patch('/v1/admin/events/yaz-partisi').set(editor.auth).send({ title: 'Yaz Partisi 2' }).expect(200);
    expect(edited.body.status).toBe('REVIEW');
  });

  it('taslak işaretli metinle kaydedilir (yayına çıkmadığı için bekletilmez), uyarı döner', async () => {
    const draft = await ctx.http().post('/v1/admin/events').set(editor.auth).send(event({ status: 'DRAFT' })).expect(201);
    expect(draft.body).toMatchObject({ status: 'DRAFT', moderation: { flags: ['happy hour'], held: false } });
  });

  it('mekân metni işaretliyse kaydedilmez; moderatör geçirebilir, metne dokunmayan güncelleme serbest', async () => {
    const venue = { name: 'Gece Bar', district: 'Kadıköy', description: 'Her akşam happy hour', doorPolicy: 'Kimlik zorunlu' };
    const rejected = await ctx.http().post('/v1/admin/venues').set(editor.auth).send(venue).expect(400);
    expect(rejected.body.flags).toEqual(['happy hour']);
    expect(await ctx.prisma.venue.count({ where: { slug: 'gece-bar' } })).toBe(0);

    await ctx.http().post('/v1/admin/venues').set(moderator.auth).send({ ...venue, allowFlagged: true }).expect(201);
    await ctx.http().patch('/v1/admin/venues/gece-bar').set(editor.auth).send({ priceLevel: 2 }).expect(200);
    await ctx.http().patch('/v1/admin/venues/gece-bar').set(editor.auth).send({ dressCode: 'Serbest' }).expect(400);
    await ctx.http().patch('/v1/admin/venues/gece-bar').set(editor.auth).send({ description: 'Canlı müzik', dressCode: 'Serbest' }).expect(200);
  });
});
