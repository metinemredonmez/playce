import { createHash } from 'crypto';
import { ADMIN_KEY, bearer, createTestApp, login, resetDb, seedBasics, TestContext } from './utils';

const APPLE = { iss: 'https://appleid.apple.com', aud: 'app.playce.mobile' };
const GOOGLE = { iss: 'https://accounts.google.com', aud: 'test-client.apps.googleusercontent.com' };

describe('auth', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedBasics(ctx.prisma);
  });

  describe('e-posta kodu', () => {
    it('kodla giriş yapar; ikinci girişte aynı hesap döner', async () => {
      const first = await login(ctx, 'deniz@ornek.com');
      expect(first.isNew).toBe(true);
      expect(first.user).toMatchObject({ email: 'deniz@ornek.com', role: 'USER', providers: ['EMAIL'] });

      const second = await login(ctx, 'deniz@ornek.com');
      expect(second.isNew).toBe(false);
      expect(second.user.id).toBe(first.user.id);
      expect(await ctx.prisma.notificationPref.count()).toBe(1);
    });

    it('e-postayı küçük harfe çevirir', async () => {
      await ctx.http().post('/v1/auth/otp/request').send({ email: '  Deniz@Ornek.COM ' }).expect(200);
      expect(ctx.mail.codes.has('deniz@ornek.com')).toBe(true);
    });

    it('60 sn dolmadan yeni kod vermez', async () => {
      await ctx.http().post('/v1/auth/otp/request').send({ email: 'a@ornek.com' }).expect(200);
      const res = await ctx.http().post('/v1/auth/otp/request').send({ email: 'a@ornek.com' }).expect(429);
      expect(res.body.retryAfter).toBeGreaterThan(0);
    });

    it('5 yanlış denemede kod iptal olur, doğrusu da artık geçmez', async () => {
      const email = 'b@ornek.com';
      await ctx.http().post('/v1/auth/otp/request').send({ email }).expect(200);
      const code = ctx.mail.codes.get(email)!;
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 4; i++) await ctx.http().post('/v1/auth/otp/verify').send({ email, code: wrong }).expect(400);
      const last = await ctx.http().post('/v1/auth/otp/verify').send({ email, code: wrong }).expect(400);
      expect(last.body.message).toMatch(/Yeni kod/);
      await ctx.http().post('/v1/auth/otp/verify').send({ email, code }).expect(400);
    });

    it('kod tek kullanımlık', async () => {
      const email = 'c@ornek.com';
      await ctx.http().post('/v1/auth/otp/request').send({ email }).expect(200);
      const code = ctx.mail.codes.get(email);
      await ctx.http().post('/v1/auth/otp/verify').send({ email, code }).expect(200);
      await ctx.http().post('/v1/auth/otp/verify').send({ email, code }).expect(400);
    });
  });

  describe('oturum', () => {
    it('korumalı uç token ister; public uç bozuk token’la da çalışır', async () => {
      await ctx.http().get('/v1/me').expect(401);
      await ctx.http().get('/v1/me').set(bearer('bozuk')).expect(401);
      await ctx.http().get('/v1/genres').set(bearer('bozuk')).expect(200);
      const { accessToken } = await login(ctx, 'd@ornek.com');
      await ctx.http().get('/v1/me').set(bearer(accessToken)).expect(200);
    });

    it('refresh token döner; eski token hemen tekrar gelirse oturumu düşürmez', async () => {
      const t1 = await login(ctx, 'e@ornek.com');
      const t2 = (await ctx.http().post('/v1/auth/refresh').send({ refreshToken: t1.refreshToken }).expect(200)).body;
      expect(t2.refreshToken).not.toBe(t1.refreshToken);
      await ctx.http().post('/v1/auth/refresh').send({ refreshToken: t1.refreshToken }).expect(401);
      await ctx.http().get('/v1/me').set(bearer(t2.accessToken)).expect(200);
      await ctx.http().post('/v1/auth/refresh').send({ refreshToken: t2.refreshToken }).expect(200);
    });

    it('eski refresh token sonradan kullanılırsa tüm oturumlar kapanır', async () => {
      const t1 = await login(ctx, 'f@ornek.com');
      const other = await login(ctx, 'f@ornek.com'); // ikinci cihaz
      const t2 = (await ctx.http().post('/v1/auth/refresh').send({ refreshToken: t1.refreshToken }).expect(200)).body;
      await ctx.prisma.session.updateMany({ data: { rotatedAt: new Date(Date.now() - 60_000) } });

      await ctx.http().post('/v1/auth/refresh').send({ refreshToken: t1.refreshToken }).expect(401);
      await ctx.http().get('/v1/me').set(bearer(t2.accessToken)).expect(401);
      await ctx.http().get('/v1/me').set(bearer(other.accessToken)).expect(401);
    });

    it('çıkış oturumu hemen kapatır ve push token’ı hesaptan ayırır', async () => {
      const { accessToken } = await login(ctx, 'g@ornek.com');
      const token = 'ExponentPushToken[cikis-test-0001]';
      await ctx.http().post('/v1/me/push-tokens').set(bearer(accessToken)).send({ token, deviceId: 'd1', platform: 'ios' }).expect(200);
      await ctx.http().post('/v1/auth/logout').set(bearer(accessToken)).send({ pushToken: token }).expect(200);
      await ctx.http().get('/v1/me').set(bearer(accessToken)).expect(401);
      expect((await ctx.prisma.pushToken.findUnique({ where: { token } }))?.userId).toBeNull();
    });

    it('askıya alınan kullanıcı giremez', async () => {
      const { accessToken, user } = await login(ctx, 'h@ornek.com');
      await ctx.prisma.user.update({ where: { id: user.id }, data: { bannedAt: new Date() } });
      await ctx.http().get('/v1/me').set(bearer(accessToken)).expect(403);
      await ctx.prisma.otpCode.deleteMany();
      await ctx.http().post('/v1/auth/otp/request').send({ email: 'h@ornek.com' }).expect(200);
      await ctx.http().post('/v1/auth/otp/verify').send({ email: 'h@ornek.com', code: ctx.mail.codes.get('h@ornek.com') }).expect(403);
    });
  });

  describe('Apple / Google', () => {
    it('Apple token’ı doğrular, nonce’u kontrol eder', async () => {
      const nonce = 'rastgele-nonce';
      const hashed = createHash('sha256').update(nonce).digest('hex');
      const identityToken = await ctx.signer.sign({ email: 'x@privaterelay.appleid.com', email_verified: 'true', nonce: hashed }, { ...APPLE, sub: 'apple-1' });

      const res = await ctx.http().post('/v1/auth/apple').send({ identityToken, nonce, name: 'Deniz' }).expect(200);
      expect(res.body.isNew).toBe(true);
      expect(res.body.user).toMatchObject({ email: 'x@privaterelay.appleid.com', name: 'Deniz', providers: ['APPLE'] });

      await ctx.http().post('/v1/auth/apple').send({ identityToken, nonce: 'baska' }).expect(401);
    });

    it('yanlış audience ya da yayıncıyla gelen token reddedilir', async () => {
      const wrongAud = await ctx.signer.sign({}, { ...APPLE, aud: 'com.baska.app', sub: 'apple-2' });
      await ctx.http().post('/v1/auth/apple').send({ identityToken: wrongAud }).expect(401);
      const wrongIss = await ctx.signer.sign({}, { ...GOOGLE, iss: 'https://evil.example.com', sub: 'g-2' });
      await ctx.http().post('/v1/auth/google').send({ idToken: wrongIss }).expect(401);
    });

    it('doğrulanmış aynı e-posta ile Google girişi mevcut hesaba bağlanır', async () => {
      const email = await login(ctx, 'ayni@ornek.com');
      const idToken = await ctx.signer.sign({ email: 'ayni@ornek.com', email_verified: true, name: 'Ayşe' }, { ...GOOGLE, sub: 'g-1' });
      const res = await ctx.http().post('/v1/auth/google').send({ idToken }).expect(200);
      expect(res.body.isNew).toBe(false);
      expect(res.body.user.id).toBe(email.user.id);
      expect(res.body.user.providers.sort()).toEqual(['EMAIL', 'GOOGLE']);
    });

    it('doğrulanmamış e-posta hesaba bağlanmaz', async () => {
      await login(ctx, 'z@ornek.com');
      const idToken = await ctx.signer.sign({ email: 'z@ornek.com', email_verified: false }, { ...GOOGLE, sub: 'g-3' });
      const res = await ctx.http().post('/v1/auth/google').send({ idToken }).expect(200);
      expect(res.body.isNew).toBe(true);
      expect(res.body.user.email).toBeNull();
    });
  });

  describe('admin yetkisi', () => {
    const event = { title: 'Test', startsAt: '2030-01-01T21:00:00+03:00', venueSlug: 'blind' };

    it('rolsüz kullanıcı 403, EDITOR ve X-Admin-Key geçer', async () => {
      const { accessToken, user } = await login(ctx, 'editor@ornek.com');
      await ctx.http().post('/v1/admin/events').send(event).expect(401);
      await ctx.http().post('/v1/admin/events').set(bearer(accessToken)).send(event).expect(403);

      await ctx.prisma.user.update({ where: { id: user.id }, data: { role: 'EDITOR' } });
      await ctx.http().post('/v1/admin/events').set(bearer(accessToken)).send(event).expect(201);
      await ctx.http().post('/v1/admin/events').set('X-Admin-Key', ADMIN_KEY).send({ ...event, slug: 'test-2' }).expect(201);
      await ctx.http().post('/v1/admin/events').set('X-Admin-Key', 'yanlis-anahtar-123').send(event).expect(401);
    });
  });
});
