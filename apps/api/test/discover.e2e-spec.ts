import { ArtistsService } from '../src/artists/artists.service';
import { createTestApp, resetDb, seedBasics, TestContext } from './utils';

describe('keşif köprüsü (/discover/now)', () => {
  let ctx: TestContext;
  let seed: Awaited<ReturnType<typeof seedBasics>>;
  const now = (query: Record<string, string>) => ctx.http().get('/v1/discover/now').query(query).expect(200);

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    seed = await seedBasics(ctx.prisma);
    ctx.radio.tracks.clear();
    ctx.get(ArtistsService).invalidate();
  });

  it('çalan parça → sanatçı + konserleri; tür → etkinlikler ve mekânlar', async () => {
    ctx.radio.tracks.set(seed.station.streamUrl, { raw: 'DUMAN - Bu Akşam', artist: 'DUMAN', title: 'Bu Akşam' });
    const body = (await now({ url: seed.station.streamUrl, genre: 'rock' })).body;
    expect(body.track).toEqual({ raw: 'DUMAN - Bu Akşam', artist: 'DUMAN', title: 'Bu Akşam' });
    expect(body.artist).toEqual({ slug: 'duman', name: 'Duman', imageUrl: null });
    expect(body.artistEvents.map((e: { slug: string }) => e.slug)).toEqual(['duman-blind']); // geçmiş konser yok
    expect(body.genreEvents.map((e: { slug: string }) => e.slug)).toContain('duman-blind');
    expect(body.venues).toEqual([expect.objectContaining({ slug: 'blind', nextEvent: expect.objectContaining({ slug: 'duman-blind' }) })]);
  });

  it('bu gece türün etkinliği yoksa yakındakilere düşer; eşleşmeyen parçada sanatçı yok', async () => {
    const jazz = await ctx.prisma.genre.create({ data: { slug: 'jazz', name: 'Caz', color: '#0f0', radioTag: 'jazz' } });
    await ctx.prisma.event.create({
      data: { slug: 'caz-gecesi', title: 'Caz Gecesi', startsAt: new Date(Date.now() + 5 * 86_400_000), venueId: seed.venue.id, genres: { connect: { id: jazz.id } } },
    });
    ctx.radio.tracks.set(seed.station.streamUrl, { raw: 'Bilinmeyen - Parça', artist: 'Bilinmeyen', title: 'Parça' });
    const body = (await now({ url: seed.station.streamUrl, genre: 'jazz' })).body;
    expect(body).toMatchObject({ artist: null, artistEvents: [], genreWindow: 'upcoming', venues: [] });
    expect(body.genreEvents.map((e: { slug: string }) => e.slug)).toEqual(['caz-gecesi']);
  });
});
