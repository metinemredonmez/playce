import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import type { District, EventDetail, Genre } from '@/lib/types';

/** Düzenleme/kopya kaynağı; yoksa 404 sayfası. İstek başına bir kez (metadata + sayfa). */
export const loadEvent = cache(async (slug: string) => {
  try {
    return await api<EventDetail>(`/admin/events/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});

/** Formun seçenekleri: türler ve hızlı mekân eklemede semt önerileri */
export function loadOptions() {
  return Promise.all([api<Genre[]>('/genres'), api<District[]>('/districts')]);
}
