'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, type LoginState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, { step: 'email' } satisfies LoginState);

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {state.step === 'code' ? (
        <>
          <input type="hidden" name="intent" value="verify" />
          <input type="hidden" name="email" value={state.email} />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{state.email}</span>
            {state.info && ` · ${state.info}`}
          </p>
          <div className="grid gap-2">
            <Label htmlFor="code">Kod</Label>
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" required autoFocus />
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="intent" value="request" />
          <div className="grid gap-2">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required autoFocus />
          </div>
        </>
      )}
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {state.step === 'code' ? (pending ? 'Doğrulanıyor…' : 'Giriş yap') : pending ? 'Gönderiliyor…' : 'Kod gönder'}
      </Button>
    </form>
  );
}
