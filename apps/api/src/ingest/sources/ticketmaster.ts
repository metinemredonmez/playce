import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env';
import { ExternalEvent, IngestSource, num } from '../types';

const API = 'https://app.ticketmaster.com/discovery/v2/events.json';
const PAGE = 200;
/** Discovery API derin sayfalama sınırı: size × page < 1000 */
const MAX_EVENTS = 1000;

type TmName = { name?: string };
export type TmEvent = {
  id: string;
  name: string;
  url?: string;
  info?: string;
  dates?: { start?: { dateTime?: string; localDate?: string }; end?: { dateTime?: string }; status?: { code?: string } };
  images?: { url: string; width?: number; ratio?: string }[];
  priceRanges?: { min?: number; currency?: string }[];
  classifications?: { segment?: TmName; genre?: TmName; subGenre?: TmName }[];
  _embedded?: {
    venues?: { id: string; name: string; address?: { line1?: string }; city?: TmName; location?: { latitude?: string; longitude?: string } }[];
    attractions?: { name: string }[];
  };
};

/** Ticketmaster Discovery v2 etkinliği → ExternalEvent. Saatsiz (yalnız tarih) etkinlikler alınmaz. */
export function mapTicketmaster(e: TmEvent): ExternalEvent | null {
  const start = e.dates?.start?.dateTime;
  if (!start) return null;
  const v = e._embedded?.venues?.[0];
  const price = e.priceRanges?.find((p) => (p.currency ?? 'TRY') === 'TRY' && p.min !== undefined);
  // En geniş 16:9 görsel
  const image = [...(e.images ?? [])].filter((i) => i.ratio === '16_9').sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0] ?? e.images?.[0];
  const c = e.classifications?.[0];
  return {
    externalId: e.id,
    url: e.url ?? null,
    title: e.name.trim(),
    description: e.info?.trim() || null,
    startsAt: new Date(start),
    endsAt: e.dates?.end?.dateTime ? new Date(e.dates.end.dateTime) : null,
    cancelled: e.dates?.status?.code === 'cancelled',
    isFree: price?.min === 0,
    priceFrom: price?.min !== undefined ? Math.round(price.min * 100) : null,
    ticketUrl: e.url ?? null,
    coverUrl: image?.url ?? null,
    venue: v
      ? {
          externalId: v.id,
          name: v.name.trim(),
          address: v.address?.line1 ?? null,
          district: null,
          city: v.city?.name ?? null,
          lat: num(v.location?.latitude),
          lng: num(v.location?.longitude),
        }
      : null,
    tags: [c?.genre?.name, c?.subGenre?.name, c?.segment?.name].filter((t): t is string => !!t && t !== 'Undefined'),
    performers: (e._embedded?.attractions ?? []).map((a) => a.name),
  };
}

/** Biletix verisi Ticketmaster'da mı? (TICKETMASTER_API_KEY; countryCode=TR, yalnız müzik) */
@Injectable()
export class TicketmasterSource implements IngestSource {
  readonly source = 'TICKETMASTER' as const;
  private readonly log = new Logger('Ticketmaster');
  private readonly key: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.key = config.get('TICKETMASTER_API_KEY', { infer: true });
  }

  get enabled() {
    return !!this.key;
  }

  async fetch(now: Date): Promise<ExternalEvent[]> {
    const out: ExternalEvent[] = [];
    for (let page = 0; page * PAGE < MAX_EVENTS; page++) {
      const params = new URLSearchParams({
        apikey: this.key!,
        countryCode: 'TR',
        classificationName: 'music',
        startDateTime: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        sort: 'date,asc',
        size: String(PAGE),
        page: String(page),
      });
      const res = await fetch(`${API}?${params}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`Ticketmaster: HTTP ${res.status}`);
      const body = (await res.json()) as { _embedded?: { events?: TmEvent[] }; page?: { totalPages?: number } };
      for (const e of body._embedded?.events ?? []) {
        const mapped = mapTicketmaster(e);
        if (mapped) out.push(mapped);
      }
      if (page + 1 >= (body.page?.totalPages ?? 0)) break;
    }
    this.log.log(`${out.length} etkinlik alındı (TR, müzik)`);
    return out;
  }
}
