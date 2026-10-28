'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import type { ReviewEvent } from '@/lib/types';
import { updateEvent } from './actions';

export function ReviewActions({ event, canOverride }: { event: ReviewEvent; canOverride: boolean }) {
  const [pending, start] = useTransition();
  const run = (patch: Parameters<typeof updateEvent>[1], done: string, onHeld?: (flags: string[]) => void) =>
    start(async () => {
      const r = await updateEvent(event.slug, patch);
      if (!r.ok) return void toast.error(r.error);
      if (r.data.moderation?.held) {
        const msg = `Hâlâ işaretli: ${r.data.moderation.flags.join(', ')}`;
        return onHeld ? onHeld(r.data.moderation.flags) : void toast.warning(msg);
      }
      toast.success(done);
    });

  return (
    <div className="flex flex-wrap gap-2">
      <EditDialog event={event} />
      {canOverride && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={pending}>
              Yine de yayınla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yanlış alarm mı?</DialogTitle>
              <DialogDescription>
                “{event.title}” işaretli metniyle yayına alınacak. Karar denetim kaydına adınla yazılır (ADR-015).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Vazgeç</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button onClick={() => run({ status: 'PUBLISHED', allowFlagged: true }, 'Yayınlandı')}>Yayınla</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run({ status: 'DRAFT' }, 'Taslağa alındı')}>
        Taslağa al
      </Button>
    </div>
  );
}

/** Metni düzelt ve yayınla — API yeniden denetler; hâlâ işaretliyse diyalog açık kalır, bayraklar gösterilir. */
function EditDialog({ event }: { event: ReviewEvent }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? '');
  const [held, setHeld] = useState<string[] | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await updateEvent(event.slug, { title, description, status: 'PUBLISHED' });
      if (!r.ok) return void toast.error(r.error);
      if (r.data.moderation?.held) return setHeld(r.data.moderation.flags);
      toast.success('Düzeltildi ve yayınlandı');
      setOpen(false);
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setHeld(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Düzelt ve yayınla</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Metni düzelt</DialogTitle>
          <DialogDescription>Promosyon, marka ve içki temalı ifadeleri çıkar. Kaydedince yeniden denetlenir.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`t-${event.id}`}>Başlık</Label>
            <Input id={`t-${event.id}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`d-${event.id}`}>Açıklama</Label>
            <Textarea id={`d-${event.id}`} value={description} onChange={(e) => setDescription(e.target.value)} rows={8} maxLength={4000} />
          </div>
          {held && (
            <Alert variant="destructive">
              <AlertDescription>Hâlâ işaretli: {held.join(', ')}. Etkinlik incelemede kaldı.</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Vazgeç</Button>
          </DialogClose>
          <Button onClick={save} disabled={pending || !title.trim()}>
            {pending ? 'Kaydediliyor…' : 'Kaydet ve yayınla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
