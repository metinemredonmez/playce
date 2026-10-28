import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { EVENT_STATUS, EVENT_WHENS, type EventWhen } from '@/lib/events';
import { cn } from '@/lib/utils';
import type { EventPage, EventStatus, Genre } from '@/lib/types';
import { EventFilters } from './filters';
import { EventsTable } from './events-table';

export const metadata: Metadata = { title: 'Etkinlikler' };

type Params = { status?: string; when?: string; q?: string; genre?: string; venue?: string; source?: string; missing?: string; cursor?: string };

const STATUSES = Object.keys(EVENT_STATUS) as EventStatus[];
const SOURCES = ['ADMIN', 'IMPORT', 'DEMO'];
const MISSING = ['cover', 'ticket'];

export default async function EventsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  // Geçersiz değer API'ye gitmesin (400 yerine süzgeç yok sayılır)
  const p = {
    when: (sp.when && sp.when in EVENT_WHENS ? sp.when : 'upcoming') as EventWhen,
    status: STATUSES.find((s) => s === sp.status),
    q: sp.q?.trim().slice(0, 60) || undefined,
    genre: sp.genre || undefined,
    venue: sp.venue || undefined,
    source: SOURCES.find((s) => s === sp.source),
    missing: MISSING.find((m) => m === sp.missing),
  };
  const query = new URLSearchParams({ limit: '50' });
  for (const [k, v] of Object.entries({ ...p, when: p.when === 'all' ? undefined : p.when, cursor: sp.cursor })) if (v) query.set(k, v);
  const [page, genres] = await Promise.all([api<EventPage>(`/admin/events?${query}`), api<Genre[]>('/genres')]);

  /** Mevcut süzgeçler + değişiklik; sayfa başa döner */
  const href = (patch: Partial<Record<keyof typeof p | 'cursor', string | undefined>>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...p, ...patch })) if (v && !(k === 'when' && v === 'upcoming')) next.set(k, v);
    return next.size ? `/etkinlikler?${next}` : '/etkinlikler';
  };
  const total = Object.values(page.counts).reduce((a, b) => a + (b ?? 0), 0);
  const filtered = Boolean(p.q || p.genre || p.venue || p.source || p.missing);
  const venueName = p.venue && page.items.find((e) => e.venue.slug === p.venue)?.venue.name;

  return (
    <div className="grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold">Etkinlikler</h1>
          <p className="text-sm text-muted-foreground">Saatler İstanbul saatiyle. Toplu yayında alkol denetimi her etkinlik için ayrı yapılır.</p>
        </div>
        <Button asChild>
          <Link href="/etkinlikler/yeni">
            <Plus /> Yeni etkinlik
          </Link>
        </Button>
      </header>

      <nav className="flex flex-wrap gap-1 border-b">
        {[undefined, ...STATUSES].map((s) => {
          const n = s ? (page.counts[s] ?? 0) : total;
          return (
            <Link
              key={s ?? 'all'}
              href={href({ status: s })}
              className={cn(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm',
                p.status === s ? 'border-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {s ? EVENT_STATUS[s].label : 'Tümü'}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', s === 'REVIEW' && n > 0 ? 'bg-destructive text-white' : 'bg-muted')}>{n}</span>
            </Link>
          );
        })}
      </nav>

      <EventFilters params={p} genres={genres} />

      {p.venue && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Mekân:</span>
          <Link href={href({ venue: undefined })} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 hover:bg-accent">
            {venueName ?? p.venue} <X className="size-3" />
          </Link>
        </div>
      )}

      {page.items.length === 0 ? (
        <Card>
          <CardContent className="grid justify-items-center gap-3 py-10 text-center text-sm text-muted-foreground">
            {filtered || p.status || p.when === 'all' ? 'Bu süzgeçte etkinlik yok.' : `${EVENT_WHENS[p.when]} etkinlik yok.`}
            <Button asChild variant="outline" size="sm">
              <Link href="/etkinlikler/yeni">
                <Plus /> Etkinlik ekle
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <EventsTable key={query.toString()} items={page.items} venueHrefs={Object.fromEntries(page.items.map((e) => [e.venue.slug, href({ venue: e.venue.slug })]))} />
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
