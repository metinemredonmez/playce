import { openStatus } from '../src/venues/hours';
import { trWeekdayMinutes } from '../src/common/time';
import { ADMIN_KEY, bearer, createTestApp, login, resetDb, seedBasics, TestContext } from './utils';

const tr = (iso: string) => new Date(`${iso}+03:00`);

describe('çalışma saatleri: şimdi açık mı', () => {
  // 2026-11-06 Cuma, 07 Cumartesi, 09 Pazartesi, 10 Salı
  const club = [{ weekday: 5, opensAt: '23:00', closesAt: '05:00' }]; // yalnız Cuma gecesi
  const bar = [{ weekday: 1, opensAt: '20:00', closesAt: '00:00' }]; // Pazartesi, gece yarısı kapanır

  it('gece yarısını aşan aralık ertesi sabaha taşar', () => {
    expect(openStatus(club, tr('2026-11-06T22:00:00'))).toEqual({ openNow: false, openUntil: null });
    expect(openStatus(club, tr('2026-11-06T23:30:00'))).toEqual({ openNow: true, openUntil: '05:00' });
    expect(openStatus(club, tr('2026-11-07T03:00:00'))).toEqual({ openNow: true, openUntil: '05:00' });
    expect(openStatus(club, tr('2026-11-07T05:00:00'))).toEqual({ openNow: false, openUntil: null });
  });

  it('kapanış 00:00 = gece yarısı; saat yoksa bilinmiyor', () => {
    expect(openStatus(bar, tr('2026-11-09T23:59:00'))).toEqual({ openNow: true, openUntil: '00:00' });
    expect(openStatus(bar, tr('2026-11-10T00:00:00'))).toEqual({ openNow: false, openUntil: null });
    expect(openStatus([], tr('2026-11-09T21:00:00'))).toEqual({ openNow: null, openUntil: null });
  });
});

describe('mekân saatleri (API)', () => {
  let ctx: TestContext;
  const admin = { 'X-Admin-Key': ADMIN_KEY };
  const setHours = (slug: string, hours: unknown[]) => ctx.http().put(`/v1/admin/venues/${slug}/hours`).set(admin).send({ hours });

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedBasics(ctx.prisma);
    await ctx.prisma.venue.createMany({
      data: [
        { slug: 'kapali', name: 'Kapalı Bar', district: 'Kadıköy' },
        { slug: 'saatsiz', name: 'Saatsiz', district: 'Kadıköy' },
      ],
    });
  });

  it('admin haftalık saatleri yazar; detay Pazartesiden sıralı, liste "şimdi açık" süzer', async () => {
    const all = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '00:00', closesAt: '00:00' })); // 7/24
    const res = await setHours('blind', all).expect(200);
    expect(res.body).toMatchObject({ slug: 'blind', openNow: true });
    expect(res.body.hours.map((h: { weekday: number }) => h.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);

    // Bugün ve dün dışındaki bir gün, gündüz: şu an kesin kapalı
    const { weekday } = trWeekdayMinutes(new Date());
    await setHours('kapali', [{ weekday: (weekday + 3) % 7, opensAt: '10:00', closesAt: '11:00' }]).expect(200);

    const detail = (await ctx.http().get('/v1/venues/blind').expect(200)).body;
    expect(detail).toMatchObject({ openNow: true, openUntil: '00:00' });
    expect(detail).not.toHaveProperty('searchText');

    const list = (await ctx.http().get('/v1/venues').expect(200)).body as { slug: string; openNow: boolean | null }[];
    expect(Object.fromEntries(list.map((v) => [v.slug, v.openNow]))).toEqual({ blind: true, kapali: false, saatsiz: null });
    const open = (await ctx.http().get('/v1/venues?openNow=1').expect(200)).body;
    expect(open.map((v: { slug: string }) => v.slug)).toEqual(['blind']);

    expect(await ctx.prisma.auditLog.count({ where: { action: 'venue.hours' } })).toBe(2);
    await setHours('blind', []).expect(200);
    expect((await ctx.http().get('/v1/venues/blind')).body).toMatchObject({ hours: [], openNow: null });
  });

  it('geçersiz saat, aynı gün iki kez, bilinmeyen mekân ve yetkisiz istek reddedilir', async () => {
    await setHours('blind', [{ weekday: 1, opensAt: '25:00', closesAt: '02:00' }]).expect(400);
    await setHours('blind', [{ weekday: 7, opensAt: '20:00', closesAt: '02:00' }]).expect(400);
    await setHours('blind', [
      { weekday: 1, opensAt: '20:00', closesAt: '02:00' },
      { weekday: 1, opensAt: '21:00', closesAt: '03:00' },
    ]).expect(400);
    await setHours('yok', []).expect(404);
    const user = await login(ctx, 'misafir@ornek.com');
    await ctx.http().put('/v1/admin/venues/blind/hours').set(bearer(user.accessToken)).send({ hours: [] }).expect(403);
  });
});
