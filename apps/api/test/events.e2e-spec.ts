import { FanoutService } from '../src/notifications/fanout.service';
import { windowFor } from '../src/common/time';
import { ADMIN_KEY, bearer, createTestApp, login, resetDb, seedBasics, TestContext } from './utils';

const HOUR = 60 * 60 * 1000;
type Card = { slug: string; startsAt: string; distanceKm?: number | null };
const slugs = (body: { items: Card[] }) => body.items.map((e) => e.slug);

describe('etkinlikler', () => {
  let ctx: TestContext;
  let seed: Awaited<ReturnType<typeof seedBasics>>;
  let kadikoy: { id: string };
  const admin = { 'X-Admin-Key': ADMIN_KEY };
  const list = (query: Record<string, string | number | boolean>) => ctx.http().get('/v1/events').query(query);

  const mk = (slug: string, startsAt: Date, data: { venueId?: string; priceFrom?: number; isFree?: boolean } = {}) =>
    ctx.prisma.event.create({
      data: { slug, title: slug, startsAt, venueId: data.venueId ?? seed.venue.id, priceFrom: data.priceFrom, isFree: data.isFree, fanoutAt: new Date() },
    });
  const inH = (h: number) => new Date(Date.now() + h * HOUR);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    seed = await seedBasics(ctx.prisma);
    // Blind (Beyoğlu) ve ~6,7 km ötede Arkaoda (Kadıköy)
    await ctx.prisma.venue.update({ where: { id: seed.venue.id }, data: { lat: 41.0316, lng: 28.9752 } });
    kadikoy = await ctx.prisma.venue.create({ data: { slug: 'arkaoda', name: 'Arkaoda', district: 'Kadıköy', lat: 40.9878, lng: 29.0284 } });
  });

  it('cursor sayfalama: başlangıca göre sıralı, kopya ve atlama yok', async () => {
    for (let i = 1; i <= 5; i++) await mk(`ek-${i}`, inH(10 * i));
    const all = slugs((await list({ limit: 100 }).expect(200)).body);
    expect(all).toEqual(['duman-blind', 'ek-1', 'ek-2', 'ek-3', 'ek-4', 'ek-5', 'manga-blind']);

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const body: { items: Card[]; nextCursor: string | null } = (await list({ limit: 3, ...(cursor ? { cursor } : {}) }).expect(200)).body;
      seen.push(...slugs(body));
      cursor = body.nextCursor;
      pages++;
    } while (cursor);
    expect(seen).toEqual(all);
    expect(pages).toBe(3);
  });

  it('semt filtresi slug ya da adla; semt listesi', async () => {
    await mk('kadikoy-gecesi', inH(5), { venueId: kadikoy.id });
    expect(slugs((await list({ district: 'kadikoy' })).body)).toEqual(['kadikoy-gecesi']);
    expect(slugs((await list({ district: 'Kadıköy' })).body)).toEqual(['kadikoy-gecesi']);
    expect(slugs((await list({ district: 'beyoglu' })).body)).toEqual(['duman-blind', 'manga-blind']);
    expect(slugs((await list({ district: 'yok' })).body)).toEqual([]);

    const districts = (await ctx.http().get('/v1/districts').expect(200)).body;
    expect(districts).toEqual([
      { slug: 'beyoglu', name: 'Beyoğlu', venues: 1 },
      { slug: 'kadikoy', name: 'Kadıköy', venues: 1 },
    ]);
  });

  it('ücretsiz ve fiyat üst sınırı (kuruş); fiyatı bilinmeyen sınırda elenir', async () => {
    await mk('bedava', inH(3), { priceFrom: 0, isFree: true });
    await mk('ucuz', inH(4), { priceFrom: 30_000 });
    await mk('pahali', inH(5), { priceFrom: 90_000 });
    expect(slugs((await list({ free: true })).body)).toEqual(['bedava']);
    expect(slugs((await list({ free: 1 })).body)).toEqual(['bedava']);
    expect(slugs((await list({ priceMax: 50_000 })).body)).toEqual(['bedava', 'ucuz']);
  });

  it('konuma göre: yarıçap, mesafe ve en yakın önce; konumlu listede de cursor çalışır', async () => {
    await mk('kadikoy-gecesi', inH(1), { venueId: kadikoy.id });
    const nardis = '41.0256,28.9739';

    const close = (await list({ near: nardis, radiusKm: 2 }).expect(200)).body;
    expect(slugs(close)).toEqual(['duman-blind', 'manga-blind']);
    expect(close.items[0].distanceKm).toBeCloseTo(0.7, 1);

    const wide = (await list({ near: nardis, radiusKm: 10 })).body;
    expect(slugs(wide)).toEqual(['duman-blind', 'manga-blind', 'kadikoy-gecesi']); // en yakın önce
    expect(wide.items[2].distanceKm).toBeGreaterThan(5);
    expect(slugs((await list({ near: nardis, radiusKm: 10, sort: 'soonest' })).body)).toEqual(['kadikoy-gecesi', 'duman-blind', 'manga-blind']);

    const p1 = (await list({ near: nardis, radiusKm: 10, limit: 2 })).body;
    expect(slugs(p1)).toEqual(['duman-blind', 'manga-blind']);
    const p2 = (await list({ near: nardis, radiusKm: 10, limit: 2, cursor: p1.nextCursor })).body;
    expect(p2).toMatchObject({ nextCursor: null });
    expect(slugs(p2)).toEqual(['kadikoy-gecesi']);
  });

  it('zaman penceresi: yarın ve tarih aralığı (İstanbul günü)', async () => {
    const tomorrowEvening = new Date(windowFor('tomorrow').from.getTime() + 15 * HOUR); // yarın 21:00
    await mk('yarin', tomorrowEvening);
    expect(slugs((await list({ when: 'tomorrow' })).body)).toContain('yarin');
    expect(slugs((await list({ when: 'tonight' })).body)).not.toContain('yarin');

    await mk('pi-gunu', new Date('2031-03-14T21:00:00+03:00'));
    await mk('ertesi-gun', new Date('2031-03-15T01:00:00+03:00'));
    expect(slugs((await list({ from: '2031-03-14', to: '2031-03-15' })).body)).toEqual(['pi-gunu']);
    expect(slugs((await list({ from: '2031-03-14' })).body)).toEqual(['pi-gunu', 'ertesi-gun']);
  });

  it('REVIEW: listede ve detayda yok, takipçilere duyurulmaz; yayınlanınca görünür', async () => {
    const fan = await login(ctx, 'hayran@ornek.com');
    await ctx.http().patch('/v1/me/notification-prefs').set(bearer(fan.accessToken)).send({ quietStart: 0, quietEnd: 0 }).expect(200);
    await ctx.http().put('/v1/me/follows/artists/duman').set(bearer(fan.accessToken)).expect(200);
    await ctx
      .http()
      .post('/v1/admin/events')
      .set(admin)
      .send({ title: 'Duman Sürpriz', slug: 'duman-surpriz', startsAt: inH(30).toISOString(), venueSlug: 'blind', artistSlugs: ['duman'], status: 'REVIEW' })
      .expect(201);

    expect(slugs((await list({ artist: 'duman' })).body)).toEqual(['duman-blind']);
    await ctx.http().get('/v1/events/duman-surpriz').expect(404);
    await ctx.http().get('/v1/events/duman-surpriz/ics').expect(404);
    const fanout = ctx.get(FanoutService);
    expect((await fanout.eventFanout()).notifications).toBe(0);

    await ctx.http().patch('/v1/admin/events/duman-surpriz').set(admin).send({ status: 'PUBLISHED' }).expect(200);
    expect(slugs((await list({ artist: 'duman' })).body)).toEqual(['duman-blind', 'duman-surpriz']);
    expect((await fanout.eventFanout()).notifications).toBe(1);
  });

  it('admin: ücretsiz bayrağı fiyattan, bilet satıcısı linkten türetilir', async () => {
    const doorsAt = '2030-05-01T20:00:00.000Z';
    await ctx
      .http()
      .post('/v1/admin/events')
      .set(admin)
      .send({ title: 'Açık Sahne', slug: 'acik-sahne', startsAt: '2030-05-01T21:00:00+03:00', doorsAt, venueSlug: 'blind', priceFrom: 0, ageLimit: 18, ticketUrl: 'https://www.biletix.com/etkinlik/ABC123' })
      .expect(201);
    const detail = (await ctx.http().get('/v1/events/acik-sahne').expect(200)).body;
    expect(detail).toMatchObject({ isFree: true, ageLimit: 18, doorsAt, ticketProvider: 'BILETIX', status: 'PUBLISHED' });

    await ctx.http().patch('/v1/admin/events/acik-sahne').set(admin).send({ priceFrom: 45_000, ticketUrl: 'https://passo.com.tr/tr/etkinlik/1' }).expect(200);
    expect((await ctx.http().get('/v1/events/acik-sahne')).body).toMatchObject({ isFree: false, ticketProvider: 'PASSO' });
    await ctx.http().patch('/v1/admin/events/acik-sahne').set(admin).send({ ticketUrl: 'https://mekan.example.com/bilet', ticketProvider: 'BUBILET' }).expect(200);
    expect((await ctx.http().get('/v1/events/acik-sahne')).body.ticketProvider).toBe('BUBILET');
    await ctx.http().patch('/v1/admin/events/acik-sahne').set(admin).send({ ticketUrl: 'https://mekan.example.com/bilet' }).expect(200);
    expect((await ctx.http().get('/v1/events/acik-sahne')).body.ticketProvider).toBeNull();
  });

  it('takvime ekle (.ics): RFC 5545 kaçış ve 75 bayt satır katlama', async () => {
    await ctx.prisma.event.create({
      data: {
        slug: 'ozel-gece',
        title: 'Duman, Akustik; Özel',
        description: 'Şarkılar, sürprizler ve uzun bir gece. '.repeat(4).trim(),
        startsAt: new Date('2030-11-01T21:00:00+03:00'),
        ticketUrl: 'https://www.biletix.com/etkinlik/XYZ',
        venueId: seed.venue.id,
      },
    });
    const res = await ctx.http().get('/v1/events/ozel-gece/ics').expect(200);
    expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="ozel-gece.ics"');

    const raw: string = res.text;
    expect(raw.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    const lines = raw.replace(/\r\n /g, '').split('\r\n'); // katlamayı aç
    expect(lines).toEqual(
      expect.arrayContaining([
        'BEGIN:VCALENDAR',
        'SUMMARY:Duman\\, Akustik\\; Özel',
        'DTSTART:20301101T180000Z',
        'DTEND:20301101T230000Z', // bitiş yok → 5 saat
        'LOCATION:Blind\\, Beyoğlu',
        'GEO:41.0316;28.9752',
        'URL:https://www.biletix.com/etkinlik/XYZ',
        'STATUS:CONFIRMED',
      ]),
    );
    expect(lines.find((l) => l.startsWith('DESCRIPTION:'))).toContain('\\n\\nBilet: https://www.biletix.com/etkinlik/XYZ');

    await ctx.prisma.event.update({ where: { slug: 'ozel-gece' }, data: { status: 'CANCELLED' } });
    expect((await ctx.http().get('/v1/events/ozel-gece/ics')).text).toContain('STATUS:CANCELLED');
  });

  it('geçersiz filtreler 400', async () => {
    await list({ when: 'yarin' }).expect(400);
    await list({ sort: 'nearest' }).expect(400);
    await list({ near: 'abc' }).expect(400);
    await list({ near: '95,10' }).expect(400);
    await list({ priceMax: -1 }).expect(400);
    await list({ limit: 0 }).expect(400);
    await list({ bilinmeyen: 1 }).expect(400);
  });
});
