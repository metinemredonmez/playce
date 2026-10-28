'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { EVENT_WHENS, SOURCE_LABEL, type EventWhen } from '@/lib/events';
import type { DataSource, Genre } from '@/lib/types';

type Params = { when: EventWhen; status?: string; q?: string; genre?: string; venue?: string; source?: string; missing?: string };

/** Süzgeç çubuğu: her değişiklik adres satırına yazılır (paylaşılabilir, geri tuşu çalışır), sayfa başa döner. */
export function EventFilters({ params, genres }: { params: Params; genres: Genre[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(params.q ?? '');
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch })) if (v && !(k === 'when' && v === 'upcoming')) next.set(k, v);
    start(() => router.replace(next.size ? `${pathname}?${next}` : pathname));
  };
  const filtered = Boolean(params.q || params.genre || params.source || params.missing || params.venue || params.when !== 'upcoming');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        {pending ? (
          <Loader2 className="absolute top-2.5 left-2.5 size-4 animate-spin text-muted-foreground" />
        ) : (
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        )}
        <Input
          value={q}
          placeholder="Başlık ya da mekân ara"
          className="pl-8"
          aria-label="Ara"
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => go({ q: v.trim() || undefined }), 350);
          }}
        />
      </div>
      <NativeSelect className="w-auto" aria-label="Tarih" value={params.when} onChange={(e) => go({ when: e.target.value as EventWhen })}>
        {Object.entries(EVENT_WHENS).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect className="w-auto" aria-label="Tür" value={params.genre ?? ''} onChange={(e) => go({ genre: e.target.value || undefined })}>
        <option value="">Tüm türler</option>
        {genres.map((g) => (
          <option key={g.slug} value={g.slug}>
            {g.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect className="w-auto" aria-label="Kaynak" value={params.source ?? ''} onChange={(e) => go({ source: e.target.value || undefined })}>
        <option value="">Tüm kaynaklar</option>
        {(Object.keys(SOURCE_LABEL) as DataSource[]).map((s) => (
          <option key={s} value={s}>
            {SOURCE_LABEL[s]}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect className="w-auto" aria-label="Eksik alan" value={params.missing ?? ''} onChange={(e) => go({ missing: e.target.value || undefined })}>
        <option value="">Eksik alan: hepsi</option>
        <option value="cover">Kapağı yok</option>
        <option value="ticket">Bilet linki yok (ücretli)</option>
      </NativeSelect>
      {filtered && (
        <Link
          href={params.status ? `${pathname}?status=${params.status}` : pathname}
          onClick={() => setQ('')}
          className="px-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Temizle
        </Link>
      )}
    </div>
  );
}
