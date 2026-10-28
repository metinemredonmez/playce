import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { trDateTime } from '@/lib/format';
import { requireRole } from '@/lib/me';
import { cn } from '@/lib/utils';
import type { AuditEntry, Page } from '@/lib/types';

export const metadata: Metadata = { title: 'Denetim kaydı' };

const TYPES: Record<string, string> = {
  event: 'Etkinlik',
  venue: 'Mekân',
  artist: 'Sanatçı',
  station: 'İstasyon',
  unmatched: 'Eşleşmeyen',
  import: 'İçe aktarma',
};
const VERBS: Record<string, string> = {
  create: 'oluşturdu',
  update: 'güncelledi',
  delete: 'sildi',
  hours: 'saatleri değiştirdi',
  link: 'bağladı',
  ignore: 'yoksaydı',
  reopen: 'geri aldı',
  run: 'çalıştırdı',
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ type?: string; cursor?: string }> }) {
  await requireRole('ADMIN');
  const { type, cursor } = await searchParams;
  const q = new URLSearchParams({ limit: '50', ...(type && TYPES[type] ? { entityType: type } : {}), ...(cursor ? { cursor } : {}) });
  const page = await api<Page<AuditEntry>>(`/admin/audit?${q}`);
  const href = (t?: string) => (t ? `/denetim?type=${t}` : '/denetim');

  return (
    <div className="grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Denetim kaydı</h1>
        <p className="text-sm text-muted-foreground">Her admin yazması: kim, ne zaman, hangi kayıtta, hangi alanları gönderdi. Yeniden eskiye.</p>
      </header>

      <nav className="flex flex-wrap gap-1.5">
        {[undefined, ...Object.keys(TYPES)].map((t) => (
          <Link
            key={t ?? 'all'}
            href={href(t)}
            className={cn('rounded-full border px-3 py-1 text-xs', (type ?? undefined) === t ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')}
          >
            {t ? TYPES[t] : 'Tümü'}
          </Link>
        ))}
      </nav>

      {page.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Kayıt yok.</CardContent>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zaman</TableHead>
                <TableHead>Kim</TableHead>
                <TableHead>Ne</TableHead>
                <TableHead>Gönderilen alanlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((a) => {
                const [entity, verb] = a.action.split('.');
                return (
                  <TableRow key={a.id} className="align-top">
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{trDateTime(a.createdAt)}</TableCell>
                    <TableCell className="max-w-40 truncate text-sm xl:max-w-48">{a.actor?.email ?? a.actor?.name ?? (a.actorId === 'admin-key' ? 'X-Admin-Key' : a.actorId)}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="secondary">{TYPES[entity] ?? entity}</Badge> {VERBS[verb] ?? verb}
                      <p className="mt-1 max-w-56 truncate font-mono text-xs text-muted-foreground" title={a.entityId}>
                        {a.entityId}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-56 xl:max-w-md">
                      {a.diff ? (
                        <details>
                          <summary className="cursor-pointer truncate text-xs text-muted-foreground">{Object.keys(a.diff).join(', ')}</summary>
                          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(a.diff, null, 2)}</pre>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      {page.nextCursor && (
        <Link className="justify-self-end text-sm underline-offset-4 hover:underline" href={`/denetim?${new URLSearchParams({ ...(type ? { type } : {}), cursor: page.nextCursor })}`}>
          Daha eski →
        </Link>
      )}
    </div>
  );
}
