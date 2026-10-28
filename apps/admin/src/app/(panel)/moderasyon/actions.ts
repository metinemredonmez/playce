'use server';

import { refresh } from 'next/cache';
import { api, attempt } from '@/lib/api';
import type { Moderation } from '@/lib/types';

type Patch = { title?: string; description?: string; status?: 'PUBLISHED' | 'DRAFT'; allowFlagged?: boolean };

/** Etkinliği güncelle. API alkol denetimini yeniden yapar: metin hâlâ işaretliyse REVIEW'da kalır (held). */
export async function updateEvent(slug: string, patch: Patch) {
  const result = await attempt(() =>
    api<{ status: string; moderation: Moderation }>(`/admin/events/${encodeURIComponent(slug)}`, { method: 'PATCH', body: patch }),
  );
  if (result.ok) refresh();
  return result;
}
