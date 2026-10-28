// Türkçe karakterleri katlayıp karşılaştırılabilir hale getirir:
// "Dedublüman" → "dedubluman", "MOR VE ÖTESİ" → "mor ve otesi".
// Veritabanındaki playce_norm() (arama tetikleyicisi) ile aynı sonucu vermeli; ikisini birlikte değiştir.
const FOLD: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u',
  // NFD ile ayrışmayan harfler (unaccent'teki karşılıkları)
  ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ł: 'l', đ: 'd',
};

export function normalize(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîûøæœßłđ]/g, (c) => FOLD[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function slugify(s: string): string {
  return normalize(s).replace(/\s+/g, '-');
}

/** URL'de kullanılan slug biçimi: "kuzu-kuzu", "babylon-bomonti" */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
