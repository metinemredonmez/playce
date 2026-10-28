import { quietHoursEnd } from '../src/common/time';
import { FanoutService } from '../src/notifications/fanout.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PushService } from '../src/notifications/push.service';
import { ADMIN_KEY, bearer, createTestApp, login, resetDb, seedBasics, TestContext } from './utils';

/** İstanbul saatiyle verilen gün/saat (UTC+3). */
const tr = (iso: string) => new Date(`${iso}+03:00`);
const NO_QUIET = { quietStart: 0, quietEnd: 0 };

describe('sessiz saatler', () => {
  it('aralıktaysa bitiş anını, değilse null döner', () => {
    expect(quietHoursEnd(tr('2026-11-02T03:00:00'), 1, 10)).toEqual(tr('2026-11-02T10:00:00'));
    expect(quietHoursEnd(tr('2026-11-02T10:00:00'), 1, 10)).toBeNull();
    expect(quietHoursEnd(tr('2026-11-02T00:30:00'), 1, 10)).toBeNull();
    // gece yarısını aşan aralık
    expect(quietHoursEnd(tr('2026-11-02T23:30:00'), 23, 8)).toEqual(tr('2026-11-03T08:00:00'));
    expect(quietHoursEnd(tr('2026-11-03T07:59:00'), 23, 8)).toEqual(tr('2026-11-03T08:00:00'));
    expect(quietHoursEnd(tr('2026-11-02T12:00:00'), 5, 5)).toBeNull();
  });
});

describe('bildirimler', () => {
  let ctx: TestContext;
  let user: { id: string; auth: { Authorization: string } };

  const signUp = async (email: string, quiet = NO_QUIET) => {
    const t = await login(ctx, email);
    const auth = bearer(t.accessToken);
    await ctx.http().patch('/v1/me/notification-prefs').set(auth).send(quiet).expect(200);
    return { id: t.user.id, auth };
  };
  const addDevice = (auth: { Authorization: string }, token: string) =>
    ctx.http().post('/v1/me/push-tokens').set(auth).send({ token, deviceId: token, platform: 'ios' }).expect(200);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedBasics(ctx.prisma);
    ctx.expo.sent = [];
    ctx.expo.fail = false;
    user = await signUp('deniz@ornek.com');
  });

  it('push token girişsiz kaydolur, girişle hesaba bağlanır', async () => {
    const token = 'ExponentPushToken[cihaz-0000001]';
    const anon = await ctx.http().post('/v1/me/push-tokens').send({ token, deviceId: 'd', platform: 'android' }).expect(200);
    expect(anon.body.linked).toBe(false);
    const linked = await addDevice(user.auth, token);
    expect(linked.body.linked).toBe(true);
    await ctx.http().post('/v1/me/push-tokens').send({ token: 'gecersiz', deviceId: 'd', platform: 'ios' }).expect(400);
  });

  it('yeni etkinlik → sanatçı ve mekân takipçilerine tek bildirim, tekrar çalışınca kopya yok', async () => {
    const venueFan = await signUp('mekan@ornek.com');
    await ctx.http().put('/v1/me/follows/artists/duman').set(user.auth).expect(200);
    await ctx.http().put('/v1/me/follows/venues/blind').set(user.auth).expect(200); // ikisini de takip ediyor
    await ctx.http().put('/v1/me/follows/venues/blind').set(venueFan.auth).expect(200);

    await ctx
      .http()
      .post('/v1/admin/events')
      .set('X-Admin-Key', ADMIN_KEY)
      .send({ title: 'Duman Akustik', startsAt: '2030-11-01T21:00:00+03:00', venueSlug: 'blind', artistSlugs: ['duman'] })
      .expect(201);

    const fanout = ctx.get(FanoutService);
    expect(await fanout.eventFanout()).toEqual({ events: 1, notifications: 2 });
    expect(await fanout.eventFanout()).toEqual({ events: 0, notifications: 0 });

    const mine = await ctx.prisma.notification.findMany({ where: { userId: user.id } });
    expect(mine).toEqual([
      expect.objectContaining({ kind: 'ARTIST_NEW_EVENT', title: 'Duman sahne alıyor', deeplink: 'playce://event/duman-akustik-2030-11-01' }),
    ]);
    expect(mine[0].body).toContain('1 Kasım Cuma 21:00 · Blind');
    const theirs = await ctx.prisma.notification.findMany({ where: { userId: venueFan.id } });
    expect(theirs).toEqual([expect.objectContaining({ kind: 'VENUE_NEW_EVENT', title: 'Yeni etkinlik: Blind' })]);
  });

  it('taslak etkinlik yayınlanınca duyurulur', async () => {
    await ctx.http().put('/v1/me/follows/artists/manga').set(user.auth).expect(200);
    await ctx
      .http()
      .post('/v1/admin/events')
      .set('X-Admin-Key', ADMIN_KEY)
      .send({ title: 'maNga', slug: 'manga-taslak', startsAt: '2030-12-01T21:00:00+03:00', venueSlug: 'blind', artistSlugs: ['manga'], status: 'DRAFT' })
      .expect(201);
    const fanout = ctx.get(FanoutService);
    expect((await fanout.eventFanout()).notifications).toBe(0);
    await ctx.http().patch('/v1/admin/events/manga-taslak').set('X-Admin-Key', ADMIN_KEY).send({ status: 'PUBLISHED' }).expect(200);
    expect((await fanout.eventFanout()).notifications).toBe(1);
  });

  it('kapalı tercih bildirim üretmez', async () => {
    await ctx.http().patch('/v1/me/notification-prefs').set(user.auth).send({ artistNewEvent: false }).expect(200);
    const n = await ctx.get(NotificationsService).notify([{ userId: user.id, kind: 'ARTIST_NEW_EVENT', title: 't', body: 'b' }]);
    expect(n).toBe(0);
  });

  it('sessiz saatte push ertelenir; "şu an radyoda" ertelenmez, yalnız kutuya düşer', async () => {
    await ctx.http().patch('/v1/me/notification-prefs').set(user.auth).send({ quietStart: 1, quietEnd: 10 }).expect(200);
    const at3 = tr('2026-11-02T03:00:00');
    const svc = ctx.get(NotificationsService);
    await svc.notify([{ userId: user.id, kind: 'EVENT_REMINDER', title: 'r', body: 'b' }], at3);
    await svc.notify([{ userId: user.id, kind: 'ARTIST_ON_RADIO', title: 'o', body: 'b' }], at3);
    const rows = await ctx.prisma.notification.findMany({ orderBy: { title: 'asc' } });
    expect(rows.map((r) => [r.title, r.pushState, r.pushAfter.toISOString()])).toEqual([
      ['o', 'SKIPPED', at3.toISOString()],
      ['r', 'PENDING', tr('2026-11-02T10:00:00').toISOString()],
    ]);
  });

  it('kaydedilen etkinlik için 3 saat kala bir kez hatırlatır', async () => {
    await ctx.http().put('/v1/me/saves/duman-blind').set(user.auth).send({ status: 'GOING' }).expect(200); // 2 saat sonra
    await ctx.http().put('/v1/me/saves/manga-blind').set(user.auth).expect(200); // 3 gün sonra
    const fanout = ctx.get(FanoutService);
    expect(await fanout.eventReminders()).toEqual({ reminders: 1 });
    expect(await fanout.eventReminders()).toEqual({ reminders: 0 });
    const [n] = await ctx.prisma.notification.findMany();
    expect(n).toMatchObject({ kind: 'EVENT_REMINDER', title: 'Birazdan: duman-blind', deeplink: 'playce://event/duman-blind' });
  });

  it('Expo’ya gönderir; kayıtsız cihazın token’ını siler, cihazı yoksa atlar', async () => {
    await addDevice(user.auth, 'ExponentPushToken[telefon-0001]');
    await addDevice(user.auth, 'ExponentPushToken[Dead-tablet-01]');
    const other = await signUp('cihazsiz@ornek.com');
    const svc = ctx.get(NotificationsService);
    await svc.notify([
      { userId: user.id, kind: 'SYSTEM', title: 'Merhaba', body: 'b', deeplink: 'playce://library', data: { a: 1 } },
      { userId: other.id, kind: 'SYSTEM', title: 'Merhaba', body: 'b' },
    ]);

    const push = ctx.get(PushService);
    expect(await push.dispatchPending()).toEqual({ sent: 1, skipped: 1, failed: 0 });
    expect(ctx.expo.sent).toHaveLength(2);
    expect(ctx.expo.sent[0]).toMatchObject({ title: 'Merhaba', sound: 'default', data: { a: 1, kind: 'SYSTEM', url: 'playce://library' } });
    expect(await ctx.prisma.pushToken.count({ where: { userId: user.id } })).toBe(1);
    expect(await ctx.prisma.pushTicket.count()).toBe(1);
    expect(await push.dispatchPending()).toEqual({ sent: 0, skipped: 0, failed: 0 });

    // 15 dk sonra makbuz: uygulama silinmiş → token silinir
    const [ticket] = await ctx.prisma.pushTicket.findMany();
    ctx.expo.receiptsResult[ticket.id] = { status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } };
    expect(await push.checkReceipts(new Date(Date.now() + 16 * 60_000))).toEqual({ checked: 1, removedTokens: 1 });
    expect(await ctx.prisma.pushToken.count()).toBe(0);
  });

  it('Expo erişilemezse push bekler, sonraki turda gönderilir', async () => {
    await addDevice(user.auth, 'ExponentPushToken[telefon-0002]');
    await ctx.get(NotificationsService).notify([{ userId: user.id, kind: 'SYSTEM', title: 't', body: 'b' }]);
    const push = ctx.get(PushService);
    ctx.expo.fail = true;
    expect(await push.dispatchPending()).toEqual({ sent: 0, skipped: 0, failed: 0 });
    ctx.expo.fail = false;
    expect(await push.dispatchPending()).toEqual({ sent: 1, skipped: 0, failed: 0 });
  });

  it('bildirim kutusu: sayfalama, okunmamış sayısı, okundu işaretleme', async () => {
    const svc = ctx.get(NotificationsService);
    for (let i = 0; i < 5; i++) {
      await svc.notify([{ userId: user.id, kind: 'SYSTEM', title: `n${i}`, body: 'b' }], new Date(Date.now() + i * 1000));
    }
    const p1 = await ctx.http().get('/v1/me/notifications?limit=3').set(user.auth).expect(200);
    expect(p1.body.items.map((n: { title: string }) => n.title)).toEqual(['n4', 'n3', 'n2']);
    expect(p1.body.unread).toBe(5);
    const p2 = await ctx.http().get(`/v1/me/notifications?limit=3&cursor=${p1.body.nextCursor}`).set(user.auth).expect(200);
    expect(p2.body.items.map((n: { title: string }) => n.title)).toEqual(['n1', 'n0']);
    expect(p2.body.nextCursor).toBeNull();

    const read = await ctx.http().post('/v1/me/notifications/read').set(user.auth).send({ ids: [p1.body.items[0].id] }).expect(200);
    expect(read.body.unread).toBe(4);
    expect((await ctx.http().post('/v1/me/notifications/read').set(user.auth).send({}).expect(200)).body.unread).toBe(0);
  });
});
