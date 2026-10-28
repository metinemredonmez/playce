import { ExternalSource } from '@prisma/client';

const SELLERS: [RegExp, ExternalSource][] = [
  [/(^|\.)biletix\.com$/, 'BILETIX'],
  [/(^|\.)passo\.com\.tr$/, 'PASSO'],
  [/(^|\.)bubilet\.com\.tr$/, 'BUBILET'],
  [/(^|\.)biletinial\.com$/, 'BILETINIAL'],
  [/(^|\.)mobilet\.com$/, 'MOBILET'],
  [/(^|\.)etkinlik\.io$/, 'ETKINLIKIO'],
  [/(^|\.)ticketmaster\.[a-z.]+$/, 'TICKETMASTER'],
];

/** Bilet linkinden satıcıyı çıkarır ("Biletix'ten al" düğmesi için); tanınmazsa null. */
export function ticketProviderFor(url: string | null | undefined): ExternalSource | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SELLERS.find(([re]) => re.test(host))?.[1] ?? null;
  } catch {
    return null;
  }
}
