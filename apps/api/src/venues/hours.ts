import { trWeekdayMinutes } from '../common/time';

export type Hours = { weekday: number; opensAt: string; closesAt: string };

/** "HH:MM" → gün içi dakika */
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));

/**
 * İstanbul saatiyle şu an açık mı ve ne zamana kadar.
 * Kapanış ≤ açılış ise aralık ertesi güne taşar (Cuma 23:00–05:00 → Cumartesi 05:00'e kadar);
 * bu yüzden dünün gece yarısını aşan aralığına da bakılır. Saat girilmemişse null (bilinmiyor).
 */
export function openStatus(hours: Hours[], now = new Date()): { openNow: boolean | null; openUntil: string | null } {
  if (!hours.length) return { openNow: null, openUntil: null };
  const { weekday, minute } = trWeekdayMinutes(now);
  const today = hours.find((h) => h.weekday === weekday);
  const yesterday = hours.find((h) => h.weekday === (weekday + 6) % 7);

  if (yesterday && minutes(yesterday.closesAt) <= minutes(yesterday.opensAt) && minute < minutes(yesterday.closesAt)) {
    return { openNow: true, openUntil: yesterday.closesAt };
  }
  if (today) {
    const open = minutes(today.opensAt);
    const close = minutes(today.closesAt);
    const overnight = close <= open;
    if (minute >= open && (overnight || minute < close)) return { openNow: true, openUntil: today.closesAt };
  }
  return { openNow: false, openUntil: null };
}

/** Pazartesiden başlayan haftalık liste (uygulamada gösterim sırası). */
export function weekFromMonday<T extends { weekday: number }>(hours: T[]): T[] {
  return [...hours].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
}
