import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ACCESS_COOKIE, expiresSoon } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Giriş' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/' } = await searchParams;
  // Oturum zaten geçerliyse (ör. eşzamanlı bir istek az önce yeniledi) geri dön
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (access && !expiresSoon(access, 0)) redirect(next);

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Playce Admin</CardTitle>
          <CardDescription>E-postana gelen kodla giriş yap. Editör ve üstü roller girebilir.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
