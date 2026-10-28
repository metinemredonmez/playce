'use client';

import { useEffect, useState, useTransition } from 'react';
import { EyeOff, Link2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ArtistHit, Genre, Unmatched } from '@/lib/types';
import { createArtist, ignore, linkArtist, reopen, searchArtists } from './actions';

type Result = { ok: true } | { ok: false; error: string };

export function OpenActions({ item, genres }: { item: Unmatched; genres: Genre[] }) {
  const [pending, start] = useTransition();
  const doIgnore = () =>
    start(async () => {
      const r = await ignore(item.key);
      if (!r.ok) return void toast.error(r.error);
      toast(`“${item.display}” yoksayıldı`, {
        action: { label: 'Geri al', onClick: () => void reopen(item.key) },
      });
    });

  return (
    <div className="flex justify-end gap-1.5 whitespace-nowrap">
      <CreateDialog item={item} genres={genres} />
      <LinkDialog item={item} />
      <Button variant="ghost" size="sm" disabled={pending} onClick={doIgnore} title="Reklam, program ya da istasyon adı">
        <EyeOff /> Yoksay
      </Button>
    </div>
  );
}

export function IgnoredActions({ item }: { item: Unmatched }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await reopen(item.key);
          if (r.ok) toast.success('Kuyruğa geri alındı');
          else toast.error(r.error);
        })
      }
    >
      Kuyruğa geri al
    </Button>
  );
}

/** Sanatçı oluştur: ad kuyruktaki yazılış, türler çaldığı istasyonlardan önerilir. */
function CreateDialog({ item, genres }: { item: Unmatched; genres: Genre[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.display);
  const [picked, setPicked] = useState<string[]>(item.suggestedGenres.map((g) => g.slug));
  const [pending, start] = useTransition();
  const toggle = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((s) => s !== slug) : [...p, slug].slice(-5)));

  const save = () =>
    start(async () => {
      const r: Result = await createArtist(item.key, { name: name.trim(), genreSlugs: picked });
      if (!r.ok) return void toast.error(r.error);
      toast.success(`${name.trim()} eklendi, ${item.plays} çalma eşlendi`);
      setOpen(false);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni sanatçı</DialogTitle>
          <DialogDescription>
            Radyodaki yazılış ({item.display}) alias olarak eklenir; geçmiş {item.plays} çalma bu sanatçıya bağlanır.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`n-${item.key}`}>Ad</Label>
            <Input id={`n-${item.key}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label>Türler</Label>
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => {
                const on = picked.includes(g.slug);
                return (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => toggle(g.slug)}
                    className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', on ? 'border-transparent font-medium' : 'hover:bg-accent')}
                    style={on ? { backgroundColor: g.color, color: '#111' } : undefined}
                    aria-pressed={on}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Vazgeç</Button>
          </DialogClose>
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending ? 'Ekleniyor…' : 'Oluştur ve bağla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Mevcut sanatçıya bağla: arama ucu Türkçe karakter ve küçük yazım hatası duyarsız. */
function LinkDialog({ item }: { item: Unmatched }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ArtistHit[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void searchArtists(q).then(setHits), 250);
    return () => clearTimeout(t);
  }, [q, open]);

  const link = (artist: ArtistHit) =>
    start(async () => {
      const r: Result = await linkArtist(item.key, artist.slug);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`“${item.display}” → ${artist.name}`);
      setOpen(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setQ(item.display.split(/[,&]| feat\.? /i)[0].trim());
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 /> Bağla
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mevcut sanatçıya bağla</DialogTitle>
          <DialogDescription>“{item.display}” yazılışı seçtiğin sanatçıya alias olarak eklenir.</DialogDescription>
        </DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sanatçı ara…" autoFocus />
        <ul className="grid max-h-72 gap-1 overflow-y-auto">
          {hits.map((a) => (
            <li key={a.slug}>
              <button
                type="button"
                disabled={pending}
                onClick={() => link(a)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
              >
                <span>{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.slug}</span>
              </button>
            </li>
          ))}
          {q.trim().length >= 2 && hits.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Sonuç yok — “Sanatçı oluştur”u kullan.</li>}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
