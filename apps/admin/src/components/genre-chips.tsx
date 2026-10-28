'use client';

import { cn } from '@/lib/utils';
import type { Genre } from '@/lib/types';

/** Tür seçimi: renkli çipler (etkinlik, mekân, sanatçı formları) */
export function GenreChips({ genres, value, onChange }: { genres: Genre[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {genres.map((g) => {
        const on = value.includes(g.slug);
        return (
          <button
            key={g.slug}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((s) => s !== g.slug) : [...value, g.slug])}
            className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors', on ? 'border-transparent text-white' : 'hover:bg-accent')}
            style={on ? { background: g.color } : undefined}
          >
            {!on && <span className="size-2 rounded-full" style={{ background: g.color }} />}
            {g.name}
          </button>
        );
      })}
    </div>
  );
}
