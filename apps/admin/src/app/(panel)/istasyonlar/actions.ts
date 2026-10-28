'use server';

import { refresh } from 'next/cache';
import { api, attempt } from '@/lib/api';
import type { StationTest } from '@/lib/types';

/** Yayına şimdi bağlan, durumu güncelle (ICY varsa çalan parça da döner). */
export async function testStation(slug: string) {
  const r = await attempt(() => api<StationTest>(`/admin/stations/${encodeURIComponent(slug)}/test`, { method: 'POST' }));
  if (r.ok) refresh();
  return r;
}
