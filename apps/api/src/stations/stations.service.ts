import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenresService } from '../genres/genres.service';

export type StationDto = {
  id: string;
  name: string;
  streamUrl: string;
  country: string | null;
  logoUrl: string | null;
  hasMetadata: boolean;
  curated: boolean;
};

type RadioBrowserStation = {
  stationuuid: string;
  name: string;
  url_resolved: string;
  countrycode: string;
  favicon: string;
  hls: number;
};

// radio-browser.info topluluk API'si — birkaç ayna sunucu, biri düşerse sıradakine geç.
const MIRRORS = ['de1.api.radio-browser.info', 'de2.api.radio-browser.info', 'fi1.api.radio-browser.info'];
const TTL = 10 * 60_000;

@Injectable()
export class StationsService {
  private readonly logger = new Logger(StationsService.name);
  private readonly cache = new Map<string, { at: number; data: StationDto[] }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly genres: GenresService,
  ) {}

  /** Türün küratörlü istasyonları + (more=true ise) radio-browser'dan ek istasyonlar. */
  async byGenre(slug: string, more = false): Promise<StationDto[]> {
    const genre = await this.genres.get(slug);
    const rows = await this.prisma.station.findMany({
      where: { genreId: genre.id },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
    const curated: StationDto[] = rows.map((s) => ({
      id: s.id,
      name: s.name,
      streamUrl: s.streamUrl,
      country: s.country,
      logoUrl: s.logoUrl,
      hasMetadata: s.hasMetadata,
      curated: true,
    }));
    if (!more) return curated;

    const extra = await this.search({ tag: genre.radioTag, limit: 20 });
    const seen = new Set(curated.map((s) => s.streamUrl));
    return [...curated, ...extra.filter((s) => !seen.has(s.streamUrl))];
  }

  async search(opts: { tag?: string; q?: string; country?: string; limit?: number }): Promise<StationDto[]> {
    const params = new URLSearchParams({
      hidebroken: 'true',
      is_https: 'true', // iOS ATS: yalnız HTTPS yayınlar
      order: 'clickcount',
      reverse: 'true',
      limit: String(Math.min(opts.limit ?? 20, 50)),
    });
    if (opts.tag) params.set('tag', opts.tag);
    if (opts.q) params.set('name', opts.q);
    if (opts.country) params.set('countrycode', opts.country);
    if (!opts.tag && !opts.q && !opts.country) return [];

    const key = params.toString();
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < TTL) return hit.data;

    const raw = await this.fetchFromMirrors(`/json/stations/search?${key}`);
    const seenNames = new Set<string>();
    const data: StationDto[] = [];
    for (const s of raw) {
      const name = s.name.trim();
      if (!s.url_resolved || seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());
      data.push({
        id: `rb:${s.stationuuid}`,
        name: name.slice(0, 60),
        streamUrl: s.url_resolved,
        country: s.countrycode || null,
        logoUrl: s.favicon || null,
        hasMetadata: !s.hls && !/\.m3u8(\?|$)/i.test(s.url_resolved),
        curated: false,
      });
    }
    this.cache.set(key, { at: Date.now(), data });
    return data;
  }

  private async fetchFromMirrors(path: string): Promise<RadioBrowserStation[]> {
    for (const host of MIRRORS) {
      try {
        const res = await fetch(`https://${host}${path}`, {
          headers: { 'User-Agent': 'Playce/0.1' },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) return (await res.json()) as RadioBrowserStation[];
      } catch (e) {
        this.logger.warn(`radio-browser ${host} başarısız: ${(e as Error).message}`);
      }
    }
    return [];
  }
}
