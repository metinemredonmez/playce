'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, attempt } from '@/lib/api';
import type { VenueCheck, VenueHour } from '@/lib/types';

const path = (slug: string) => `/admin/venues/${encodeURIComponent(slug)}`;

/** Formun gönderdiği alanlar. null = alanı temizle; soundStationSlug null = ana türün varsayılan istasyonu. */
export type VenuePayload = {
  name: string;
  slug?: string;
  district: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  description: string | null;
  coverUrl: string | null;
  instagram: string | null;
  phone: string | null;
  website: string | null;
  reservationUrl: string | null;
  capacity: number | null;
  priceLevel: number | null;
  ageLimit: number | null;
  doorPolicy: string | null;
  dressCode: string | null;
  genreSlugs: string[];
  soundStationSlug: string | null;
  allowFlagged?: boolean;
};

/**
 * Oluştur ya da güncelle; saatler değiştiyse ardından haftayı baştan yazar (ayrı uç, ayrı denetim kaydı).
 * hours null = saatlere dokunma.
 */
export async function saveVenue(slug: string | null, payload: VenuePayload, hours: VenueHour[] | null) {
  const r = await attempt(() =>
    slug ? api<{ slug: string }>(path(slug), { method: 'PATCH', body: payload }) : api<{ slug: string }>('/admin/venues', { method: 'POST', body: payload }),
  );
  if (!r.ok) return r;
  if (hours) {
    const h = await attempt(() => api(`${path(r.data.slug)}/hours`, { method: 'PUT', body: { hours } }));
    if (!h.ok) {
      refresh();
      return { ok: false as const, error: `Bilgiler kaydedildi ama saatler kaydedilemedi: ${h.error}`, slug: r.data.slug };
    }
  }
  refresh();
  return { ok: true as const, data: { slug: r.data.slug } };
}

/** API etkinliği olan mekânı silmez (etkinlikler zincirleme silinirdi). */
export async function deleteVenue(slug: string) {
  const r = await attempt(() => api(path(slug), { method: 'DELETE' }));
  if (!r.ok) return r;
  redirect('/mekanlar');
}

/** Kaydetmeden önce: alkol bayrakları ve olası aynı mekân (aynı ad ya da ~100 m). Yazmaz. */
export async function checkVenue(input: {
  name?: string;
  description?: string;
  doorPolicy?: string;
  dressCode?: string;
  lat?: number;
  lng?: number;
  exclude?: string;
}): Promise<VenueCheck> {
  return api<VenueCheck>('/admin/venues/check', { method: 'POST', body: input });
}
