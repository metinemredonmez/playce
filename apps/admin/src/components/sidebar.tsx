'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Download, MapPin, Mic2, RadioTower, ScrollText, ShieldAlert, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/nav';
import type { Queues } from '@/lib/types';

const ICONS = {
  review: ShieldAlert,
  unmatched: Unlink,
  events: CalendarDays,
  venues: MapPin,
  artists: Mic2,
  stations: RadioTower,
  import: Download,
  audit: ScrollText,
} satisfies Record<NavItem['icon'], unknown>;

/** Rolüne göre süzülmüş menü (süzme sunucuda; burada yalnız etkin bağlantı ve rozetler). */
export function Sidebar({ groups, queues }: { groups: { title: string; items: NavItem[] }[]; queues: Queues }) {
  const path = usePathname();
  return (
    <nav className="grid gap-5">
      {groups.map((g) => (
        <div key={g.title} className="grid gap-1">
          <p className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.title}</p>
          {g.items.map((item) => {
            const Icon = ICONS[item.icon];
            const count = item.badge ? queues[item.badge] : 0;
            const body = (
              <>
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.soon ? (
                  <span className="text-[11px] text-muted-foreground">yakında</span>
                ) : count > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-medium leading-5 text-primary-foreground tabular-nums">{count}</span>
                ) : null}
              </>
            );
            const cls = 'flex items-center gap-2 rounded-md px-3 py-2 text-sm';
            return item.soon ? (
              <span key={item.href} className={cn(cls, 'cursor-not-allowed opacity-50')} aria-disabled>
                {body}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(cls, path.startsWith(item.href) ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-accent/60')}
              >
                {body}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
