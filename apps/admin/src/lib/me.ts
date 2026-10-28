import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { api } from './api';
import { hasRole, type Role } from './roles';

export type Me = { id: string; email: string | null; name: string | null; role: Role };

/** Giriş yapan kişi — istek başına bir kez (layout + sayfa aynı sonucu kullanır). */
export const getMe = cache(() => api<Me>('/me'));

/** Ekran rol ister: yetmezse ana sayfaya (menüde zaten görünmez; doğrudan adres yazılırsa). API de 403 verir. */
export async function requireRole(min: Role) {
  const me = await getMe();
  if (!hasRole(me.role, min)) redirect('/');
  return me;
}
