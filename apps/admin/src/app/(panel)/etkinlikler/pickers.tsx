'use client';

import { useEffect, useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ArtistHit, District, Genre, VenueHit } from '@/lib/types';
import { lookupArtists, lookupVenues, quickArtist, quickVenue } from './actions';

/**
 * Yazdıkça arama (250 ms); bayat yanıt yenisinin üstüne yazmaz.
 * searched: sonuç şu anki sorgunun mu ("bulunamadı" yalnız arama bitince gösterilir).
 */
function useLookup<T>(q: string, fn: (q: string) => Promise<T[]>) {
  const [result, setResult] = useState<{ q: string; hits: T[] }>({ q: '', hits: [] });
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => void fn(q).then((hits) => live && setResult({ q, hits })), 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, fn]);
  const active = q.trim().length >= 2;
  return { hits: active && result.q === q ? result.hits : [], searched: active && result.q === q };
}

function HitList<T>({ hits, render, onPick }: { hits: T[]; render: (h: T) => React.ReactNode; onPick: (h: T) => void }) {
  if (!hits.length) return null;
  return (
    <ul className="grid overflow-hidden rounded-md border">
      {hits.map((h, i) => (
        <li key={i}>
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => onPick(h)}>
            {render(h)}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---- mekân ----

export function VenuePicker({
  value,
  onChange,
  districts,
  invalid,
}: {
  value: VenueHit | null;
  onChange: (v: VenueHit | null) => void;
  districts: District[];
  invalid?: boolean;
}) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const { hits, searched } = useLookup(q, lookupVenues);

  if (value)
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {value.district}
            {value.ageLimit ? ` · ${value.ageLimit}+` : ''}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Değiştir
        </Button>
      </div>
    );

  return (
    <div className="grid gap-2">
      <div className="flex gap-2">
        <Input id="venue" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mekân ara (en az 2 harf)" aria-invalid={invalid || undefined} autoComplete="off" />
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          <Plus /> Yeni
        </Button>
      </div>
      <HitList
        hits={hits}
        onPick={(v) => {
          onChange(v);
          setQ('');
        }}
        render={(v) => (
          <>
            <span className="flex-1 truncate">{v.name}</span>
            <span className="text-xs text-muted-foreground">{v.district}</span>
          </>
        )}
      />
      {searched && hits.length === 0 && <p className="text-xs text-muted-foreground">Bulunamadı — “Yeni” ile ekleyebilirsin.</p>}
      <QuickVenueDialog open={adding} onOpenChange={setAdding} initialName={q} districts={districts} onCreated={onChange} />
    </div>
  );
}

function QuickVenueDialog({
  open,
  onOpenChange,
  initialName,
  districts,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialName: string;
  districts: District[];
  onCreated: (v: VenueHit) => void;
}) {
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await quickVenue({ name: name.trim(), district: district.trim(), ...(address.trim() ? { address: address.trim() } : {}) });
      if (!r.ok) return setError(r.error);
      toast.success(`${r.data.name} eklendi — konum ve saatleri Mekânlar ekranından tamamla`);
      onCreated(r.data);
      onOpenChange(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(initialName.trim());
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hızlı mekân ekle</DialogTitle>
          <DialogDescription>Ad ve semt yeter. Konum, saatler ve kapak sonra Mekânlar ekranından eklenir.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="qv-name">Ad</Label>
            <Input id="qv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qv-district">Semt</Label>
            <Input id="qv-district" value={district} onChange={(e) => setDistrict(e.target.value)} list="qv-districts" maxLength={60} placeholder="Kadıköy" />
            <datalist id="qv-districts">
              {districts.map((d) => (
                <option key={d.slug} value={d.name} />
              ))}
            </datalist>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qv-address">Adres (isteğe bağlı)</Label>
            <Input id="qv-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Vazgeç</Button>
          </DialogClose>
          <Button onClick={save} disabled={pending || !name.trim() || !district.trim()}>
            {pending ? 'Ekleniyor…' : 'Ekle ve seç'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- tür ----

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

// ---- lineup ----

/** Sıra = lineup sırası, ilk = headliner. */
export function LineupPicker({ value, onChange, genres }: { value: ArtistHit[]; onChange: (v: ArtistHit[]) => void; genres: Genre[] }) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const hits = useLookup(q, lookupArtists).hits.filter((a) => !value.some((v) => v.slug === a.slug));
  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  const add = (a: ArtistHit) => {
    if (!value.some((v) => v.slug === a.slug)) onChange([...value, a]);
    setQ('');
  };

  return (
    <div className="grid gap-2">
      {value.length > 0 && (
        <ol className="grid divide-y rounded-md border">
          {value.map((a, i) => (
            <li key={a.slug} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="w-5 text-xs tabular-nums text-muted-foreground">{i + 1}.</span>
              <span className="flex-1 truncate">{a.name}</span>
              {i === 0 && <Badge variant="secondary">headliner</Badge>}
              <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Yukarı">
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı">
                <ArrowDown />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => onChange(value.filter((v) => v.slug !== a.slug))} aria-label="Çıkar">
                <X />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-2">
        <Input id="lineup" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sanatçı ekle (ara)" autoComplete="off" />
        <Button type="button" variant="outline" onClick={() => setAdding(true)}>
          <Plus /> Yeni
        </Button>
      </div>
      <HitList hits={hits} onPick={add} render={(a) => <span className="flex-1 truncate">{a.name}</span>} />
      <QuickArtistDialog open={adding} onOpenChange={setAdding} initialName={q} genres={genres} onCreated={add} />
    </div>
  );
}

function QuickArtistDialog({
  open,
  onOpenChange,
  initialName,
  genres,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialName: string;
  genres: Genre[];
  onCreated: (a: ArtistHit) => void;
}) {
  const [name, setName] = useState('');
  const [genreSlugs, setGenreSlugs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await quickArtist({ name: name.trim(), genreSlugs });
      if (!r.ok) return setError(r.error);
      toast.success(`${r.data.name} eklendi`);
      onCreated(r.data);
      onOpenChange(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setName(initialName.trim());
          setGenreSlugs([]);
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hızlı sanatçı ekle</DialogTitle>
          <DialogDescription>Radyoda bu adla çalan eşleşmeyen kayıtlar da otomatik bağlanır.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="qa-name">Ad</Label>
            <Input id="qa-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label>Türler</Label>
            <GenreChips genres={genres} value={genreSlugs} onChange={setGenreSlugs} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Vazgeç</Button>
          </DialogClose>
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending ? 'Ekleniyor…' : 'Ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
