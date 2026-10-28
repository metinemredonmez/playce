'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ImportSource } from '@/lib/types';
import { runImport } from './actions';

export function RunButtons({ source, enabled }: { source: ImportSource; enabled: boolean }) {
  const [pending, start] = useTransition();
  const run = (dryRun: boolean) =>
    start(async () => {
      const r = await runImport(source, dryRun);
      if (!r.ok) return void toast.error(r.error);
      const d = r.data;
      toast.success(dryRun ? `Deneme: ${d.created} yeni etkinlik gelecek` : `${d.created} yeni, ${d.updated} güncel, ${d.merged} birleşti`, {
        description: `${d.fetched} kayıt okundu, ${d.skipped} atlandı${d.errors?.length ? `, ${d.errors.length} hata` : ''}`,
      });
    });
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={!enabled || pending} onClick={() => run(true)}>
        Deneme (yazmadan say)
      </Button>
      <Button size="sm" disabled={!enabled || pending} onClick={() => run(false)}>
        {pending ? 'Çalışıyor…' : 'Şimdi içe aktar'}
      </Button>
    </div>
  );
}
