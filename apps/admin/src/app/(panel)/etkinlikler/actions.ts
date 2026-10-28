'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, attempt } from '@/lib/api';
import type { ArtistHit, EventCheck, EventStatus, Moderation, TicketProvider, VenueHit } from '@/lib/types';

const path = (slug: string) => `/admin/events/${encodeURIComponent(slug)}`;

/** Formun gönderdiği alanlar. null = alanı temizle; ticketProvider yoksa API linkten çıkarır. */
export type EventPayload = {
  title: string;
  slug?: string;
  description: string | null;
  coverUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  doorsAt: string | null;
  venueSlug: string;
  genreSlugs: string[];
  artistSlugs: string[];
  isFree: boolean;
  priceFrom: number | null;
  ticketUrl: string | null;
  ticketProvider?: TicketProvider;
  ageLimit: number | null;
  sellerName: string | null;
  totalPriceNote: string | null;
  refundPolicy: string | null;
  status: EventStatus;
  allowFlagged?: boolean;
};

export type Saved = { slug: string; status: EventStatus; moderation: Moderation };

/** Oluştur (slug yok) ya da güncelle. API alkol denetimini yapar: işaretliyse REVIEW'da tutar (moderation.held). */
export async function saveEvent(slug: string | null, payload: EventPayload) {
  const r = await attempt(() =>
    slug ? api<Saved>(path(slug), { method: 'PATCH', body: payload }) : api<Saved>('/admin/events', { method: 'POST', body: payload }),
  );
  if (r.ok) refresh();
  return r;
}

export async function deleteEvent(slug: string) {
  const r = await attempt(() => api(path(slug), { method: 'DELETE' }));
  if (!r.ok) return r;
  redirect('/etkinlikler');
}

/**
 * Toplu durum değişikliği. Her etkinlik ayrı istek: alkol denetimi ve "bitmiş etkinlik yayınlanamaz"
 * kuralı tek tek uygulanır, her biri denetim kaydına ayrı düşer.
 */
export async function bulkStatus(slugs: string[], status: Exclude<EventStatus, 'REVIEW'>) {
  let ok = 0;
  const held: string[] = [];
  const failed: { slug: string; error: string }[] = [];
  for (const slug of slugs.slice(0, 100)) {
    const r = await attempt(() => api<Saved>(path(slug), { method: 'PATCH', body: { status } }));
    if (!r.ok) failed.push({ slug, error: r.error });
    else if (r.data.moderation?.held) held.push(slug);
    else ok++;
  }
  refresh();
  return { ok, held, failed };
}

/** Kaydetmeden önce: alkol bayrakları ve olası kopyalar. Yazmaz. */
export async function checkEvent(input: {
  title?: string;
  description?: string;
  sellerName?: string;
  totalPriceNote?: string;
  refundPolicy?: string;
  venueSlug?: string;
  startsAt?: string;
  exclude?: string;
}): Promise<EventCheck> {
  return api<EventCheck>('/admin/events/check', { method: 'POST', body: input });
}

export async function lookupVenues(q: string): Promise<VenueHit[]> {
  return q.trim().length < 2 ? [] : api<VenueHit[]>(`/admin/lookup/venues?q=${encodeURIComponent(q.trim())}`);
}

export async function lookupArtists(q: string): Promise<ArtistHit[]> {
  return q.trim().length < 2 ? [] : api<ArtistHit[]>(`/admin/lookup/artists?q=${encodeURIComponent(q.trim())}`);
}

/** Formdan çıkmadan mekân ekle (ad + semt; ayrıntılar Mekânlar ekranında). */
export async function quickVenue(input: { name: string; district: string; address?: string }) {
  return attempt(() => api<VenueHit>('/admin/venues', { method: 'POST', body: input }));
}

/** Formdan çıkmadan sanatçı ekle. Radyo kuyruğundaki aynı adlı kayıtlar da otomatik bağlanır. */
export async function quickArtist(input: { name: string; genreSlugs: string[] }) {
  return attempt(() => api<ArtistHit>('/admin/artists', { method: 'POST', body: input }));
}
