'use server';

import { refresh } from 'next/cache';
import { api, attempt } from '@/lib/api';
import type { ImportRun, ImportSource } from '@/lib/types';

/** dryRun: hiçbir şey yazmadan kaç etkinliğin geleceğini say. */
export async function runImport(source: ImportSource, dryRun: boolean) {
  const r = await attempt(() => api<ImportRun>(`/admin/imports/${source}/run${dryRun ? '?dryRun=1' : ''}`, { method: 'POST' }));
  refresh(); // başarısız tur da listeye düşer
  return r;
}
