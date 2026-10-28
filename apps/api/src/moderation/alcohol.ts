import { normalize } from '../common/text';

/**
 * Alkol mevzuatı ön denetimi (7584 sayılı Kanun, ADR-015): metinde alkol promosyonu ya da marka varsa
 * içerik yayınlanmaz, moderasyona (REVIEW) düşer. "Kokteyl bar" gibi tür bilgisi serbest; kampanya, bedava/sınırsız
 * içki, happy hour ve marka adı değil. Son karar moderatörde — liste kaba ve bilerek temkinli.
 * Desenler normalize() edilmiş metinde aranır (küçük harf, Türkçe karakter katlanmış, noktalama boşluk).
 */
// Türkçe ekleriyle: içkisi, birası, şarabı, rakısı, kokteyli, shotlar…
const DRINK =
  '(?:icki(?:si|ler|leri)?|alkol(?:lu)?|bira(?:si|lar|lari)?|sarap|sarabi|raki(?:si)?|kokteyl(?:i|ler|leri)?|' +
  'shot(?:u|lar|lari)?|viski(?:si)?|votka(?:si)?|tekila(?:si)?|cin tonik|drinks?|beers?|cocktails?|wine|whiske?y|vodka|tequila)';
const FREE = '(?:bedava|ucretsiz|hediye|ikram|ikrami|free)';
const PROMO = '(?:kampanya|kampanyasi|kampanyali|indirim|indirimi|indirimli|promosyon|promosyonu)';

const RULES: [label: string, pattern: string][] = [
  ['happy hour', 'happy ?hour'],
  ['açık bar', '(?:open|acik) bar'],
  ['sınırsız içki', `(?:sinirsiz|limitsiz|unlimited) ${DRINK}`],
  ['içki dahil', `${DRINK} dahil`],
  ['bedava içki', `${FREE} ${DRINK}|${DRINK} ${FREE}|${DRINK} bizden`],
  ['içki kampanyası', `${PROMO} ${DRINK}|${DRINK} ${PROMO}`],
  ['X alana Y', '\\d+ alana \\d+|\\d+ al \\d+ (?:ode|bedava)'],
  ['hoş geldin içkisi', `welcome (?:drink|shot)s?|hos ?geldin ${DRINK}`],
  // Katı yorum (ADR-015): içki temalı gece tüketimi özendirir sayılır
  ['içki temalı gece', 'raki balik|bira festivali|beer fest(?:ival)?|sarap tadimi|wine tasting|kokteyl gecesi|cocktail night'],
  [
    'alkol markası',
    '(?:efes pilsen|efes malt|anadolu efes|tuborg|carlsberg|heineken|budweiser|corona extra|bomonti filtresiz|' +
      'yeni raki|tekirdag rakisi|efe raki|beylerbeyi raki|kulup rakisi|absolut vodka|smirnoff|jagermeister|' +
      'jack daniel ?s|johnnie walker|chivas regal|bacardi|kavaklidere|doluca)',
  ],
];

const COMPILED = RULES.map(([label, pattern]) => [label, new RegExp(`(?:^| )(?:${pattern})(?= |$)`)] as const);

/** Eşleşen kuralların etiketleri (boş = temiz). */
export function alcoholFlags(...texts: (string | null | undefined)[]): string[] {
  const text = normalize(texts.filter(Boolean).join(' \n '));
  return COMPILED.filter(([, re]) => re.test(text)).map(([label]) => label);
}
