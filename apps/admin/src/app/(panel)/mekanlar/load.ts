import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import type { District, Genre, StationHealth, VenueDetail } from '@/lib/types';

/** Düzenlenen mekân; yoksa 404 sayfası. İstek başına bir kez (metadata + sayfa). */
export const loadVenue = cache(async (slug: string) => {
  try {
    return await api<VenueDetail>(`/admin/venues/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

/** Formun seçenekleri: türler, semt önerileri, "mekânın sesi" için istasyonlar */
export function loadOptions() {
  return Promise.all([api<Genre[]>('/genres'), api<District[]>('/districts'), api<StationHealth[]>('/admin/stations/health')]);
}
