import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, cookieOptions, expiresSoon, REFRESH_COOKIE, REFRESH_MAX_AGE, refreshTokens } from '@/lib/session';

/**
 * Her panel isteğinden önce: access token geçerliyse geç; süresi doluyorsa refresh token'la sessizce yenile
 * (yeni çerezler hem tarayıcıya hem bu isteğin sunucu bileşenlerine gider); hiçbiri yoksa girişe yönlendir.
 */
export async function proxy(req: NextRequest) {
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (access && !expiresSoon(access)) return NextResponse.next();

  const tokens = refresh ? await refreshTokens(refresh, req.headers.get('user-agent')) : null;
  if (tokens) {
    req.cookies.set(ACCESS_COOKIE, tokens.accessToken);
    req.cookies.set(REFRESH_COOKIE, tokens.refreshToken);
    const headers = new Headers(req.headers);
    headers.set('cookie', req.cookies.toString());
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(tokens.expiresIn));
    res.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return res;
  }

  const login = new URL('/login', req.url);
  if (req.nextUrl.pathname !== '/') login.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  // Çerezler silinmez: eşzamanlı başka bir istek az önce yenilemiş olabilir; giriş sayfası geçerli oturumu geri yönlendirir.
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon.ico).*)'],
};
