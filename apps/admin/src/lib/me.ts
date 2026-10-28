import 'server-only';
import { cache } from 'react';
import { api } from './api';
import type { Role } from './roles';

export type Me = { id: string; email: string | null; name: string | null; role: Role };

/** Giriş yapan kişi — istek başına bir kez (layout + sayfa aynı sonucu kullanır). */
export const getMe = cache(() => api<Me>('/me'));
