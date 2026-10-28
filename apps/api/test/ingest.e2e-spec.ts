import { ArtistsService } from '../src/artists/artists.service';
import { IngestService } from '../src/ingest/ingest.service';
import { EtkEvent, mapEtkinlikIo } from '../src/ingest/sources/etkinlikio';
import { mapTicketmaster, TmEvent } from '../src/ingest/sources/ticketmaster';
import { ExternalEvent } from '../src/ingest/types';
import { ADMIN_KEY, createTestApp, loginAs, resetDb, seedBasics, TestContext } from './utils';

const DAY = 86_400_000;

describe('kaynak eşlemeleri', () => {
  it('Etkinlik.io: UTC saatler, HTML içerik düz metne, bilet linki yoksa etkinlik sayfası sayılmaz, çevrim içi mekânsız', () => {
    const e: EtkEvent = {
      id: 42,
      name: ' Duman Konseri ',
      url: 'https://etkinlik.io/etkinlik/42/duman',
      content: '<p>Yeni albüm &amp; klasikler.</p><p>Kapı 20:00</p>',
      start_r001: '2030-11-01T18:00:00Z',
      end_r001: null,
      is_free: false,
      poster_url: 'https://cdn.example.com/p.jpg',
      ticket_url: 'https://etkinlik.io/etkinlik/42/duman',
      format: { id: 1, name: 'Konser', slug: 'konser' },
      category: { id: 2, name: 'Rock', slug: 'rock' },
      tags: [{ id: 3, name: 'Türkçe Rock', slug: 'turkce-rock' }],
      venue_type: 'VENUE',
      venue_data: {
        id: 7,
        name: 'Blind',
        address: 'Asmalımescit',
        lat: '41.0316',
        lng: '28.9752',
        district: { id: 1, name: 'Beyoğlu', slug: 'beyoglu' },
        city: { id: 34, name: 'İstanbul', slug: 'istanbul' },
      },
    };
    expect(mapEtkinlikIo(e)).toEqual({
      externalId: '42',
      url: e.url,
      title: 'Duman Konseri',
      description: 'Yeni albüm & klasikler.\n\nKapı 20:00',
      startsAt: new Date('2030-11-01T18:00:00Z'),
      endsAt: null,
      cancelled: false,
      isFree: false,
      priceFrom: null,
      ticketUrl: null,
      coverUrl: 'https://cdn.example.com/p.jpg',
      venue: { externalId: '7', name: 'Blind', address: 'Asmalımescit', district: 'Beyoğlu', city: 'İstanbul', lat: 41.0316, lng: 28.9752 },
      tags: ['Konser', 'Rock', 'Türkçe Rock'],
      performers: [],
    });
    expect(mapEtkinlikIo({ ...e, venue_type: 'ONLINE', venue_data: null }).venue).toBeNull();
    const manual = mapEtkinlikIo({ ...e, venue_type: 'MANUAL', venue_data: { name: 'Bahçe', address: null, district_name: 'Kadıköy', city_name: 'İstanbul' } });
    expect(manual.venue).toMatchObject({ externalId: null, name: 'Bahçe', district: 'Kadıköy', lat: null });
    expect(mapEtkinlikIo({ ...e, is_free: true, ticket_url: 'https://www.biletix.com/x' })).toMatchObject({ isFree: true, priceFrom: 0, ticketUrl: 'https://www.biletix.com/x' });
  });

  it('Ticketmaster: TL fiyat kuruşa, en geniş 16:9 görsel, sahne alanlar, iptal; saatsiz etkinlik alınmaz', () => {
    const e: TmEvent = {
      id: 'Z1',
      name: 'maNga',
      url: 'https://www.ticketmaster.com.tr/event/Z1',
      dates: { start: { dateTime: '2030-12-01T18:00:00Z' }, status: { code: 'cancelled' } },
      images: [
        { url: 'https://img/k.jpg', width: 305, ratio: '16_9' },
        { url: 'https://img/b.jpg', width: 1024, ratio: '16_9' },
        { url: 'https://img/s.jpg', width: 2048, ratio: '3_2' },
      ],
      priceRanges: [{ min: 450.5, currency: 'TRY' }],
      classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' }, subGenre: { name: 'Undefined' } }],
      _embedded: {
        venues: [{ id: 'V9', name: 'Zorlu PSM', city: { name: 'Istanbul' }, location: { latitude: '41.0668', longitude: '29.0172' } }],
        attractions: [{ name: 'maNga' }],
      },
    };
    expect(mapTicketmaster(e)).toMatchObject({
      externalId: 'Z1',
      cancelled: true,
      priceFrom: 45_050,
      coverUrl: 'https://img/b.jpg',
      tags: ['Rock', 'Music'],
      performers: ['maNga'],
      venue: { externalId: 'V9', name: 'Zorlu PSM', city: 'Istanbul', district: null, lat: 41.0668 },
    });
    expect(mapTicketmaster({ ...e, dates: { start: { localDate: '2030-12-01' } } })).toBeNull();
  });
});

describe('içe aktarma', () => {
  let ctx: TestContext;
  let ingest: IngestService;
  let seed: Awaited<ReturnType<typeof seedBasics>>;
  const admin = { 'X-Admin-Key': ADMIN_KEY };
  const at = (ms: number) => new Date(Date.now() + ms);
  const ext = (o: Partial<ExternalEvent> & { externalId: string }): ExternalEvent => ({
    url: null,
    title: 'Etkinlik',
    description: null,
    startsAt: at(10 * DAY),
    endsAt: null,
    cancelled: false,
    isFree: false,
    priceFrom: null,
    ticketUrl: null,
    coverUrl: null,
    venue: { externalId: 'v1', name: 'Arkaoda', address: null, district: 'Kadıköy', city: 'İstanbul', lat: 40.9878, lng: 29.0284 },
    tags: ['Konser'],
    performers: [],
    ...o,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    ingest = ctx.get(IngestService);
  });
  afterAll(() => ctx.app.close());
  beforeEach(async () => {
    await resetDb(ctx.prisma);
    seed = await seedBasics(ctx.prisma);
    await ctx.prisma.tagGenreMap.create({ data: { tag: 'rock', genreId: seed.rock.id, weight: 1 } });
    await ctx.prisma.venue.update({ where: { id: seed.venue.id }, data: { lat: 41.0316, lng: 28.9752 } });
    ctx.get(ArtistsService).invalidate();
    ctx.ticketmaster.events = [];
  });

  it('yeni mekân ve etkinlik açar: tür etiketten ve sanatçıdan, sanatçı başlıktan, satıcı linkten; takipçilere duyurulacak', async () => {
    const { counts } = await ingest.importEvents('ETKINLIKIO', [
      ext({ externalId: '1', title: 'Duman Konseri', tags: ['Konser'], ticketUrl: 'https://www.biletix.com/e/1', priceFrom: 0, isFree: true }),
      ext({ externalId: '2', title: 'Gece Rock Partisi', tags: ['Rock'] }),
    ]);
    expect(counts).toEqual({ fetched: 2, created: 2, updated: 0, merged: 0, skipped: 0 });

    const venue = await ctx.prisma.venue.findUniqueOrThrow({ where: { slug: 'arkaoda' } });
    expect(venue).toMatchObject({ source: 'IMPORT', district: 'Kadıköy' });
    const events = await ctx.prisma.event.findMany({ where: { source: 'IMPORT' }, include: { genres: true, artists: { include: { artist: true } } }, orderBy: { title: 'asc' } });
    expect(events.map((e) => [e.title, e.status, e.genres.map((g) => g.slug), e.artists.map((a) => a.artist.slug), e.fanoutAt])).toEqual([
      ['Duman Konseri', 'PUBLISHED', ['rock'], ['duman'], null], // tür sanatçıdan
      ['Gece Rock Partisi', 'PUBLISHED', ['rock'], [], null], // tür etiketten
    ]);
    expect(events[0]).toMatchObject({ ticketProvider: 'BILETIX', isFree: true, venueId: venue.id });
    expect(await ctx.prisma.externalRef.count({ where: { source: 'ETKINLIKIO' } })).toBe(3); // 2 etkinlik + 1 mekân
  });

  it('aynı mekân, ±2 saat ve uyan başlık → mevcut etkinliğe bağlanır; mekân adla ya da ~100 m yakınlıkla eşlenir', async () => {
    const blindByCoords = { externalId: 'tm-blind', name: 'Blind Club Istanbul', address: null, district: null, city: 'Istanbul', lat: 41.0317, lng: 28.9753 };
    const { counts } = await ingest.importEvents('TICKETMASTER', [
      ext({ externalId: 'a', title: 'Duman Blind', startsAt: new Date(seed.events.soon.startsAt.getTime() + 60 * 60_000), venue: blindByCoords }),
    ]);
    expect(counts.merged).toBe(1);
    expect(await ctx.prisma.event.count()).toBe(3); // seedBasics'teki 3 etkinlik, yeni yok
    expect(await ctx.prisma.externalRef.findFirst({ where: { externalId: 'a' } })).toMatchObject({ entityId: seed.events.soon.id });
    expect(await ctx.prisma.externalRef.findFirst({ where: { externalId: 'tm-blind' } })).toMatchObject({ entityType: 'venue', entityId: seed.venue.id });

    // Tekrar gelince "güncellendi" sayılır ama admin'in etkinliğine dokunulmaz
    const again = await ingest.importEvents('TICKETMASTER', [ext({ externalId: 'a', title: 'Duman Blind', priceFrom: 99_00, venue: blindByCoords })]);
    expect(again.counts.updated).toBe(1);
    expect((await ctx.prisma.event.findUniqueOrThrow({ where: { id: seed.events.soon.id } })).priceFrom).toBeNull();
  });

  it('içe aktarılan etkinlik sonraki turda güncellenir; iptal edilirse CANCELLED', async () => {
    await ingest.importEvents('TICKETMASTER', [ext({ externalId: 'x', title: 'maNga', performers: ['maNga'], priceFrom: 50_000 })]);
    await ingest.importEvents('TICKETMASTER', [ext({ externalId: 'x', title: 'maNga', performers: ['maNga'], priceFrom: 60_000, cancelled: true })]);
    const e = await ctx.prisma.event.findFirstOrThrow({ where: { source: 'IMPORT' }, include: { artists: true } });
    expect(e).toMatchObject({ priceFrom: 60_000, status: 'CANCELLED' });
    expect(e.artists.map((a) => a.artistId)).toEqual([seed.manga.id]);
  });

  it('İstanbul dışı, çevrim içi, geçmiş ve müzik dışı etkinlik alınmaz; alkol promosyonu REVIEW', async () => {
    const { counts } = await ingest.importEvents('ETKINLIKIO', [
      ext({ externalId: 'ankara', venue: { externalId: null, name: 'CSO Ada', address: null, district: 'Çankaya', city: 'Ankara', lat: null, lng: null } }),
      ext({ externalId: 'online', venue: null }),
      ext({ externalId: 'gecmis', startsAt: at(-DAY) }),
      ext({ externalId: 'tiyatro', title: 'Hamlet', tags: ['Tiyatro'] }),
      ext({ externalId: 'happy', title: 'Rock Gecesi', tags: ['Rock'], description: 'Happy hour 21:00–22:00' }),
    ]);
    expect(counts).toEqual({ fetched: 5, created: 1, updated: 0, merged: 0, skipped: 4 });
    expect(await ctx.prisma.event.findFirst({ where: { source: 'IMPORT' } })).toMatchObject({ title: 'Rock Gecesi', status: 'REVIEW' });
  });

  it('dryRun hiçbir şey yazmaz; admin ucu turu kaydeder, yalnız ADMIN çalıştırır, aynı anda ikinci tur 409', async () => {
    ctx.ticketmaster.events = [ext({ externalId: 'd1', title: 'Rock Akşamı', tags: ['Rock'] }), ext({ externalId: 'd2', title: 'Hamlet', tags: ['Tiyatro'] })];
    const dry = await ctx.http().post('/v1/admin/imports/TICKETMASTER/run?dryRun=1').set(admin).expect(200);
    expect(dry.body).toMatchObject({ source: 'TICKETMASTER', dryRun: true, fetched: 2, created: 1, skipped: 1 });
    expect(await ctx.prisma.event.count({ where: { source: 'IMPORT' } })).toBe(0);
    expect(await ctx.prisma.venue.count({ where: { source: 'IMPORT' } })).toBe(0);

    const real = await ctx.http().post('/v1/admin/imports/TICKETMASTER/run').set(admin).expect(200);
    expect(real.body).toMatchObject({ dryRun: false, created: 1, errors: null });
    expect(real.body.finishedAt).toBeTruthy();

    const list = (await ctx.http().get('/v1/admin/imports').set(admin).expect(200)).body;
    expect(list.enabled).toEqual(['TICKETMASTER']); // Etkinlik.io token'ı yok
    expect(list.runs).toHaveLength(2);
    expect(await ctx.prisma.auditLog.count({ where: { action: 'import.run' } })).toBe(2);

    await ctx.http().post('/v1/admin/imports/ETKINLIKIO/run').set(admin).expect(400);
    await ctx.http().post('/v1/admin/imports/BILETIX/run').set(admin).expect(400);
    await ctx.http().post('/v1/admin/imports/YOK/run').set(admin).expect(400);
    const editor = await loginAs(ctx, 'editor@ornek.com', 'EDITOR');
    await ctx.http().get('/v1/admin/imports').set(editor.auth).expect(403);

    await ctx.prisma.importRun.create({ data: { source: 'TICKETMASTER' } });
    await ctx.http().post('/v1/admin/imports/TICKETMASTER/run').set(admin).expect(409);
  });
});
