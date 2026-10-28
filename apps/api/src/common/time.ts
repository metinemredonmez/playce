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

export type When = 'tonight' | 'tomorrow' | 'weekend' | 'upcoming';
export const WHENS: When[] = ['tonight', 'tomorrow', 'weekend', 'upcoming'];

/**
 * Etkinlik başlangıç penceresi.
 * - tonight: bugün (gece 06:00'ya kadar sayılır — 02:00'de "bu gece" hâlâ dünkü gecedir)
 * - tomorrow: yarın 06:00 → ertesi gün 06:00
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
  if (when === 'tomorrow') {
    return { from: new Date(day.getTime() + DAY + 6 * HOUR), to: new Date(day.getTime() + 2 * DAY + 6 * HOUR) };
  }

  // weekend — 0=Pazar … 5=Cuma, 6=Cumartesi (İstanbul gününe göre)
  const dow = new Date(day.getTime() + TR_OFFSET_MS).getUTCDay();
  const daysToFriday = dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow;
  const friday = new Date(day.getTime() + daysToFriday * DAY);
  const from = new Date(Math.max(friday.getTime() + 18 * HOUR, lookBack.getTime()));
  const to = new Date(friday.getTime() + 3 * DAY + 6 * HOUR);
  return { from, to };
}

/** Panelde "bugün": İstanbul günü 06:00 → ertesi gün 06:00 (gece yarısını geçen etkinlik o güne sayılır). */
export function trTodayWindow(now = new Date()): { from: Date; to: Date } {
  const day = startOfTrDay(new Date(now.getTime() - 6 * HOUR));
  return { from: new Date(day.getTime() + 6 * HOUR), to: new Date(day.getTime() + DAY + 6 * HOUR) };
}

/** Bitiş saati girilmemiş etkinlik için varsayılan süre. */
export const DEFAULT_EVENT_HOURS = 5;
export const HOUR_MS = HOUR;

/** İstanbul saatiyle 0–23. */
export function trHour(d: Date): number {
  return (d.getUTCHours() + 3) % 24;
}

/** İstanbul'da haftanın günü (0 = Pazar) ve gün içi dakika. */
export function trWeekdayMinutes(d: Date): { weekday: number; minute: number } {
  const l = new Date(d.getTime() + TR_OFFSET_MS);
  return { weekday: l.getUTCDay(), minute: l.getUTCHours() * 60 + l.getUTCMinutes() };
}

/** İstanbul takvim günü "YYYY-MM-DD" (günlük sınırlar için). */
export function trDateKey(d: Date): string {
  return new Date(d.getTime() + TR_OFFSET_MS).toISOString().slice(0, 10);
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Bildirim metinleri için: "1 Kasım Cumartesi 21:00" */
export function trDateTimeLabel(d: Date): string {
  const l = new Date(d.getTime() + TR_OFFSET_MS);
  const hh = String(l.getUTCHours()).padStart(2, '0');
  const mm = String(l.getUTCMinutes()).padStart(2, '0');
  return `${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]} ${DAYS[l.getUTCDay()]} ${hh}:${mm}`;
}

/** "21:00" */
export function trTimeLabel(d: Date): string {
  return trDateTimeLabel(d).slice(-5);
}

/**
 * Sessiz saatlerdeysek sessizliğin bittiği an, değilse null.
 * Aralık İstanbul saatiyle [start, end); gece yarısını aşabilir (23 → 8). start = end → sessiz saat yok.
 */
export function quietHoursEnd(now: Date, start: number, end: number): Date | null {
  if (start === end) return null;
  const h = trHour(now);
  const quiet = start < end ? h >= start && h < end : h >= start || h < end;
  if (!quiet) return null;
  const local = new Date(now.getTime() + TR_OFFSET_MS);
  local.setUTCHours(end, 0, 0, 0);
  if (local.getTime() <= now.getTime() + TR_OFFSET_MS) local.setUTCDate(local.getUTCDate() + 1);
  return new Date(local.getTime() - TR_OFFSET_MS);
}

/** "2026-11-01" İstanbul gününün başı; saatli ISO değer olduğu gibi. */
export function parseTrDate(s: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00+03:00`) : new Date(s);
}
