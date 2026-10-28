import { ArtistsService } from '../src/artists/artists.service';
import { PlaylogService } from '../src/playlog/playlog.service';
import { ADMIN_KEY, bearer, createTestApp, login, resetDb, seedBasics, TestContext } from './utils';

const track = (raw: string) => {
  const i = raw.indexOf(' - ');
  return { raw, artist: i > 0 ? raw.slice(0, i) : null, title: i > 0 ? raw.slice(i + 3) : raw };
};
const at = (iso: string) => new Date(`${iso}+03:00`);

describe('PlayLog', () => {
  let ctx: TestContext;
  let playlog: PlaylogService;
  let seed: Awaited<ReturnType<typeof seedBasics>>;
  let station: { id: string; slug: string; name: string; streamUrl: string };
  const admin = { 'X-Admin-Key': ADMIN_KEY };

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    seed = await seedBasics(ctx.prisma);
    station = seed.station;
    ctx.get(ArtistsService).invalidate();
    // Son başlık önbelleği istasyon kimliğine göre; her testte istasyon yeni oluştuğu için çakışmaz.
    playlog = ctx.get(PlaylogService);
  });

  it('parça değişince bir kez kaydeder, sanatçıyı eşler', async () => {
    expect(await playlog.record(station, track('DUMAN - Bu Akşam'), at('2026-11-02T14:00:00'))).toBe(true);
    expect(await playlog.record(station, track('DUMAN - Bu Akşam'), at('2026-11-02T14:01:00'))).toBe(false);
    expect(await playlog.record(station, { raw: null, artist: null, title: null })).toBe(false);
    const logs = await ctx.prisma.playLog.findMany();
    expect(logs).toEqual([expect.objectContaining({ artistId: seed.duman.id, artistKey: 'duman', title: 'Bu Akşam' })]);
  });

  it('takipçiye "şu an radyoda" bildirimi — günde en fazla bir', async () => {
    const t = await login(ctx, 'deniz@ornek.com');
    await ctx.http().patch('/v1/me/notification-prefs').set(bearer(t.accessToken)).send({ quietStart: 0, quietEnd: 0 }).expect(200);
    await ctx.http().put('/v1/me/follows/artists/duman').set(bearer(t.accessToken)).expect(200);
    const silent = await login(ctx, 'sessiz@ornek.com');
    await ctx.http().put('/v1/me/follows/artists/duman').set(bearer(silent.accessToken)).send({ notifyOnRadio: false }).expect(200);

    await playlog.record(station, track('Duman - Bu Akşam'), at('2026-11-02T14:00:00'));
    await playlog.record(station, track('Duman - Senden Daha Güzel'), at('2026-11-02T18:00:00'));
    await playlog.record(station, track('Duman - Köprüaltı'), at('2026-11-03T14:00:00'));

    const notes = await ctx.prisma.notification.findMany({ orderBy: { createdAt: 'asc' } });
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({
      userId: t.user.id,
      kind: 'ARTIST_ON_RADIO',
      title: 'Duman şu an radyoda',
      body: 'Bu Akşam · Rock FM',
      data: { artistSlug: 'duman', stationSlug: 'rock-fm', streamUrl: station.streamUrl },
    });
  });

  it('eşleşmeyen sanatçı kuyruğa düşer; admin bağlayınca geçmiş çalmalar eşlenir', async () => {
    await playlog.record(station, track('Mor ve Ötesi - Bir Derdim Var'));
    await playlog.record(station, track('MOR VE OTESI - Cambaz'));
    await playlog.record(station, track('Sezen Aksu - Gülümse'));

    const list = await ctx.http().get('/v1/admin/unmatched').set(admin).expect(200);
    expect(list.body.map((u: { key: string; plays: number }) => [u.key, u.plays])).toEqual([
      ['mor ve otesi', 2],
      ['sezen aksu', 1],
    ]);

    await ctx.prisma.artist.create({ data: { slug: 'mor-ve-otesi', name: 'mor ve ötesi band' } });
    const linked = await ctx.http().post('/v1/admin/unmatched/mor ve otesi/link').set(admin).send({ artistSlug: 'mor-ve-otesi' }).expect(200);
    expect(linked.body).toMatchObject({ status: 'LINKED', artist: { slug: 'mor-ve-otesi' } });

    const artist = await ctx.prisma.artist.findUnique({ where: { slug: 'mor-ve-otesi' }, include: { plays: true } });
    expect(artist?.aliases).toEqual(['Mor ve Ötesi']); // kuyrukta ilk görülen yazılış
    expect(artist?.plays).toHaveLength(2);

    // Alias sayesinde sonraki çalma doğrudan eşleşir
    await playlog.record(station, track('Mor ve Ötesi - Uyan'));
    expect(await ctx.prisma.playLog.count({ where: { artistId: artist!.id } })).toBe(3);

    await ctx.http().post('/v1/admin/unmatched/sezen aksu/ignore').set(admin).expect(200);
    expect((await ctx.http().get('/v1/admin/unmatched').set(admin)).body).toEqual([]);
  });

  it('kuyruktan yeni sanatçı açılır; admin sanatçı ekleyince bekleyenler kendiliğinden bağlanır', async () => {
    await playlog.record(station, track('Athena - Holigan'));
    await playlog.record(station, track('Hayko Cepkin - Fırtınam'));

    const created = await ctx.http().post('/v1/admin/unmatched/athena/create').set(admin).send({}).expect(201);
    expect(created.body).toMatchObject({ status: 'LINKED', artist: { slug: 'athena', name: 'Athena' } });

    await ctx.http().post('/v1/admin/artists').set(admin).send({ name: 'Hayko Cepkin' }).expect(201);
    const hayko = await ctx.prisma.unmatchedArtist.findUnique({ where: { key: 'hayko cepkin' } });
    expect(hayko?.status).toBe('LINKED');
    expect(await ctx.prisma.playLog.count({ where: { artistId: null } })).toBe(0);
  });

  it('kuyruk uçları rol ister', async () => {
    const t = await login(ctx, 'kullanici@ornek.com');
    await ctx.http().get('/v1/admin/unmatched').expect(401);
    await ctx.http().get('/v1/admin/unmatched').set(bearer(t.accessToken)).expect(403);
  });

  it('yoklayıcı küratörlü ICY istasyonlarını okur', async () => {
    const hls = await ctx.prisma.station.create({
      data: { slug: 'hls', name: 'HLS', streamUrl: 'https://x.example.com/a.m3u8', hasMetadata: false, genreId: seed.rock.id },
    });
    ctx.radio.tracks.set(station.streamUrl, track('maNga - Cevapsız Sorular'));
    ctx.radio.tracks.set(hls.streamUrl, track('Duman - Olmadı'));
    expect(await playlog.poll()).toEqual({ stations: 1, logged: 1 });
    expect(await playlog.poll()).toEqual({ stations: 1, logged: 0 });
  });

  it('istasyonun son çalanları ve sanatçının radyo geçmişi', async () => {
    await playlog.record(station, track('Duman - Bu Akşam'), new Date(Date.now() - 60_000));
    await playlog.record(station, track('Bilinmeyen - Parça'));

    const plays = await ctx.http().get('/v1/stations/rock-fm/plays').expect(200);
    expect(plays.body.station).toMatchObject({ slug: 'rock-fm', name: 'Rock FM' });
    expect(plays.body.plays.map((p: { raw: string; artist: unknown }) => [p.raw, p.artist])).toEqual([
      ['Bilinmeyen - Parça', null],
      ['Duman - Bu Akşam', { slug: 'duman', name: 'Duman', imageUrl: null }],
    ]);
    await ctx.http().get('/v1/stations/yok/plays').expect(404);

    const artist = await ctx.http().get('/v1/artists/duman').expect(200);
    expect(artist.body.onRadio).toEqual([expect.objectContaining({ title: 'Bu Akşam', station: expect.objectContaining({ slug: 'rock-fm' }) })]);
  });
});
