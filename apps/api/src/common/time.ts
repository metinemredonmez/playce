// İstanbul sabit UTC+3 (2016'dan beri yaz saati yok). "Bu gece" / "hafta sonu" pencereleri buradan.
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Verilen anın İstanbul takvim gününün 00:00'ı (UTC Date olarak). */
function startOfTrDay(d: Date): Date {
  const local = new Date(d.getTime() + TR_OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TR_OFFSET_MS);
}

export type When = 'tonight' | 'weekend' | 'upcoming';

/**
 * Etkinlik başlangıç penceresi.
 * - tonight: bugün (gece 06:00'ya kadar sayılır — 02:00'de "bu gece" hâlâ dünkü gecedir)
 * - weekend: önümüzdeki Cuma 18:00 → Pazartesi 06:00 (hafta sonundaysak şu andan itibaren)
 * - upcoming: şu andan itibaren her şey
 * Başlamış ama bitmemiş etkinlikleri kaçırmamak için alt sınırdan 6 saat geri bakılır;
 * bitmiş olanlar servis tarafında endsAt ile elenir.
 */
export function windowFor(when: When, now = new Date()): { from: Date; to?: Date } {
  const lookBack = new Date(now.getTime() - 6 * HOUR);
  if (when === 'upcoming') return { from: lookBack };

  // Gece 06:00'dan önceyse "bugün" hâlâ önceki takvim günü.
  const ref = new Date(now.getTime() - 6 * HOUR);
  const day = startOfTrDay(ref);

  if (when === 'tonight') {
    return { from: lookBack, to: new Date(day.getTime() + DAY + 6 * HOUR) };
  }

  // weekend — 0=Pazar … 5=Cuma, 6=Cumartesi (İstanbul gününe göre)
  const dow = new Date(day.getTime() + TR_OFFSET_MS).getUTCDay();
  const daysToFriday = dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow;
  const friday = new Date(day.getTime() + daysToFriday * DAY);
  const from = new Date(Math.max(friday.getTime() + 18 * HOUR, lookBack.getTime()));
  const to = new Date(friday.getTime() + 3 * DAY + 6 * HOUR);
  return { from, to };
}

/** Bitiş saati girilmemiş etkinlik için varsayılan süre. */
export const DEFAULT_EVENT_HOURS = 5;
export const HOUR_MS = HOUR;
