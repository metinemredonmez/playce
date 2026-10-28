import { createTestApp, resetDb, seedBasics, TestContext } from './utils';

describe('/health/deep', () => {
  let ctx: TestContext;
  const MIN = 60_000;
  const ago = (ms: number) => new Date(Date.now() - ms);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedBasics(ctx.prisma);
  });

  it('yeni kurulumda (kayıt yok) sağlıklı; /health önek dışında', async () => {
    await ctx.http().get('/health').expect(200, { ok: true });
    const res = await ctx.http().get('/health/deep').expect(200);
    expect(res.body).toMatchObject({ ok: true, db: true, problems: [], checks: { pushQueueLagSec: 0, lastPlayAgeSec: null }, lastImport: null });
  });

  it('push kuyruğu birikmiş ve yoklayıcı durmuşsa 503', async () => {
    const station = await ctx.prisma.station.findFirstOrThrow();
    const user = await ctx.prisma.user.create({ data: { email: 'k@ornek.com' } });
    await ctx.prisma.notification.create({ data: { userId: user.id, kind: 'SYSTEM', title: 't', body: 'b', pushAfter: ago(20 * MIN) } });
    await ctx.prisma.playLog.create({ data: { stationId: station.id, raw: 'A - B', at: ago(30 * MIN) } });
    await ctx.prisma.station.update({ where: { id: station.id }, data: { lastCheckedAt: ago(10 * MIN) } });

    const res = await ctx.http().get('/health/deep').expect(503);
    expect(res.body.problems).toEqual(['pushQueueLagSec', 'lastPlayAgeSec']);
    expect(res.body.checks.lastStationCheckAgeSec).toBeGreaterThanOrEqual(600);
  });
});
