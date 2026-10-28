import type { Metadata } from 'next';
import Link from 'next/link';
import { getMe } from '@/lib/me';
import { hasRole } from '@/lib/roles';
import { VenueForm } from '../venue-form';
import { loadOptions, loadVenue } from '../load';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadVenue((await params).slug)).name };
}

export default async function EditVenuePage({ params }: Props) {
  const { slug } = await params;
  const [me, [genres, districts, stations], venue] = await Promise.all([getMe(), loadOptions(), loadVenue(slug)]);
  return (
    <div className="grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <Link href="/mekanlar" className="text-sm text-muted-foreground hover:text-foreground">
          ← Mekânlar
        </Link>
        <h1 className="text-2xl font-semibold">{venue.name}</h1>
        <p className="text-sm text-muted-foreground">{venue.district}</p>
      </header>
      <VenueForm venue={venue} genres={genres} districts={districts} stations={stations} canOverride={hasRole(me.role, 'MODERATOR')} />
    </div>
  );
}
