import type { Metadata } from 'next';
import Link from 'next/link';
import { getMe } from '@/lib/me';
import { hasRole } from '@/lib/roles';
import { VenueForm } from '../venue-form';
import { loadOptions } from '../load';

export const metadata: Metadata = { title: 'Yeni mekân' };

export default async function NewVenuePage() {
  const [me, [genres, districts, stations]] = await Promise.all([getMe(), loadOptions()]);
  return (
    <div className="grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid gap-1">
        <Link href="/mekanlar" className="text-sm text-muted-foreground hover:text-foreground">
          ← Mekânlar
        </Link>
        <h1 className="text-2xl font-semibold">Yeni mekân</h1>
      </header>
      <VenueForm venue={null} genres={genres} districts={districts} stations={stations} canOverride={hasRole(me.role, 'MODERATOR')} />
    </div>
  );
}
