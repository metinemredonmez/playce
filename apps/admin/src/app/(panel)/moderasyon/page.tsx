import type { Metadata } from 'next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { SOURCE_LABEL } from '@/lib/events';
import { trDateTime } from '@/lib/format';
import { getMe } from '@/lib/me';
import { hasRole } from '@/lib/roles';
import type { EventPage } from '@/lib/types';
import { ReviewActions } from './review-actions';

export const metadata: Metadata = { title: 'Moderasyon' };

export default async function ModerationPage() {
  const [me, page] = await Promise.all([getMe(), api<EventPage>('/admin/events?status=REVIEW&limit=100')]);
  const canOverride = hasRole(me.role, 'MODERATOR');

  return (
    <div className="grid max-w-4xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Moderasyon</h1>
        <p className="text-sm text-muted-foreground">
          İncelemedeki etkinlikler — çoğu alkol mevzuatı denetimine takılanlar (ADR-015). Metni düzeltip yayınla;
          yanlış alarmsa {canOverride ? '“Yine de yayınla”' : 'bir moderatöre haber ver'}.
        </p>
      </header>

      {page.items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">İncelemede bekleyen etkinlik yok.</CardContent>
        </Card>
      ) : (
        page.items.map((e) => (
          <Card key={e.id}>
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">{trDateTime(e.startsAt)}</span>
                <span>·</span>
                <span>{e.venue.name}</span>
                <Badge variant="outline">{SOURCE_LABEL[e.source]}</Badge>
              </div>
              <CardTitle className="text-lg">{e.title}</CardTitle>
              <div className="flex flex-wrap gap-1">
                {e.flags.length ? (
                  e.flags.map((f) => (
                    <Badge key={f} variant="destructive">
                      {f}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">bayrak yok — elle incelemeye alınmış</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {e.description && <p className="line-clamp-4 whitespace-pre-line text-sm">{e.description}</p>}
              <ReviewActions event={e} canOverride={canOverride} />
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
