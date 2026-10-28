'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasRole, type Role } from '@/lib/roles';
import { ACCESS_COOKIE, API_URL, cookieOptions, REFRESH_COOKIE, REFRESH_MAX_AGE, type Tokens } from '@/lib/session';

export type LoginState = { step: 'email' | 'code'; email?: string; error?: string; info?: string };

async function post<T>(path: string, body: unknown, token?: string) {
  const res = await fetch(`${API_URL}/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  const message = (data as { message?: string | string[] } | null)?.message;
  return { ok: res.ok, status: res.status, data: data as T, message: Array.isArray(message) ? message.join(', ') : message };
}

/** Tek form, iki adım: intent=request → kod gönder; intent=verify → doğrula ve giriş yap. */
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  return form.get('intent') === 'verify' ? verifyCode(form) : requestCode(form);
}

async function requestCode(form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!email) return { step: 'email', error: 'E-posta gerekli' };
  const res = await post('/auth/otp/request', { email });
  if (res.status === 503) return { step: 'email', email, error: 'E-posta ile giriş henüz açık değil (sunucuda SMTP yok).' };
  if (!res.ok) return { step: 'email', email, error: res.message ?? 'Kod gönderilemedi' };
  return {
    step: 'code',
    email,
    info: process.env.NODE_ENV === 'production' ? `${email} adresine 6 haneli kod gönderildi.` : 'Geliştirmede kod API konsoluna yazılır.',
  };
}

/** Kodu doğrula, rolü kontrol et, oturum çerezlerini yaz */
async function verifyCode(form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '');
  const code = String(form.get('code') ?? '').replace(/\D/g, '');
  const next = String(form.get('next') ?? '/');
  const res = await post<Tokens & { user: { role: Role } }>('/auth/otp/verify', { email, code });
  if (!res.ok) return { step: 'code', email, error: res.message ?? 'Kod doğrulanamadı' };

  if (!hasRole(res.data.user.role, 'EDITOR')) {
    await post('/auth/logout', {}, res.data.accessToken); // panel oturumu açık kalmasın
    return { step: 'email', email, error: 'Bu panel için yetkin yok (en az Editör rolü gerekir).' };
  }
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, res.data.accessToken, cookieOptions(res.data.expiresIn));
  jar.set(REFRESH_COOKIE, res.data.refreshToken, cookieOptions(REFRESH_MAX_AGE));
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}
