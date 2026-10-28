import type { Metadata } from 'next';
import Link from 'next/link';
import { getMe } from '@/lib/me';
import { hasRole } from '@/lib/roles';
import { trDateTime } from '@/lib/format';
import { EventForm } from '../event-form';
import { loadEvent, loadOptions } from '../load';
import { loadVenue } from '../../mekanlar/load';

export const metadata: Metadata = { title: 'Yeni etkinlik' };

/** ?kopya=<slug>: aynı bilgiler, tarih +7 gün, taslak olarak açılır. ?mekan=<slug>: mekân seçili açılır. */
export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ kopya?: string; mekan?: string }> }) {
  const { kopya, mekan } = await searchParams;
  const [me, [genres, districts], copyOf, venue] = await Promise.all([
    getMe(),
    loadOptions(),
    kopya ? loadEvent(kopya) : null,
    mekan && !kopya ? loadVenue(mekan) : null,
  ]);

  return (
    <div className="grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <Link href="/etkinlikler" className="text-sm text-muted-foreground hover:text-foreground">
          ← Etkinlikler
        </Link>
        <h1 className="text-2xl font-semibold">{copyOf ? 'Etkinliği kopyala' : 'Yeni etkinlik'}</h1>
        {copyOf && (
          <p className="text-sm text-muted-foreground">
            “{copyOf.title}” ({trDateTime(copyOf.startsAt)}) bir hafta sonrasına kopyalandı. Tarihi kontrol edip kaydet.
          </p>
        )}
      </header>
      <EventForm
        event={null}
        copyOf={copyOf}
        venue={venue && { slug: venue.slug, name: venue.name, district: venue.district, ageLimit: venue.ageLimit }}
        genres={genres} districts={districts} canOverride={hasRole(me.role, 'MODERATOR')} />
    </div>
  );
}
