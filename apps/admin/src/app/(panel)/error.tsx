'use client';

import { Button } from '@/components/ui/button';

/** Sunucu bileşeninde API hatası (ör. 403, API kapalı) */
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid max-w-md gap-3">
      <h1 className="text-lg font-semibold">Sayfa yüklenemedi</h1>
      <p className="text-sm text-muted-foreground">
        {process.env.NODE_ENV === 'production' ? 'API’ye ulaşılamadı ya da bu işlem için yetkin yok.' : error.message}
      </p>
      <div>
        <Button variant="outline" onClick={reset}>
          Tekrar dene
        </Button>
      </div>
    </div>
  );
}
