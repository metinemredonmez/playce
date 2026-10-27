// İstanbul saatiyle (sabit UTC+3) tarih/fiyat biçimleri. Intl/timeZone desteğine güvenmemek için elle.
const TR = 3 * 3600_000;
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const tr = (d: Date | string) => new Date(new Date(d).getTime() + TR);
/** Gece 06:00'dan önce "bugün" hâlâ önceki gün (API ile aynı mantık). */
const nightKey = (d: Date | string) => {
  const t = new Date(tr(d).getTime() - 6 * 3600_000);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};

export function timeLabel(iso: string) {
  const d = tr(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function dayLabel(iso: string) {
  const diff = Math.round((nightKey(iso) - nightKey(new Date())) / 86_400_000);
  if (diff <= 0) return 'Bu gece';
  if (diff === 1) return 'Yarın';
  const d = tr(iso);
  if (diff < 7) return DAYS[d.getUTCDay()];
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function dateBadge(iso: string) {
  const d = tr(iso);
  return { day: String(d.getUTCDate()), month: MONTHS[d.getUTCMonth()].toUpperCase() };
}

export function fullDate(iso: string) {
  const d = tr(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${DAYS[d.getUTCDay()]} · ${timeLabel(iso)}`;
}

export function isLiveNow(startsAt: string, endsAt: string | null) {
  const now = Date.now();
  const end = endsAt ? new Date(endsAt).getTime() : new Date(startsAt).getTime() + 5 * 3600_000;
  return new Date(startsAt).getTime() <= now && now < end;
}

/** Kuruş → "₺1.250" / "Ücretsiz" / null */
export function price(kurus: number | null) {
  if (kurus === null) return null;
  if (kurus === 0) return 'Ücretsiz';
  const tl = Math.round(kurus / 100);
  return `₺${String(tl).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export const priceLevel = (n: number | null) => (n ? '₺'.repeat(n) : '');
