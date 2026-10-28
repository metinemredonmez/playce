'use server';

import { refresh } from 'next/cache';
import { api, attempt } from '@/lib/api';
import type { ArtistHit } from '@/lib/types';

const path = (key: string, action: string) => `/admin/unmatched/${encodeURIComponent(key)}/${action}`;

async function act(key: string, action: string, body?: unknown) {
  const r = await attempt(() => api(path(key, action), { method: 'POST', body: body ?? {} }));
  if (r.ok) refresh();
  return r.ok ? { ok: true as const } : r;
}

/** Kuyruktaki adla yeni sanatçı aç ve bağla (yazılış alias olur, geçmiş çalmalar eşlenir). */
export async function createArtist(key: string, input: { name: string; slug?: string; genreSlugs: string[] }) {
  return act(key, 'create', { name: input.name, ...(input.slug ? { slug: input.slug } : {}), genreSlugs: input.genreSlugs });
}

/** Mevcut sanatçıya bağla ("MVÖ" → Mor ve Ötesi) */
export async function linkArtist(key: string, artistSlug: string) {
  return act(key, 'link', { artistSlug });
}

export async function ignore(key: string) {
  return act(key, 'ignore');
}

export async function reopen(key: string) {
  return act(key, 'reopen');
}

/** Bağlamak için sanatçı ara (Türkçe karakter ve yazım hatası duyarsız arama ucu). */
export async function searchArtists(q: string): Promise<ArtistHit[]> {
  if (q.trim().length < 2) return [];
  const r = await api<{ artists: ArtistHit[] }>(`/search?q=${encodeURIComponent(q.trim())}`);
  return r.artists;
}
