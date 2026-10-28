'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { SOURCE_LABEL } from '@/lib/events';
import type { DataSource, District, Genre } from '@/lib/types';

type Params = { q?: string; district?: string; genre?: string; source?: string; missing?: string };

/** Süzgeçler adres satırında (paylaşılabilir); her değişiklik sayfayı başa alır. */
export function VenueFilters({ params, genres, districts }: { params: Params; genres: Genre[]; districts: District[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(params.q ?? '');
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...patch })) if (v) next.set(k, v);
    start(() => router.replace(next.size ? `${pathname}?${next}` : pathname));
  };
  const filtered = Boolean(params.q || params.district || params.genre || params.source || params.missing);

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
          placeholder="Ad ya da semt ara"
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
      <NativeSelect className="w-auto" aria-label="Semt" value={params.district ?? ''} onChange={(e) => go({ district: e.target.value || undefined })}>
        <option value="">Tüm semtler</option>
        {districts.map((d) => (
          <option key={d.slug} value={d.slug}>
            {d.name} ({d.venues})
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
      {filtered && (
        <Link href={pathname} onClick={() => setQ('')} className="px-2 text-sm text-muted-foreground underline-offset-4 hover:underline">
          Temizle
        </Link>
      )}
    </div>
  );
}
