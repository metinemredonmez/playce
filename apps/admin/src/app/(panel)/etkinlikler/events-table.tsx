'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertTriangle, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EVENT_STATUS, SOURCE_LABEL } from '@/lib/events';
import { tl, trDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EventRow } from '@/lib/types';
import { bulkStatus } from './actions';

const BULK = [
  { status: 'PUBLISHED', label: 'Yayınla' },
  { status: 'DRAFT', label: 'Taslağa al' },
  { status: 'CANCELLED', label: 'İptal et' },
] as const;

export function EventsTable({ items, venueHrefs }: { items: EventRow[]; venueHrefs: Record<string, string> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const allSelected = selected.size === items.length;
  const toggle = (slug: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });

  const bulk = (status: (typeof BULK)[number]['status']) =>
    start(async () => {
      const r = await bulkStatus([...selected], status);
      if (r.ok) toast.success(`${r.ok} etkinlik güncellendi`);
      if (r.held.length) toast.warning(`${r.held.length} etkinlik alkol denetimine takıldı, incelemede kaldı`, { description: r.held.join(', ') });
      if (r.failed.length)
        toast.error(`${r.failed.length} etkinlik güncellenemedi`, { description: r.failed.map((f) => `${f.slug}: ${f.error}`).join('\n') });
      setSelected(new Set());
    });

  return (
    <div className="grid gap-2">
      <div className={cn('flex min-h-9 flex-wrap items-center gap-2 text-sm', !selected.size && 'text-muted-foreground')}>
        {selected.size ? (
          <>
            <span className="font-medium">{selected.size} seçili</span>
            {BULK.map((b) => (
              <Button key={b.status} size="sm" variant={b.status === 'PUBLISHED' ? 'default' : 'outline'} disabled={pending} onClick={() => bulk(b.status)}>
                {b.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setSelected(new Set())}>
              Seçimi kaldır
            </Button>
          </>
        ) : (
          <span>Toplu işlem için satır seç.</span>
        )}
      </div>

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  aria-label="Tümünü seç"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((e) => e.slug)))}
                />
              </TableHead>
              <TableHead className="hidden w-20 md:table-cell">Kapak</TableHead>
              <TableHead>Etkinlik</TableHead>
              <TableHead className="hidden lg:table-cell">Mekân</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="hidden xl:table-cell">Türler</TableHead>
              <TableHead className="hidden xl:table-cell">Bilet</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="hidden text-right 2xl:table-cell">Kayıt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((e) => {
              const ended = new Date(e.endsAt ?? new Date(e.startsAt).getTime() + 5 * 3_600_000) < new Date();
              return (
                <TableRow key={e.id} data-state={selected.has(e.slug) ? 'selected' : undefined}>
                  <TableCell>
                    <input type="checkbox" className="size-4 accent-primary" aria-label={`${e.title} seç`} checked={selected.has(e.slug)} onChange={() => toggle(e.slug)} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {e.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dış kaynak, optimize edilmez
                      <img src={e.coverUrl} alt="" className="aspect-video w-16 rounded object-cover" loading="lazy" />
                    ) : (
                      <div className="flex aspect-video w-16 items-center justify-center rounded bg-muted text-muted-foreground" title="Kapak yok">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56 xl:max-w-72">
                    <Link href={`/etkinlikler/${e.slug}`} className="block truncate font-medium hover:underline">
                      {e.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate lg:hidden">{e.venue.name}</span>
                      {e.source !== 'ADMIN' && <span className="shrink-0">{SOURCE_LABEL[e.source]}</span>}
                      {e.flags.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex shrink-0 items-center gap-0.5 text-destructive">
                              <AlertTriangle className="size-3" /> alkol
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{e.flags.join(', ')}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-44 lg:table-cell">
                    <Link href={venueHrefs[e.venue.slug]} className="block truncate text-sm hover:underline" title="Bu mekânın etkinlikleri">
                      {e.venue.name}
                    </Link>
                  </TableCell>
                  <TableCell className={cn('whitespace-nowrap text-sm tabular-nums', ended && 'text-muted-foreground')}>{trDateTime(e.startsAt)}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {e.genres.slice(0, 3).map((g) => (
                        <span key={g.slug} className="inline-flex items-center gap-1 text-xs">
                          <span className="size-2 rounded-full" style={{ background: g.color }} />
                          {g.name}
                        </span>
                      ))}
                      {e.genres.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm xl:table-cell">
                    {e.isFree ? 'Ücretsiz' : e.priceFrom != null ? tl(e.priceFrom) : <span className="text-muted-foreground">—</span>}
                    {!e.isFree && !e.ticketUrl && <p className="text-xs text-amber-600 dark:text-amber-500">link yok</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={EVENT_STATUS[e.status].variant}>{EVENT_STATUS[e.status].label}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums 2xl:table-cell">{e.saves}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
