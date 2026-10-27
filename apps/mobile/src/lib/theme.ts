// Playce tasarım dili: koyu sahne, iki vurgu rengi.
//   play  (pembe) → müzik / çalma
//   place (turkuaz) → mekân / şehir
export const C = {
  bg: '#0B0B10',
  card: '#15151E',
  card2: '#1D1D29',
  line: '#2A2A38',
  text: '#F4F4F8',
  dim: '#A1A1B5',
  faint: '#6B6B80',
  play: '#FF4D8D',
  place: '#2EE6C5',
  violet: '#7C5CFF',
  danger: '#FF5A5F',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const R = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

/** "#RRGGBB" + alfa (0-1) → "#RRGGBBAA" */
export function alpha(hex: string, a: number) {
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex.slice(0, 7)}${v}`;
}
