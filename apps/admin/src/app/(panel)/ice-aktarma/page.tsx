import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { trDateTime } from '@/lib/format';
import { requireRole } from '@/lib/me';
import type { ImportRun, ImportSource } from '@/lib/types';
import { RunButtons } from './run-buttons';

export const metadata: Metadata = { title: 'İçe aktarma' };

const SOURCES: { id: ImportSource; name: string; env: string; note: string }[] = [
  { id: 'ETKINLIKIO', name: 'Etkinlik.io', env: 'ETKINLIKIO_TOKEN', note: 'Türkiye etkinlik + mekân verisi (yayıncı ağı token’ı).' },
  { id: 'TICKETMASTER', name: 'Ticketmaster', env: 'TICKETMASTER_API_KEY', note: 'Biletix verisi var mı? (TR, yalnız müzik).' },
];

const seconds = (r: ImportRun) => (r.finishedAt ? Math.max(1, Math.round((+new Date(r.finishedAt) - +new Date(r.startedAt)) / 1000)) : null);

export default async function ImportsPage() {
  await requireRole('ADMIN');
  const { enabled, runs } = await api<{ enabled: ImportSource[]; runs: ImportRun[] }>('/admin/imports');

  return (
    <div className="grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">İçe aktarma</h1>
        <p className="text-sm text-muted-foreground">
          Worker her gece 04:00’te anahtarı tanımlı kaynaklardan İstanbul müzik etkinliklerini çeker. Aynı etkinlik iki kez
          açılmaz (mekân + ±2 saat + başlık); alkol denetimine takılan incelemeye düşer (ADR-017).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {SOURCES.map((s) => {
          const on = enabled.includes(s.id);
          return (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {s.name}
                  <Badge variant={on ? 'default' : 'secondary'}>{on ? 'Açık' : 'Anahtar yok'}</Badge>
                </CardTitle>
                <CardDescription>
                  {s.note}
                  {!on && (
                    <>
                      {' '}
                      Açmak için sunucuda <code className="text-xs">{s.env}</code>.
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RunButtons source={s.id} enabled={on} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <section className="grid gap-3">
        <h2 className="font-medium">Son turlar</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz tur yok.</p>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kaynak</TableHead>
                  <TableHead>Başladı</TableHead>
                  <TableHead className="text-right">Okunan</TableHead>
                  <TableHead className="text-right">Yeni</TableHead>
                  <TableHead className="text-right">Güncel</TableHead>
                  <TableHead className="text-right">Birleşen</TableHead>
                  <TableHead className="text-right">Atlanan</TableHead>
                  <TableHead>Hata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      {SOURCES.find((s) => s.id === r.source)?.name ?? r.source} {r.dryRun && <Badge variant="outline">deneme</Badge>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {trDateTime(r.startedAt)} {seconds(r) !== null ? `· ${seconds(r)} sn` : '· sürüyor'}
                    </TableCell>
                    {[r.fetched, r.created, r.updated, r.merged, r.skipped].map((n, i) => (
                      <TableCell key={i} className="text-right tabular-nums">
                        {n}
                      </TableCell>
                    ))}
                    <TableCell className="max-w-56 truncate text-xs text-destructive" title={r.errors?.map((e) => `${e.externalId}: ${e.message}`).join('\n')}>
                      {r.errors?.length ? `${r.errors.length} · ${r.errors[0].message}` : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </div>
  );
}
