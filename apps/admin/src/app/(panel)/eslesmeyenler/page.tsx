import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Genre, Unmatched, UnmatchedStatus } from '@/lib/types';
import { IgnoredActions, OpenActions } from './row-actions';

export const metadata: Metadata = { title: 'Eşleşmeyenler' };

const TABS: { status: UnmatchedStatus; label: string }[] = [
  { status: 'OPEN', label: 'Açık' },
  { status: 'IGNORED', label: 'Yoksayılan' },
  { status: 'LINKED', label: 'Bağlanan' },
];

export default async function UnmatchedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.status === raw)?.status ?? 'OPEN';
  const [items, genres] = await Promise.all([api<Unmatched[]>(`/admin/unmatched?status=${status}&limit=200`), api<Genre[]>('/genres')]);

  return (
    <div className="grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Eşleşmeyenler</h1>
        <p className="text-sm text-muted-foreground">
          Radyoda çalıp veritabanında olmayan sanatçılar, en çok çalan üstte. Her bağlama, sonraki çalmaları otomatik eşler
          ve takipçilere “şu an radyoda” bildirimini açar. Reklam/program adlarını yoksay.
        </p>
      </header>

      <nav className="flex gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={t.status === 'OPEN' ? '/eslesmeyenler' : `/eslesmeyenler?status=${t.status}`}
            className={cn('-mb-px border-b-2 px-3 py-2 text-sm', t.status === status ? 'border-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Bu listede kayıt yok.</CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Radyodaki ad</TableHead>
                <TableHead className="text-right">Çalma</TableHead>
                <TableHead className="hidden xl:table-cell">İstasyonlar</TableHead>
                <TableHead className="hidden 2xl:table-cell">Son</TableHead>
                <TableHead className="text-right">{status === 'LINKED' ? 'Sanatçı' : 'Eylem'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((u) => (
                <TableRow key={u.key}>
                  <TableCell className="max-w-56 xl:max-w-72">
                    <p className="truncate font-medium">{u.display}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.sampleRaw}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{u.plays}</TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.stations.map((s) => (
                        <Badge key={s.slug} variant="secondary">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground 2xl:table-cell">{ago(u.lastSeenAt)}</TableCell>
                  <TableCell className="text-right">
                    {status === 'OPEN' ? (
                      <OpenActions item={u} genres={genres} />
                    ) : status === 'IGNORED' ? (
                      <IgnoredActions item={u} />
                    ) : (
                      <span className="text-sm">{u.artist?.name ?? '—'}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
