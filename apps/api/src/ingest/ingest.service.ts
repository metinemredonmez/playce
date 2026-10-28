import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { ExternalSource, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ArtistsService } from '../artists/artists.service';
import { normalize, slugify } from '../common/text';
import { trDateKey } from '../common/time';
import { distanceKm } from '../common/geo';
import { ticketProviderFor } from '../common/tickets';
import { alcoholFlags } from '../moderation/alcohol';
import { EtkinlikIoSource } from './sources/etkinlikio';
import { TicketmasterSource } from './sources/ticketmaster';
import { ExternalEvent, ExternalVenue, IngestSource } from './types';

const HOUR_MS = 60 * 60 * 1000;
/** Aynı mekânda bu kadar yakın saatte, başlığı uyan etkinlik aynı sayılır (03 §7) */
const SAME_EVENT_WINDOW_MS = 2 * HOUR_MS;
/** Koordinatı bu kadar yakın mekân aynı sayılır */
const SAME_VENUE_KM = 0.1;
/** Bitmemiş tur bu süreden eskiyse takılmış sayılır, yenisi başlayabilir */
const STALE_RUN_MS = 30 * 60_000;
const MAX_ERRORS = 20;
/** Etiket eşlemesi zayıfsa (ör. yalnız "Konser") müzik etkinliği yine alınır */
const MUSIC_WORDS = ['konser', 'muzik', 'festival', 'parti', 'dj', 'music', 'concert', 'gig'];

export type ImportCounts = { fetched: number; created: number; updated: number; merged: number; skipped: number };
type RunError = { externalId: string; message: string };
type VenueRow = { id: string; name: string; key: string; lat: number | null; lng: number | null };

/**
 * Dış kaynaklardan etkinlik içe aktarma (ADR-017: kazıma yok, yalnız resmi API).
 * Her etkinlik için: ExternalRef varsa güncelle; yoksa mekânı bul/aç, aynı etkinlik (mekân + ±2 saat + başlık)
 * zaten varsa yalnız ExternalRef ekle; yoksa yeni etkinlik aç. Türler etiketlerden (TagGenreMap) ve eşleşen
 * sanatçılardan gelir. Alkol denetimine takılan etkinlik REVIEW'a düşer. Yalnız İstanbul ve müzik.
 */
@Injectable()
export class IngestService {
  private readonly log = new Logger('Ingest');
  private readonly sources: Map<ExternalSource, IngestSource>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly artists: ArtistsService,
    etkinlikio: EtkinlikIoSource,
    ticketmaster: TicketmasterSource,
  ) {
    this.sources = new Map<ExternalSource, IngestSource>([etkinlikio, ticketmaster].map((s) => [s.source, s]));
  }

  /** Anahtarı tanımlı kaynaklar (gece işi bunları çalıştırır) */
  enabledSources(): ExternalSource[] {
    return [...this.sources.values()].filter((s) => s.enabled).map((s) => s.source);
  }

  async run(source: ExternalSource, opts: { dryRun?: boolean; now?: Date } = {}) {
    const src = this.sources.get(source);
    if (!src) throw new BadRequestException(`İçe aktarma kaynağı değil: ${source}`);
    if (!src.enabled) throw new BadRequestException(`${source} için anahtar tanımlı değil (.env)`);
    const now = opts.now ?? new Date();
    const busy = await this.prisma.importRun.findFirst({
      where: { source, finishedAt: null, startedAt: { gt: new Date(now.getTime() - STALE_RUN_MS) } },
    });
    if (busy) throw new ConflictException(`${source} için bir tur zaten sürüyor`);

    const run = await this.prisma.importRun.create({ data: { source, dryRun: !!opts.dryRun, startedAt: now } });
    try {
      const events = await src.fetch(now);
      const { counts, errors } = await this.importEvents(source, events, { dryRun: opts.dryRun, now });
      return this.prisma.importRun.update({
        where: { id: run.id },
        data: { ...counts, finishedAt: new Date(), errors: errors.length ? errors : Prisma.DbNull },
      });
    } catch (e) {
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), errors: [{ externalId: '-', message: (e as Error).message }] },
      });
      throw e;
    }
  }

  /** Eşlenmiş etkinlikleri yazar (dryRun: yalnız sayar). Kaynaktan bağımsız; testler doğrudan çağırır. */
  async importEvents(source: ExternalSource, events: ExternalEvent[], opts: { dryRun?: boolean; now?: Date } = {}) {
    const now = opts.now ?? new Date();
    const counts: ImportCounts = { fetched: events.length, created: 0, updated: 0, merged: 0, skipped: 0 };
    const errors: RunError[] = [];
    const ctx = { venues: await this.loadVenues(), tags: await this.loadTagMap() };

    for (const e of events) {
      try {
        const outcome = await this.importOne(source, e, ctx, now, !!opts.dryRun);
        counts[outcome]++;
      } catch (err) {
        counts.skipped++;
        if (errors.length < MAX_ERRORS) errors.push({ externalId: e.externalId, message: (err as Error).message.slice(0, 300) });
      }
    }
    if (counts.created || counts.updated || counts.merged) this.log.log(`${source}: ${JSON.stringify(counts)}`);
    return { counts, errors };
  }

  private async importOne(
    source: ExternalSource,
    e: ExternalEvent,
    ctx: { venues: VenueRow[]; tags: Map<string, { genreId: string; weight: number }[]> },
    now: Date,
    dryRun: boolean,
  ): Promise<keyof Omit<ImportCounts, 'fetched'>> {
    if (!e.venue || normalize(e.venue.city ?? 'istanbul') !== 'istanbul' || e.startsAt < now || !e.title) return 'skipped';

    const ref = await this.prisma.externalRef.findUnique({
      where: { source_entityType_externalId: { source, entityType: 'event', externalId: e.externalId } },
    });
    if (ref) {
      if (!dryRun) await this.refresh(ref.entityId, e);
      return 'updated';
    }

    const performers = await this.matchPerformers(e);
    const genreIds = this.genresFor(e.tags, ctx.tags);
    const isMusic = genreIds.length > 0 || performers.length > 0 || e.tags.some((t) => MUSIC_WORDS.some((w) => normalize(t).includes(w)));
    if (!isMusic) return 'skipped';
    if (dryRun) return 'created';

    const venueId = await this.resolveVenue(source, e.venue, ctx.venues);
    const duplicate = await this.findDuplicate(venueId, e);
    if (duplicate) {
      await this.addRef(source, 'event', e.externalId, duplicate, e.url);
      return 'merged';
    }

    const flagged = alcoholFlags(e.title, e.description).length > 0;
    const artistGenres = performers.length
      ? await this.prisma.genre.findMany({ where: { artists: { some: { id: { in: performers.map((p) => p.id) } } } }, select: { id: true } })
      : [];
    const event = await this.prisma.event.create({
      data: {
        slug: await this.uniqueEventSlug(e.title, e.startsAt),
        title: e.title.slice(0, 140),
        description: e.description,
        coverUrl: e.coverUrl,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        isFree: e.isFree,
        priceFrom: e.priceFrom,
        ticketUrl: e.ticketUrl,
        ticketProvider: ticketProviderFor(e.ticketUrl),
        status: e.cancelled ? 'CANCELLED' : flagged ? 'REVIEW' : 'PUBLISHED',
        source: 'IMPORT',
        venueId,
        genres: { connect: [...new Set([...genreIds, ...artistGenres.map((g) => g.id)])].slice(0, 4).map((id) => ({ id })) },
        artists: { create: performers.map((p, sort) => ({ artistId: p.id, sort })) },
      },
    });
    await this.addRef(source, 'event', e.externalId, event.id, e.url);
    return 'created';
  }

  /** İçe aktarılmış etkinliğin değişebilen alanları. Admin'in açtığı/düzenlediği kayda (source ≠ IMPORT) dokunulmaz. */
  private async refresh(eventId: string, e: ExternalEvent) {
    const current = await this.prisma.event.findUnique({ where: { id: eventId }, select: { source: true, status: true, coverUrl: true } });
    if (!current || current.source !== 'IMPORT') return;
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        isFree: e.isFree,
        ...(e.priceFrom !== null ? { priceFrom: e.priceFrom } : {}),
        ...(e.ticketUrl ? { ticketUrl: e.ticketUrl, ticketProvider: ticketProviderFor(e.ticketUrl) } : {}),
        ...(!current.coverUrl && e.coverUrl ? { coverUrl: e.coverUrl } : {}),
        ...(e.cancelled ? { status: 'CANCELLED' as const } : {}),
      },
    });
  }

  /** Kaynak mekân kimliği → ad (normalize) → ~100 m içindeki mekân; hiçbiri değilse yeni mekân (source IMPORT). */
  private async resolveVenue(source: ExternalSource, v: ExternalVenue, venues: VenueRow[]) {
    if (v.externalId) {
      const ref = await this.prisma.externalRef.findUnique({
        where: { source_entityType_externalId: { source, entityType: 'venue', externalId: v.externalId } },
      });
      if (ref) return ref.entityId;
    }
    const key = normalize(v.name);
    const near = (r: VenueRow) =>
      v.lat !== null && v.lng !== null && r.lat !== null && r.lng !== null && distanceKm({ lat: v.lat, lng: v.lng }, { lat: r.lat, lng: r.lng }) <= SAME_VENUE_KM;
    let venue = venues.find((r) => r.key === key) ?? venues.find(near);
    if (!venue) {
      const row = await this.prisma.venue.create({
        data: {
          slug: await this.uniqueVenueSlug(v.name),
          name: v.name.slice(0, 120),
          // Kaynak semt vermiyorsa (Ticketmaster) şehir; admin düzeltir
          district: v.district ?? 'İstanbul',
          address: v.address,
          lat: v.lat,
          lng: v.lng,
          source: 'IMPORT',
        },
        select: { id: true, name: true, lat: true, lng: true },
      });
      venue = { ...row, key };
      venues.push(venue);
    }
    if (v.externalId) await this.addRef(source, 'venue', v.externalId, venue.id, null);
    return venue.id;
  }

  /** Aynı mekân, ±2 saat ve başlık aynı ya da biri diğerini içeriyor ("Duman" ↔ "Duman Konseri") */
  private async findDuplicate(venueId: string, e: ExternalEvent) {
    const candidates = await this.prisma.event.findMany({
      where: {
        venueId,
        startsAt: { gte: new Date(e.startsAt.getTime() - SAME_EVENT_WINDOW_MS), lte: new Date(e.startsAt.getTime() + SAME_EVENT_WINDOW_MS) },
      },
      select: { id: true, title: true },
    });
    const a = normalize(e.title);
    return candidates.find((c) => {
      const b = normalize(c.title);
      const [short, long] = a.length <= b.length ? [a, b] : [b, a];
      return a === b || (short.length >= 4 && long.includes(short));
    })?.id;
  }

  /** Kaynak sahne alanları veriyorsa onları, vermiyorsa başlıktaki sanatçıyı eşler. */
  private async matchPerformers(e: ExternalEvent) {
    const found = e.performers.length
      ? await Promise.all(e.performers.map((p) => this.artists.match(p, p)))
      : [await this.artists.match(null, e.title)];
    const seen = new Set<string>();
    return found.filter((a): a is NonNullable<typeof a> => !!a && !seen.has(a.id) && !!seen.add(a.id));
  }

  /** Etiket ağırlıkları toplanır; 0,5 ve üstü türler (en fazla 3) */
  private genresFor(tags: string[], map: Map<string, { genreId: string; weight: number }[]>) {
    const score = new Map<string, number>();
    for (const tag of tags) {
      for (const { genreId, weight } of map.get(normalize(tag)) ?? []) score.set(genreId, (score.get(genreId) ?? 0) + weight);
    }
    return [...score.entries()]
      .filter(([, s]) => s >= 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
  }

  private async loadVenues(): Promise<VenueRow[]> {
    const rows = await this.prisma.venue.findMany({ select: { id: true, name: true, lat: true, lng: true } });
    return rows.map((r) => ({ ...r, key: normalize(r.name) }));
  }

  private async loadTagMap() {
    const rows = await this.prisma.tagGenreMap.findMany();
    const map = new Map<string, { genreId: string; weight: number }[]>();
    for (const r of rows) map.set(r.tag, [...(map.get(r.tag) ?? []), { genreId: r.genreId, weight: r.weight }]);
    return map;
  }

  private addRef(source: ExternalSource, entityType: string, externalId: string, entityId: string, url: string | null) {
    return this.prisma.externalRef.upsert({
      where: { source_entityType_externalId: { source, entityType, externalId } },
      create: { source, entityType, externalId, entityId, url },
      update: { entityId, url, syncedAt: new Date() },
    });
  }

  private async uniqueEventSlug(title: string, startsAt: Date) {
    return this.uniqueSlug(`${slugify(title).slice(0, 60).replace(/-+$/, '') || 'etkinlik'}-${trDateKey(startsAt)}`, (slug) =>
      this.prisma.event.count({ where: { slug } }),
    );
  }

  private async uniqueVenueSlug(name: string) {
    return this.uniqueSlug(slugify(name).slice(0, 60).replace(/-+$/, '') || 'mekan', (slug) => this.prisma.venue.count({ where: { slug } }));
  }

  private async uniqueSlug(base: string, exists: (slug: string) => Promise<number>) {
    for (let n = 1; ; n++) {
      const slug = n === 1 ? base : `${base}-${n}`;
      if (!(await exists(slug))) return slug;
    }
  }

  /** Admin listesi: son turlar */
  runs(limit = 30) {
    return this.prisma.importRun.findMany({ orderBy: { startedAt: 'desc' }, take: Math.min(Math.max(limit, 1), 100) });
  }
}
