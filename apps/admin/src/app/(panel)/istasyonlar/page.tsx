import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { ago } from '@/lib/format';
import type { StationHealth, StationStatus } from '@/lib/types';
import { TestButton } from './test-button';

export const metadata: Metadata = { title: 'İstasyonlar' };

const STATUS: Record<StationStatus, { label: string; className: string }> = {
  DOWN: { label: 'Kapalı', className: 'bg-red-600 text-white' },
  NO_METADATA: { label: 'Parça bilgisi yok', className: 'bg-amber-500 text-black' },
  OK: { label: 'Çalışıyor', className: 'bg-emerald-600 text-white' },
};
const SOURCE = { triton: 'Triton', icy: 'ICY' } as const;

export default async function StationsPage() {
  const stations = await api<StationHealth[]>('/admin/stations/health');
  const down = stations.filter((s) => s.status === 'DOWN').length;

  return (
    <div className="grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">İstasyonlar</h1>
        <p className="text-sm text-muted-foreground">
          Worker her saat başı tüm yayınlara bağlanır. 3 ardışık hata → <b>Kapalı</b> (uygulamada gizlenir, düzelince
          kendiliğinden döner). {down > 0 ? `${down} istasyon şu an kapalı.` : 'Kapalı istasyon yok.'}
        </p>
      </header>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>İstasyon</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="hidden lg:table-cell">Parça bilgisi</TableHead>
              <TableHead className="hidden xl:table-cell">Son kontrol</TableHead>
              <TableHead className="hidden xl:table-cell">Son çalma</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.map((s) => (
              <TableRow key={s.slug}>
                <TableCell className="max-w-64">
                  <p className="truncate font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.genre}
                    {s.codec && ` · ${s.codec === 'hls' ? 'HLS' : s.codec.replace('audio/', '')}`}
                    {s.bitrate && ` · ${s.bitrate} kbps`}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS[s.status].className}>{STATUS[s.status].label}</Badge>
                  {s.lastError && (
                    <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={s.lastError}>
                      {s.failCount}× · {s.lastError}
                    </p>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm lg:table-cell">{s.metadataSource ? SOURCE[s.metadataSource] : <span className="text-muted-foreground">yok (HLS)</span>}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground xl:table-cell">{s.lastCheckedAt ? ago(s.lastCheckedAt) : '—'}</TableCell>
                <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground xl:table-cell">{s.lastPlayAt ? ago(s.lastPlayAt) : '—'}</TableCell>
                <TableCell className="text-right">
                  <TestButton slug={s.slug} name={s.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
