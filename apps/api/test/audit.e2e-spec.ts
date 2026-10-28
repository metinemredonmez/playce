import { PlaylogService } from '../src/playlog/playlog.service';
import { ADMIN_KEY, createTestApp, loginAs, resetDb, seedBasics, TestContext } from './utils';

describe('denetim kaydı (AuditLog)', () => {
  let ctx: TestContext;
  const admin = { 'X-Admin-Key': ADMIN_KEY };

  const withRole = (email: string, role: 'EDITOR' | 'ADMIN') => loginAs(ctx, email, role);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    await seedBasics(ctx.prisma);
  });

  it('admin yazmaları kim, ne, hangi kayıt ve gönderilen alanlarla kaydedilir; başarısız istek kaydedilmez', async () => {
    const editor = await withRole('editor@ornek.com', 'EDITOR');
    const body = { title: 'Yeni Gece', slug: 'yeni-gece', startsAt: '2030-01-10T21:00:00+03:00', venueSlug: 'blind' };
    const created = await ctx.http().post('/v1/admin/events').set(editor.auth).send(body).expect(201);
    await ctx.http().patch('/v1/admin/events/yeni-gece').set(editor.auth).send({ priceFrom: 50_000 }).expect(200);
    await ctx.http().patch('/v1/admin/events/yok').set(editor.auth).send({ priceFrom: 1 }).expect(404);
    await ctx.http().post('/v1/admin/events').set(editor.auth).send({ title: 'Eksik' }).expect(400);
    await ctx.http().delete('/v1/admin/events/yeni-gece').set(editor.auth).expect(200);

    const rows = await ctx.prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
    expect(rows.map((r) => [r.action, r.entityType, r.entityId, r.actorId])).toEqual([
      ['event.create', 'event', created.body.id, editor.id],
      ['event.update', 'event', created.body.id, editor.id],
      ['event.delete', 'event', created.body.id, editor.id],
    ]);
    expect(rows[0].diff).toEqual(body);
    expect(rows[1].diff).toEqual({ priceFrom: 50_000 });
    expect(rows[2].diff).toBeNull();
  });

  it('X-Admin-Key ile yapılanlar "admin-key" adına; eşleşmeyenler kuyruğu da kaydedilir', async () => {
    await ctx.http().post('/v1/admin/venues').set(admin).send({ name: 'Arkaoda', district: 'Kadıköy' }).expect(201);
    const station = await ctx.prisma.station.findFirstOrThrow();
    await ctx.get(PlaylogService).record(station, { raw: 'Sezen Aksu - Gülümse', artist: 'Sezen Aksu', title: 'Gülümse' });
    await ctx.http().post('/v1/admin/unmatched/sezen aksu/ignore').set(admin).expect(200);

    const rows = await ctx.prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
    expect(rows.map((r) => [r.action, r.entityId, r.actorId])).toEqual([
      ['venue.create', (await ctx.prisma.venue.findUniqueOrThrow({ where: { slug: 'arkaoda' } })).id, 'admin-key'],
      ['unmatched.ignore', 'sezen aksu', 'admin-key'],
    ]);
  });

  it('kayıtlar yalnız ADMIN rolüne açık; filtre ve cursor', async () => {
    const editor = await withRole('editor@ornek.com', 'EDITOR');
    const boss = await withRole('admin@ornek.com', 'ADMIN');
    for (const name of ['A', 'B', 'C']) {
      await ctx.http().post('/v1/admin/artists').set(editor.auth).send({ name: `Sanatçı ${name}` }).expect(201);
    }
    await ctx.http().patch('/v1/admin/venues/blind').set(boss.auth).send({ priceLevel: 2 }).expect(200);

    await ctx.http().get('/v1/admin/audit').set(editor.auth).expect(403);
    const all = (await ctx.http().get('/v1/admin/audit').set(boss.auth).expect(200)).body;
    expect(all.items.map((r: { action: string }) => r.action)).toEqual(['venue.update', 'artist.create', 'artist.create', 'artist.create']);
    expect(all.items[1].actor).toEqual({ id: editor.id, email: 'editor@ornek.com', name: null });

    const p1 = (await ctx.http().get('/v1/admin/audit').query({ entityType: 'artist', limit: 2 }).set(boss.auth)).body;
    const p2 = (await ctx.http().get('/v1/admin/audit').query({ entityType: 'artist', limit: 2, cursor: p1.nextCursor }).set(boss.auth)).body;
    expect([...p1.items, ...p2.items].map((r: { diff: { name: string } }) => r.diff.name)).toEqual(['Sanatçı C', 'Sanatçı B', 'Sanatçı A']);
    expect(p2.nextCursor).toBeNull();
    expect((await ctx.http().get('/v1/admin/audit').query({ actor: boss.id }).set(boss.auth)).body.items).toHaveLength(1);
  });
});
