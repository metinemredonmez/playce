import { ExternalSource } from '@prisma/client';

/** Kaynaktan bağımsız etkinlik — her kaynak kendi yanıtını buna çevirir, gerisini IngestService yapar. */
export type ExternalEvent = {
  externalId: string;
  url: string | null;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  cancelled: boolean;
  isFree: boolean;
  /** Kuruş */
  priceFrom: number | null;
  ticketUrl: string | null;
  coverUrl: string | null;
  /** null = çevrim içi etkinlik (alınmaz) */
  venue: ExternalVenue | null;
  /** Kategori, format, etiket, tür adları → TagGenreMap ile Playce türlerine */
  tags: string[];
  /** Sahne alanlar (kaynak veriyorsa); vermiyorsa başlıktan eşlenir */
  performers: string[];
};

export type ExternalVenue = {
  externalId: string | null;
  name: string;
  address: string | null;
  district: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

export interface IngestSource {
  readonly source: ExternalSource;
  /** Anahtar tanımlı mı (değilse gece işi bu kaynağı atlar) */
  readonly enabled: boolean;
  /** İstanbul'daki yaklaşan etkinlikler (kaynak sınırına kadar) */
  fetch(now: Date): Promise<ExternalEvent[]>;
}

/** Kaynak listelerinde sayı alanları metin olabilir ("41.03") */
export function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/** HTML içerikten düz metin (açıklama alanı için) */
export function plainText(html: string | null | undefined, max = 4000): string | null {
  if (!html) return null;
  const text = html
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<(br|\/div|\/li)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
  return text ? text.slice(0, max) : null;
}
