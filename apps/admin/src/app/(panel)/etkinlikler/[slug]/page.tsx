import type { Metadata } from 'next';
import Link from 'next/link';
import { getMe } from '@/lib/me';
import { hasRole } from '@/lib/roles';
import { trDateTime } from '@/lib/format';
import { EventForm } from '../event-form';
import { loadEvent, loadOptions } from '../load';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadEvent((await params).slug)).title };
}

export default async function EditEventPage({ params }: Props) {
  const { slug } = await params;
  const [me, [genres, districts], event] = await Promise.all([getMe(), loadOptions(), loadEvent(slug)]);

  return (
    <div className="grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <Link href="/etkinlikler" className="text-sm text-muted-foreground hover:text-foreground">
          ← Etkinlikler
        </Link>
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <p className="text-sm text-muted-foreground">
          {event.venue.name} · {trDateTime(event.startsAt)}
        </p>
      </header>
      <EventForm event={event} genres={genres} districts={districts} canOverride={hasRole(me.role, 'MODERATOR')} />
    </div>
  );
}
