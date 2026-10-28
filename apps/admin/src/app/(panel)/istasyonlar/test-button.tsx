'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { testStation } from './actions';

export function TestButton({ slug, name }: { slug: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await testStation(slug);
          if (!r.ok) return void toast.error(r.error);
          const { probe, nowPlaying, status } = r.data;
          if (!probe.ok) return void toast.error(`${name}: ${probe.error}`);
          toast.success(`${name}: ${status === 'OK' ? 'çalışıyor' : 'çalıyor, “şu an çalan” yok'}`, {
            description: nowPlaying?.raw ? `Şu an: ${nowPlaying.raw}` : [probe.codec, probe.bitrate && `${probe.bitrate} kbps`].filter(Boolean).join(' · '),
          });
        })
      }
    >
      {pending ? 'Bağlanıyor…' : 'Test et'}
    </Button>
  );
}
