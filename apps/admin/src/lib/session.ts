// Oturum çerezleri — proxy.ts ve sunucu kodu ortak kullanır (tarayıcıya hiç token gitmez).
export const ACCESS_COOKIE = 'playce_at';
export const REFRESH_COOKIE = 'playce_rt';
export const API_URL = (process.env.PLAYCE_API_URL ?? 'http://localhost:3030').replace(/\/$/, '');

export type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };

/** HTTPS gelene kadar (IP üzerinden) ADMIN_INSECURE_COOKIES=1 ile secure kapatılabilir. */
const secure = process.env.NODE_ENV === 'production' && process.env.ADMIN_INSECURE_COOKIES !== '1';

export function cookieOptions(maxAgeSec: number) {
  return { httpOnly: true, sameSite: 'lax' as const, secure, path: '/', maxAge: maxAgeSec };
}

export const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

/** JWT'nin süresi bu kadar içinde doluyorsa önceden yenilenir (imza doğrulaması API'de). */
export function expiresSoon(jwt: string, marginSec = 60): boolean {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
    return !payload.exp || payload.exp * 1000 < Date.now() + marginSec * 1000;
  } catch {
    return true;
  }
}

// Aynı anda gelen istekler (sayfa + prefetch) aynı refresh token'ı iki kez kullanmasın:
// API ikinci kullanımı reddeder. Tek Node süreci olduğu için bellek içi paylaşım yeterli.
const inflight = new Map<string, { at: number; promise: Promise<Tokens | null> }>();

export function refreshTokens(refreshToken: string, userAgent: string | null): Promise<Tokens | null> {
  const now = Date.now();
  for (const [k, v] of inflight) if (now - v.at > 30_000) inflight.delete(k);
  const hit = inflight.get(refreshToken);
  if (hit) return hit.promise;
  const promise = fetch(`${API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(userAgent ? { 'User-Agent': userAgent } : {}) },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  })
    .then(async (res) => (res.ok ? ((await res.json()) as Tokens) : null))
    .catch(() => null);
  inflight.set(refreshToken, { at: now, promise });
  return promise;
}
