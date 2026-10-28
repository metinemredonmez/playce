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
