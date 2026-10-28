import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env';
import { ExternalEvent, IngestSource, num, plainText } from '../types';

const API = 'https://etkinlik.io/api/v2';
const PAGE = 50;
/** Bir turda en fazla bu kadar etkinlik (yaklaşan ~3 ay İstanbul için yeterli) */
const MAX_EVENTS = 1500;
const HORIZON_DAYS = 90;

type EtkName = { id: number; name: string; slug: string };
type EtkVenue = {
  id?: number;
  name: string;
  address?: string | null;
  lat?: string | null;
  lng?: string | null;
  district?: EtkName | null;
  city?: EtkName | null;
  district_name?: string | null;
  city_name?: string | null;
};
export type EtkEvent = {
  id: number;
  name: string;
  url: string;
  content?: string | null;
  start_r001: string;
  end_r001?: string | null;
  is_free: boolean;
  poster_url?: string | null;
  ticket_url?: string | null;
  format?: EtkName | null;
  category?: EtkName | null;
  tags?: EtkName[];
  venue_type: 'VENUE' | 'ONLINE' | 'MANUAL';
  venue_data?: EtkVenue | null;
};

/** Etkinlik.io V2 etkinliği → ExternalEvent (alan adları resmi SDK 2.0.11'den). Fiyat vermez, yalnız is_free. */
export function mapEtkinlikIo(e: EtkEvent): ExternalEvent {
  const v = e.venue_data;
  return {
    externalId: String(e.id),
    url: e.url ?? null,
    title: e.name.trim(),
    description: plainText(e.content),
    startsAt: new Date(e.start_r001),
    endsAt: e.end_r001 ? new Date(e.end_r001) : null,
    cancelled: false,
    isFree: !!e.is_free,
    priceFrom: e.is_free ? 0 : null,
    // ticket_url bilet yoksa etkinlik sayfasına yönlenir — o durumda bilet linki sayılmaz
    ticketUrl: e.ticket_url && e.ticket_url !== e.url ? e.ticket_url : null,
    coverUrl: e.poster_url ?? null,
    venue:
      e.venue_type === 'ONLINE' || !v
        ? null
        : {
            externalId: e.venue_type === 'VENUE' && v.id ? String(v.id) : null,
            name: v.name.trim(),
            address: v.address ?? null,
            district: v.district?.name ?? v.district_name ?? null,
            city: v.city?.name ?? v.city_name ?? null,
            lat: num(v.lat),
            lng: num(v.lng),
          },
    tags: [e.format?.name, e.category?.name, ...(e.tags ?? []).map((t) => t.name)].filter((t): t is string => !!t),
    performers: [],
  };
}

/** Türkiye etkinlik + mekân verisi (yayıncı ağı token'ı: ETKINLIKIO_TOKEN). */
@Injectable()
export class EtkinlikIoSource implements IngestSource {
  readonly source = 'ETKINLIKIO' as const;
  private readonly log = new Logger('EtkinlikIo');
  private readonly token: string | undefined;

  constructor(config: ConfigService<Env, true>) {
    this.token = config.get('ETKINLIKIO_TOKEN', { infer: true });
  }

  get enabled() {
    return !!this.token;
  }

  async fetch(now: Date): Promise<ExternalEvent[]> {
    const cities = await this.get<EtkName[]>('/cities');
    const istanbul = cities.find((c) => c.slug === 'istanbul');
    if (!istanbul) throw new Error('Etkinlik.io şehir listesinde istanbul yok');
    const fmt = (d: Date) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 19).replace('T', ' '); // İstanbul saati
    const out: ExternalEvent[] = [];
    for (let skip = 0; skip < MAX_EVENTS; skip += PAGE) {
      const page = await this.get<{ items: EtkEvent[]; meta: { total_count: number } }>('/events', {
        city_ids: String(istanbul.id),
        start_gte: fmt(now),
        end_lte: fmt(new Date(now.getTime() + HORIZON_DAYS * 86_400_000)),
        sort_by: 'upcoming',
        skip: String(skip),
        take: String(PAGE),
      });
      out.push(...page.items.map(mapEtkinlikIo));
      if (page.items.length < PAGE || skip + PAGE >= page.meta.total_count) break;
    }
    this.log.log(`${out.length} etkinlik alındı`);
    return out;
  }

  private async get<T>(path: string, query: Record<string, string> = {}): Promise<T> {
    const res = await fetch(`${API}${path}?${new URLSearchParams(query)}`, {
      headers: { 'X-Etkinlik-Token': this.token!, Accept: 'application/json', 'User-Agent': 'Playce/0.1' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`Etkinlik.io ${path}: HTTP ${res.status}`);
    return (await res.json()) as T;
  }
}
