'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VenueHour } from '@/lib/types';

/** Pazartesiden başlayan gün sırası (0 = Pazar) */
const DAYS: { weekday: number; label: string }[] = [
  { weekday: 1, label: 'Pazartesi' },
  { weekday: 2, label: 'Salı' },
  { weekday: 3, label: 'Çarşamba' },
  { weekday: 4, label: 'Perşembe' },
  { weekday: 5, label: 'Cuma' },
  { weekday: 6, label: 'Cumartesi' },
  { weekday: 0, label: 'Pazar' },
];

export type DayRow = { weekday: number; open: boolean; opensAt: string; closesAt: string };

export function toRows(hours: VenueHour[]): DayRow[] {
  return DAYS.map(({ weekday }) => {
    const h = hours.find((x) => x.weekday === weekday);
    return h ? { weekday, open: true, opensAt: h.opensAt, closesAt: h.closesAt } : { weekday, open: false, opensAt: '20:00', closesAt: '02:00' };
  });
}

/** API'ye giden hafta: yalnız açık günler; hiç açık gün yoksa [] = "saat bilgisi yok". */
export function toHours(rows: DayRow[]): VenueHour[] {
  return rows.filter((r) => r.open).map(({ weekday, opensAt, closesAt }) => ({ weekday, opensAt, closesAt }));
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const hoursValid = (rows: DayRow[]) => rows.every((r) => !r.open || (HHMM.test(r.opensAt) && HHMM.test(r.closesAt)));

/** Gün gün açılış–kapanış; kapanış açılıştan küçük/eşitse ertesi güne taşar (gece kulübü 23:00–05:00). */
export function HoursEditor({ rows, onChange }: { rows: DayRow[]; onChange: (rows: DayRow[]) => void }) {
  const set = (i: number, patch: Partial<DayRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const first = rows.find((r) => r.open);

  return (
    <div className="grid gap-2">
      {rows.map((r, i) => {
        const overnight = r.open && r.closesAt <= r.opensAt;
        return (
          <div key={r.weekday} className="grid grid-cols-[7rem_1fr] items-center gap-3 sm:grid-cols-[7rem_auto_1fr]">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={r.open} onChange={(e) => set(i, { open: e.target.checked })} />
              {DAYS[i].label}
            </label>
            {r.open ? (
              <div className="flex items-center gap-2">
                <Input type="time" className="w-28" value={r.opensAt} onChange={(e) => set(i, { opensAt: e.target.value })} aria-label={`${DAYS[i].label} açılış`} />
                <span className="text-muted-foreground">–</span>
                <Input type="time" className="w-28" value={r.closesAt} onChange={(e) => set(i, { closesAt: e.target.value })} aria-label={`${DAYS[i].label} kapanış`} />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Kapalı</span>
            )}
            {overnight && <span className="col-start-2 text-xs text-muted-foreground sm:col-start-auto">ertesi gün {r.closesAt}’e kadar</span>}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={!first}
          onClick={() => first && onChange(rows.map((r) => (r.open ? { ...r, opensAt: first.opensAt, closesAt: first.closesAt } : r)))}
        >
          İlk açık günün saatini tüm açık günlere uygula
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={() => onChange(rows.map((r) => ({ ...r, open: false })))}>
          Saat bilgisini temizle
        </Button>
      </div>
      {!first && <p className="text-xs text-muted-foreground">Hiç gün seçili değil: uygulamada “saat bilgisi yok” görünür, “şimdi açık” süzgecinde çıkmaz.</p>}
    </div>
  );
}
