import { JobsService } from '../src/jobs/jobs.service';
import { bearer, createTestApp, login, resetDb, seedBasics, TestContext } from './utils';

const DAY = 24 * 60 * 60 * 1000;

describe('me + takip/kaydet', () => {
  let ctx: TestContext;
  let auth: { Authorization: string };
  let userId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedBasics(ctx.prisma);
    const t = await login(ctx, 'deniz@ornek.com');
    auth = bearer(t.accessToken);
    userId = t.user.id;
  });

  describe('profil', () => {
    it('ad, doğum yılı ve zevk türlerini günceller', async () => {
      const res = await ctx.http().patch('/v1/me').set(auth).send({ name: 'Deniz', birthYear: 1996, tasteGenres: ['rock'] }).expect(200);
      expect(res.body).toMatchObject({ name: 'Deniz', birthYear: 1996, tasteGenres: [{ slug: 'rock' }] });
    });

    it('bilinmeyen tür ve tanımsız alan reddedilir', async () => {
      await ctx.http().patch('/v1/me').set(auth).send({ tasteGenres: ['polka'] }).expect(400);
      await ctx.http().patch('/v1/me').set(auth).send({ role: 'ADMIN' }).expect(400);
    });

    it('onaylar sürümlü tutulur; pazarlama rızası olmadan pazarlama bildirimi açılmaz', async () => {
      await ctx.http().patch('/v1/me/notification-prefs').set(auth).send({ marketing: true }).expect(400);
      await ctx.http().post('/v1/me/consents').set(auth).send({ kind: 'ACIK_RIZA_PAZARLAMA', version: '2026-11-01', granted: true }).expect(201);
      await ctx.http().patch('/v1/me/notification-prefs').set(auth).send({ marketing: true }).expect(200);

      const res = await ctx.http().post('/v1/me/consents').set(auth).send({ kind: 'ACIK_RIZA_PAZARLAMA', version: '2026-11-01', granted: false }).expect(201);
      expect(res.body).toEqual([expect.objectContaining({ kind: 'ACIK_RIZA_PAZARLAMA', granted: false })]);
      expect(await ctx.prisma.consent.count()).toBe(2);
      expect((await ctx.http().get('/v1/me/notification-prefs').set(auth)).body.marketing).toBe(false);
    });
  });

  describe('takip ve kaydet', () => {
    it('sanatçı takibi idempotent', async () => {
      await ctx.http().put('/v1/me/follows/artists/duman').set(auth).expect(200);
      const res = await ctx.http().put('/v1/me/follows/artists/duman').set(auth).send({ notifyOnRadio: false }).expect(200);
      expect(res.body).toEqual({ following: true, notifyOnRadio: false });
      expect(await ctx.prisma.artistFollow.count()).toBe(1);

      const following = await ctx.http().get('/v1/me/following').set(auth).expect(200);
      expect(following.body.artists).toEqual([
        expect.objectContaining({ slug: 'duman', notifyOnRadio: false, nextEvent: expect.objectContaining({ slug: 'duman-blind' }) }),
      ]);

      await ctx.http().delete('/v1/me/follows/artists/duman').set(auth).expect(200);
      await ctx.http().delete('/v1/me/follows/artists/duman').set(auth).expect(200);
      expect(await ctx.prisma.artistFollow.count()).toBe(0);
      await ctx.http().put('/v1/me/follows/artists/yok-boyle').set(auth).expect(404);
    });

    it('mekân takibi', async () => {
      await ctx.http().put('/v1/me/follows/venues/blind').set(auth).expect(200);
      await ctx.http().put('/v1/me/follows/venues/blind').set(auth).expect(200);
      const res = await ctx.http().get('/v1/me/following').set(auth).expect(200);
      expect(res.body.venues).toEqual([expect.objectContaining({ slug: 'blind' })]);
    });

    it('kaydedilen etkinlikler yaklaşan/geçmiş diye ayrılır', async () => {
      await ctx.http().put('/v1/me/saves/manga-blind').set(auth).expect(200);
      await ctx.http().put('/v1/me/saves/duman-blind').set(auth).send({ status: 'GOING' }).expect(200);
      await ctx.http().put('/v1/me/saves/eski-konser').set(auth).expect(200);
      await ctx.http().put('/v1/me/saves/duman-blind').set(auth).expect(200); // durum korunur

      const upcoming = await ctx.http().get('/v1/me/saves').set(auth).expect(200);
      expect(upcoming.body.map((e: { slug: string }) => e.slug)).toEqual(['duman-blind', 'manga-blind']);
      expect(upcoming.body[0].save.status).toBe('GOING');
      expect(upcoming.body[0].artists).toEqual([{ slug: 'duman', name: 'Duman' }]);

      const past = await ctx.http().get('/v1/me/saves?when=past').set(auth).expect(200);
      expect(past.body.map((e: { slug: string }) => e.slug)).toEqual(['eski-konser']);
      await ctx.http().get('/v1/me/saves?when=dun').set(auth).expect(400);
    });

    it('bitiş saati olmayan eski etkinlik de geçmişte görünür', async () => {
      await ctx.prisma.event.update({ where: { slug: 'eski-konser' }, data: { endsAt: null } });
      await ctx.http().put('/v1/me/saves/eski-konser').set(auth).expect(200);
      const past = await ctx.http().get('/v1/me/saves?when=past').set(auth).expect(200);
      expect(past.body).toHaveLength(1);
    });

    it('favori istasyonlar URL ile tekil; küratörlü istasyona bağlanır', async () => {
      const st = { streamUrl: 'https://stream.example.com/rock', name: 'Rock FM', genreSlug: 'rock' };
      await ctx.http().put('/v1/me/stations').set(auth).send(st).expect(200);
      const res = await ctx.http().put('/v1/me/stations').set(auth).send({ ...st, name: 'Rock FM 2' }).expect(200);
      expect(res.body).toEqual([expect.objectContaining({ name: 'Rock FM 2', hasMetadata: true })]);
      expect((await ctx.prisma.favoriteStation.findFirst())?.stationId).not.toBeNull();

      await ctx.http().put('/v1/me/stations').set(auth).send({ streamUrl: 'http://duz.example.com', name: 'x' }).expect(400);
      await ctx.http().delete('/v1/me/stations').query({ url: st.streamUrl }).set(auth).expect(200);
      expect(await ctx.prisma.favoriteStation.count()).toBe(0);
    });

    it('cihazdaki favoriler hesaba taşınır, bilinmeyenler atlanır', async () => {
      await ctx.http().put('/v1/me/follows/venues/blind').set(auth).expect(200);
      const res = await ctx
        .http()
        .post('/v1/me/merge-device')
        .set(auth)
        .send({
          stations: [{ streamUrl: 'https://radio.example.com/live.m3u8', name: 'HLS Radyo' }],
          venues: ['blind', 'olmayan-mekan'],
          artists: ['duman', 'manga'],
          events: ['duman-blind'],
        })
        .expect(200);
      expect(res.body.merged).toEqual({ stations: 1, venues: 0, artists: 2, events: 1 });
      expect((await ctx.prisma.favoriteStation.findFirst())?.hasMetadata).toBe(false);
    });
  });

  describe('KVKK', () => {
    it('veri dışa aktarma takipleri ve onayları içerir', async () => {
      await ctx.http().put('/v1/me/follows/artists/duman').set(auth).expect(200);
      await ctx.http().post('/v1/me/consents').set(auth).send({ kind: 'KVKK_AYDINLATMA', version: '2026-11-01', granted: true }).expect(201);
      const res = await ctx.http().get('/v1/me/export').set(auth).expect(200);
      expect(res.headers['content-disposition']).toContain('playce-verilerim.json');
      expect(res.body).toMatchObject({
        email: 'deniz@ornek.com',
        artistFollows: [expect.objectContaining({ artist: { slug: 'duman', name: 'Duman' } })],
        consents: [expect.objectContaining({ kind: 'KVKK_AYDINLATMA' })],
      });
    });

    it('hesap silme: oturum kapanır, 30 gün içinde giriş geri getirir, sonra anonimleşir', async () => {
      await ctx.http().put('/v1/me/follows/artists/duman').set(auth).expect(200);
      const del = await ctx.http().delete('/v1/me').set(auth).expect(200);
      expect(new Date(del.body.purgeAfter).getTime()).toBeGreaterThan(Date.now() + 29 * DAY);
      await ctx.http().get('/v1/me').set(auth).expect(401);

      const back = await login(ctx, 'deniz@ornek.com');
      expect(back.user.id).toBe(userId);
      expect((await ctx.prisma.user.findUnique({ where: { id: userId } }))?.deletedAt).toBeNull();

      await ctx.http().delete('/v1/me').set(bearer(back.accessToken)).expect(200);
      const jobs = ctx.get(JobsService);
      expect((await jobs.cleanup(new Date(Date.now() + 10 * DAY))).purgedUsers).toBe(0);
      expect((await jobs.cleanup(new Date(Date.now() + 31 * DAY))).purgedUsers).toBe(1);

      const u = await ctx.prisma.user.findUnique({ where: { id: userId }, include: { identities: true } });
      expect(u).toMatchObject({ email: null, name: null, identities: [] });
      expect(u?.purgedAt).not.toBeNull();
      expect(await ctx.prisma.artistFollow.count()).toBe(1); // toplam sayılar için kimliksiz kalır

      const fresh = await login(ctx, 'deniz@ornek.com');
      expect(fresh.isNew).toBe(true);
    });
  });
});
