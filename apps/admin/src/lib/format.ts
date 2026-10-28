// İstanbul sabit UTC+3 (API ve mobil ile aynı kural; Intl saat dilimine güvenilmez).
const TR_OFFSET_MS = 3 * 60 * 60 * 1000;
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/** "1 Kas Cum 21:00" */
export function trDateTime(iso: string | Date): string {
  const l = new Date(new Date(iso).getTime() + TR_OFFSET_MS);
  const hh = String(l.getUTCHours()).padStart(2, '0');
  const mm = String(l.getUTCMinutes()).padStart(2, '0');
  return `${l.getUTCDate()} ${MONTHS[l.getUTCMonth()]} ${DAYS[l.getUTCDay()]} ${hh}:${mm}`;
}

/** "3 dk önce", "2 sa önce", "5 gün önce" */
export function ago(iso: string | Date): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'az önce';
  if (s < 3600) return `${Math.round(s / 60)} dk önce`;
  if (s < 86_400) return `${Math.round(s / 3600)} sa önce`;
  return `${Math.round(s / 86_400)} gün önce`;
}

/** <input type="datetime-local"> değeri ("2030-11-01T21:00", İstanbul saati) ← ISO */
export function toTrInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() + TR_OFFSET_MS).toISOString().slice(0, 16);
}

/** İstanbul saatiyle girilen "2030-11-01T21:00" → "2030-11-01T21:00:00+03:00" (API UTC saklar) */
export function fromTrInput(local: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local) ? `${local}:00+03:00` : null;
}

/** Kuruş → form değeri: 45000 → "450", 45050 → "450,50" */
export function kurusToInput(k: number | null | undefined): string {
  if (k == null) return '';
  return k % 100 === 0 ? String(k / 100) : (k / 100).toFixed(2).replace('.', ',');
}

/** Form değeri → kuruş ("450" / "450,50" / "1.250"). Boş = null, geçersiz = NaN. */
export function inputToKurus(v: string): number | null {
  const s = v.trim().replace(/\s|₺|TL/gi, '');
  if (!s) return null;
  const n = Number(s.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

/** 45000 → "450 ₺" */
export function tl(k: number): string {
  return `${(k / 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
}
