import { StreamProbe } from '../src/radio/radio.service';
import { PlaylogService } from '../src/playlog/playlog.service';
import { StationHealthService } from '../src/stations/station-health.service';
import { ADMIN_KEY, bearer, createTestApp, login, resetDb, seedBasics, TestContext } from './utils';

const DOWN: StreamProbe = { ok: false, codec: null, bitrate: null, icy: false, error: 'HTTP 503' };
const NO_ICY: StreamProbe = { ok: true, codec: 'audio/aacp', bitrate: 64, icy: false, error: null };

describe('istasyon sağlığı', () => {
  let ctx: TestContext;
  let health: StationHealthService;
  let url: string;
  const admin = { 'X-Admin-Key': ADMIN_KEY };
  const curated = async () => (await ctx.http().get('/v1/genres/rock/stations').expect(200)).body as { name: string; hasMetadata: boolean }[];

  beforeAll(async () => {
    ctx = await createTestApp();
    health = ctx.get(StationHealthService);
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    url = (await seedBasics(ctx.prisma)).station.streamUrl;
    ctx.radio.probes.clear();
    ctx.radio.tracks.clear();
  });

  it('3 ardışık hata → DOWN ve uygulamadan gizlenir; düzelince geri gelir', async () => {
    ctx.radio.probes.set(url, DOWN);
    expect(await health.checkAll()).toEqual({ checked: 1, down: 0, recovered: 0 });
    expect(await health.checkAll()).toEqual({ checked: 1, down: 0, recovered: 0 });
    expect(await curated()).toHaveLength(1); // 2 hata: henüz görünür
    expect(await health.checkAll()).toEqual({ checked: 1, down: 1, recovered: 0 });

    const st = await ctx.prisma.station.findUniqueOrThrow({ where: { slug: 'rock-fm' } });
    expect(st).toMatchObject({ status: 'DOWN', failCount: 3, lastError: 'HTTP 503' });
    expect(await curated()).toEqual([]);
    const genres = (await ctx.http().get('/v1/genres').expect(200)).body;
    expect(genres[0]._count.stations).toBe(0);
    // Yoklayıcı DOWN istasyona bağlanmaz
    ctx.radio.tracks.set(url, { raw: 'Duman - Bu Akşam', artist: 'Duman', title: 'Bu Akşam' });
    expect(await ctx.get(PlaylogService).poll()).toEqual({ stations: 0, logged: 0 });

    ctx.radio.probes.delete(url);
    expect(await health.checkAll()).toEqual({ checked: 1, down: 0, recovered: 1 });
    expect(await ctx.prisma.station.findUniqueOrThrow({ where: { slug: 'rock-fm' } })).toMatchObject({
      status: 'OK',
      failCount: 0,
      lastError: null,
      codec: 'audio/mpeg',
      bitrate: 128,
    });
    expect(await curated()).toHaveLength(1);
  });

  it('ICY beklenip gelmezse NO_METADATA: çalar ama "şu an çalan" sorulmaz', async () => {
    ctx.radio.probes.set(url, NO_ICY);
    await health.checkAll();
    expect(await curated()).toEqual([expect.objectContaining({ name: 'Rock FM', hasMetadata: false })]);
    expect((await ctx.get(PlaylogService).poll()).stations).toBe(0);
  });

  it('HLS yayın (hasMetadata=false) ICY vermese de OK', async () => {
    await ctx.prisma.station.update({ where: { slug: 'rock-fm' }, data: { hasMetadata: false } });
    ctx.radio.probes.set(url, { ok: true, codec: 'hls', bitrate: null, icy: false, error: null });
    await health.checkAll();
    expect((await ctx.prisma.station.findUniqueOrThrow({ where: { slug: 'rock-fm' } })).status).toBe('OK');
  });

  it('admin: sağlık listesi sorunluları üstte gösterir, "test et" anında kontrol eder', async () => {
    const genre = await ctx.prisma.genre.findUniqueOrThrow({ where: { slug: 'rock' } });
    await ctx.prisma.station.create({ data: { slug: 'olu-fm', name: 'Ölü FM', streamUrl: 'https://x.example.com/olu', genreId: genre.id, status: 'DOWN', failCount: 5 } });
    const list = (await ctx.http().get('/v1/admin/stations/health').set(admin).expect(200)).body;
    expect(list.map((s: { slug: string; status: string }) => [s.slug, s.status])).toEqual([
      ['olu-fm', 'DOWN'],
      ['rock-fm', 'OK'],
    ]);
    expect(list[1]).toMatchObject({ genre: 'rock', lastPlayAt: null });

    ctx.radio.tracks.set(url, { raw: 'Duman - Bu Akşam', artist: 'Duman', title: 'Bu Akşam' });
    const test = await ctx.http().post('/v1/admin/stations/rock-fm/test').set(admin).expect(200);
    expect(test.body).toMatchObject({ slug: 'rock-fm', previous: 'OK', status: 'OK', probe: { ok: true }, nowPlaying: { artist: 'Duman' } });
    await ctx.http().post('/v1/admin/stations/yok/test').set(admin).expect(404);

    const user = await login(ctx, 'dinleyici@ornek.com');
    await ctx.http().get('/v1/admin/stations/health').set(bearer(user.accessToken)).expect(403);
  });
});
