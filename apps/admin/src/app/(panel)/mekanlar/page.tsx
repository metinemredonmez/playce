import type { Metadata } from 'next';
import Link from 'next/link';
import { ImageOff, MapPinOff, Clock, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { SOURCE_LABEL } from '@/lib/events';
import { cn } from '@/lib/utils';
import type { District, Genre, VenuePage } from '@/lib/types';
import { VenueFilters } from './filters';

export const metadata: Metadata = { title: 'Mekânlar' };

type Params = { q?: string; district?: string; genre?: string; source?: string; missing?: string; cursor?: string };

const MISSING = { location: { label: 'Konum yok', icon: MapPinOff }, hours: { label: 'Saat yok', icon: Clock }, cover: { label: 'Kapak yok', icon: ImageOff } };
const SOURCES = ['ADMIN', 'IMPORT', 'DEMO'];

export default async function VenuesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const p = {
    q: sp.q?.trim().slice(0, 60) || undefined,
    district: sp.district || undefined,
    genre: sp.genre || undefined,
    source: SOURCES.find((s) => s === sp.source),
    missing: (Object.keys(MISSING) as (keyof typeof MISSING)[]).find((m) => m === sp.missing),
  };
  const query = new URLSearchParams({ limit: '50' });
  for (const [k, v] of Object.entries({ ...p, cursor: sp.cursor })) if (v) query.set(k, v);
  const [page, genres, districts] = await Promise.all([api<VenuePage>(`/admin/venues?${query}`), api<Genre[]>('/genres'), api<District[]>('/districts')]);

  const href = (patch: Partial<Record<keyof typeof p | 'cursor', string | undefined>>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...p, ...patch })) if (v) next.set(k, v);
    return next.size ? `/mekanlar?${next}` : '/mekanlar';
  };

  return (
    <div className="grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Mekânlar</h1>
          <p className="text-sm text-muted-foreground">
            {page.total} mekân. Konumu olmayan mekân haritada ve “yakınımda”da, saati olmayan “şimdi açık”ta görünmez.
          </p>
        </div>
        <Button asChild>
          <Link href="/mekanlar/yeni">
            <Plus /> Yeni mekân
          </Link>
        </Button>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Eksik alanlar">
        {(Object.keys(MISSING) as (keyof typeof MISSING)[]).map((m) => {
          const { label, icon: Icon } = MISSING[m];
          const on = p.missing === m;
          return (
            <Link
              key={m}
              href={href({ missing: on ? undefined : m })}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs', on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
            >
              <Icon className="size-3.5" /> {label}
              <span className="tabular-nums opacity-70">{page.missing[m]}</span>
            </Link>
          );
        })}
      </nav>

      <VenueFilters params={p} genres={genres} districts={districts} />

      {page.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Bu süzgeçte mekân yok.</CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-20 md:table-cell">Kapak</TableHead>
                <TableHead>Mekân</TableHead>
                <TableHead className="hidden lg:table-cell">Semt</TableHead>
                <TableHead className="hidden xl:table-cell">Türler</TableHead>
                <TableHead className="hidden xl:table-cell">Fiyat</TableHead>
                <TableHead>Şimdi</TableHead>
                <TableHead className="text-right">Etkinlik</TableHead>
                <TableHead className="hidden text-right 2xl:table-cell">Takipçi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="hidden md:table-cell">
                    {v.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dış kaynak, optimize edilmez
                      <img src={v.coverUrl} alt="" className="aspect-video w-16 rounded object-cover" loading="lazy" />
                    ) : (
                      <div className="flex aspect-video w-16 items-center justify-center rounded bg-muted text-muted-foreground" title="Kapak yok">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 xl:max-w-72">
                    <Link href={`/mekanlar/${v.slug}`} className="block truncate font-medium hover:underline">
                      {v.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate lg:hidden">{v.district}</span>
                      {v.source !== 'ADMIN' && <span className="shrink-0">{SOURCE_LABEL[v.source]}</span>}
                      {!v.hasLocation && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-amber-600 dark:text-amber-500">
                          <MapPinOff className="size-3" /> konum
                        </span>
                      )}
                      {!v.hasHours && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-amber-600 dark:text-amber-500">
                          <Clock className="size-3" /> saat
                        </span>
                      )}
                      {v.flags.length > 0 && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 text-destructive" title={v.flags.join(', ')}>
                          <AlertTriangle className="size-3" /> alkol
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{v.district}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {v.genres.slice(0, 3).map((g) => (
                        <span key={g.slug} className="inline-flex items-center gap-1 text-xs">
                          <span className="size-2 rounded-full" style={{ background: g.color }} />
                          {g.name}
                        </span>
                      ))}
                      {v.genres.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm xl:table-cell">{v.priceLevel ? '₺'.repeat(v.priceLevel) : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {v.openNow === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : v.openNow ? (
                      <span className="text-emerald-600 dark:text-emerald-500">Açık{v.openUntil ? ` · ${v.openUntil}` : ''}</span>
                    ) : (
                      <span className="text-muted-foreground">Kapalı</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {v.upcomingEvents > 0 ? (
                      <Link href={`/etkinlikler?venue=${v.slug}`} className="hover:underline">
                        {v.upcomingEvents}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums 2xl:table-cell">{v.followers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {(page.nextCursor || sp.cursor) && (
        <div className="flex justify-end gap-4 text-sm">
          {sp.cursor && (
            <Link className="underline-offset-4 hover:underline" href={href({})}>
              ← İlk sayfa
            </Link>
          )}
          {page.nextCursor && (
            <Link className="underline-offset-4 hover:underline" href={href({ cursor: page.nextCursor })}>
              Sonraki sayfa →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
