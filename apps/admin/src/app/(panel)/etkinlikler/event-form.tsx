'use client';

import { useEffect, useEffectEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { EVENT_STATUS, PRICE_NOTES, REFUND_POLICIES, SOURCE_LABEL, TICKET_PROVIDERS } from '@/lib/events';
import { ago, fromTrInput, inputToKurus, kurusToInput, toTrInput, trDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ArtistHit, District, EventCheck, EventDetail, EventStatus, Genre, TicketProvider, VenueHit } from '@/lib/types';
import { checkEvent, deleteEvent, saveEvent, type EventPayload } from './actions';
import { GenreChips, LineupPicker, VenuePicker } from './pickers';

type Form = {
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  startsAt: string; // datetime-local, İstanbul saati
  doorsAt: string;
  endsAt: string;
  venue: VenueHit | null;
  genreSlugs: string[];
  artists: ArtistHit[];
  isFree: boolean;
  price: string; // TL
  ticketUrl: string;
  ticketProvider: TicketProvider | '';
  ageLimit: string;
  sellerName: string;
  totalPriceNote: string;
  refundPolicy: string;
};

const WEEK_MIN = 7 * 24 * 60;
const DEFAULT_EVENT_HOURS = 5; // API ile aynı: bitişi girilmemiş etkinlik

/** "2030-11-01T21:00" + dakika (saat dilimsiz yerel değer üzerinde) */
function shift(local: string, minutes: number) {
  if (!local) return '';
  return new Date(new Date(`${local}:00Z`).getTime() + minutes * 60_000).toISOString().slice(0, 16);
}

function initial(e: EventDetail | null, copy: boolean): Form {
  const t = (iso: string | null) => (copy ? shift(toTrInput(iso), WEEK_MIN) : toTrInput(iso));
  return {
    title: e?.title ?? '',
    slug: copy ? '' : (e?.slug ?? ''),
    description: e?.description ?? '',
    coverUrl: e?.coverUrl ?? '',
    startsAt: e ? t(e.startsAt) : '',
    doorsAt: e ? t(e.doorsAt) : '',
    endsAt: e ? t(e.endsAt) : '',
    venue: e?.venue ?? null,
    genreSlugs: e?.genres.map((g) => g.slug) ?? [],
    artists: e?.artists ?? [],
    isFree: e?.isFree ?? false,
    price: kurusToInput(e?.priceFrom),
    ticketUrl: e?.ticketUrl ?? '',
    ticketProvider: '',
    ageLimit: e?.ageLimit != null ? String(e.ageLimit) : '',
    sellerName: e?.sellerName ?? '',
    totalPriceNote: e?.totalPriceNote ?? '',
    refundPolicy: e?.refundPolicy ?? '',
  };
}

const isUrl = (s: string) => /^https?:\/\/\S+\.\S+/.test(s);
const orNull = (s: string) => (s.trim() ? s.trim() : null);

/**
 * İstemci doğrulaması (04 §4.2). API aynı kuralları ayrıca uygular.
 * publishing: yayında kalacak/çıkacak (kapak onayı); goingLive: şimdi yayına alınıyor (bitmiş olamaz).
 */
function validate(f: Form, o: { publishing: boolean; goingLive: boolean; coverConfirmed: boolean; coverChanged: boolean }) {
  const errors: Partial<Record<keyof Form | 'cover', string>> = {};
  if (!f.title.trim()) errors.title = 'Başlık gerekli';
  if (f.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) errors.slug = 'Yalnız küçük harf, rakam ve tire';
  if (!f.venue) errors.venue = 'Mekân seç';
  const starts = fromTrInput(f.startsAt);
  if (!starts) errors.startsAt = 'Başlangıç gerekli';
  if (starts && f.endsAt && f.endsAt <= f.startsAt) errors.endsAt = 'Bitiş başlangıçtan sonra olmalı';
  if (starts && f.doorsAt && f.doorsAt > f.startsAt) errors.doorsAt = 'Kapı açılışı başlangıçtan sonra olamaz';
  if (starts && o.goingLive) {
    const end = f.endsAt ? new Date(fromTrInput(f.endsAt)!) : new Date(new Date(starts).getTime() + DEFAULT_EVENT_HOURS * 3_600_000);
    if (end < new Date()) errors.startsAt = 'Bitmiş etkinlik yayınlanamaz';
  }
  if (!f.isFree && Number.isNaN(inputToKurus(f.price))) errors.price = 'Geçerli bir tutar gir (ör. 450 ya da 450,50)';
  if (f.ticketUrl && !isUrl(f.ticketUrl)) errors.ticketUrl = 'https:// ile başlayan adres';
  if (f.coverUrl && !isUrl(f.coverUrl)) errors.coverUrl = 'https:// ile başlayan adres';
  const age = f.ageLimit ? Number(f.ageLimit) : null;
  if (age !== null && !(Number.isInteger(age) && age >= 0 && age <= 25)) errors.ageLimit = '0–25 arası';
  if (o.publishing && f.coverUrl && o.coverChanged && !o.coverConfirmed) errors.cover = 'Kapakta alkol markası/ürünü olmadığını onayla';
  return errors;
}

function payload(f: Form, status: EventStatus, allowFlagged: boolean): EventPayload {
  return {
    title: f.title.trim(),
    ...(f.slug ? { slug: f.slug } : {}),
    description: orNull(f.description),
    coverUrl: orNull(f.coverUrl),
    startsAt: fromTrInput(f.startsAt)!,
    endsAt: fromTrInput(f.endsAt),
    doorsAt: fromTrInput(f.doorsAt),
    venueSlug: f.venue!.slug,
    genreSlugs: f.genreSlugs,
    artistSlugs: f.artists.map((a) => a.slug),
    isFree: f.isFree,
    priceFrom: f.isFree ? 0 : inputToKurus(f.price),
    ticketUrl: orNull(f.ticketUrl),
    ...(f.ticketProvider ? { ticketProvider: f.ticketProvider } : {}),
    ageLimit: f.ageLimit ? Number(f.ageLimit) : null,
    sellerName: orNull(f.sellerName),
    totalPriceNote: orNull(f.totalPriceNote),
    refundPolicy: orNull(f.refundPolicy),
    status,
    ...(allowFlagged ? { allowFlagged: true } : {}),
  };
}

export function EventForm({
  event,
  copyOf,
  genres,
  districts,
  canOverride,
}: {
  /** Düzenlenen etkinlik; yeni ya da kopyada null */
  event: EventDetail | null;
  /** Kopyalanan etkinlik (aynı bilgiler, tarih +7 gün, taslak) */
  copyOf?: EventDetail | null;
  genres: Genre[];
  districts: District[];
  canOverride: boolean;
}) {
  const router = useRouter();
  const source = event ?? copyOf ?? null;
  const [f, setF] = useState<Form>(() => initial(source, Boolean(copyOf)));
  const [baseline, setBaseline] = useState(() => JSON.stringify(f));
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [check, setCheck] = useState<EventCheck>({ flags: event?.flags ?? [], duplicates: [] });
  const [held, setHeld] = useState<string[] | null>(event?.status === 'REVIEW' && event.flags.length ? event.flags : null);
  const [allowFlagged, setAllowFlagged] = useState(false);
  const [coverOk, setCoverOk] = useState(false);
  const [pending, start] = useTransition();
  const status = event?.status ?? 'DRAFT';
  const dirty = JSON.stringify(f) !== baseline;
  const coverChanged = f.coverUrl.trim() !== (event?.coverUrl ?? '');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  // Kaydetmeden önce uyarılar: alkol denetimi + olası kopya (yazarken 600 ms sonra)
  const startsIso = fromTrInput(f.startsAt) ?? undefined;
  useEffect(() => {
    let live = true;
    const t = setTimeout(
      () =>
        void checkEvent({
          title: f.title,
          description: f.description,
          sellerName: f.sellerName,
          totalPriceNote: f.totalPriceNote,
          refundPolicy: f.refundPolicy,
          venueSlug: f.venue?.slug,
          startsAt: startsIso,
          exclude: event?.slug,
        }).then((r) => live && setCheck(r)),
      600,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [f.title, f.description, f.sellerName, f.totalPriceNote, f.refundPolicy, f.venue?.slug, startsIso, event?.slug]);

  // Kaydedilmemiş değişiklikle sayfadan çıkarken uyar
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const submit = (next: EventStatus = status) => {
    const publishing = next === 'PUBLISHED';
    const errs = validate(f, { publishing, goingLive: publishing && status !== 'PUBLISHED', coverConfirmed: coverOk, coverChanged });
    setErrors(errs);
    if (Object.keys(errs).length) return void toast.error('Formda düzeltilecek alanlar var');
    start(async () => {
      const r = await saveEvent(event?.slug ?? null, payload(f, next, allowFlagged));
      if (!r.ok) return void toast.error(r.error);
      setBaseline(JSON.stringify(f));
      const m = r.data.moderation;
      setHeld(m?.held ? m.flags : null);
      if (m?.held) toast.warning('Kaydedildi ama yayına çıkmadı: alkol denetimi', { description: m.flags.join(', ') });
      else toast.success(publishing ? 'Yayında' : event ? 'Kaydedildi' : 'Taslak oluşturuldu');
      if (!event || r.data.slug !== event.slug) router.replace(`/etkinlikler/${r.data.slug}`);
    });
  };
  // ⌘S kaydet, ⌘↵ kaydet ve yayınla
  const onShortcut = useEffectEvent((next?: EventStatus) => submit(next));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === 's') {
        e.preventDefault();
        onShortcut();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onShortcut('PUBLISHED');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const field = (k: keyof Form | 'cover') => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);
  const venueAge = f.venue?.ageLimit;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-6">
        {/* 1. Temel */}
        <Card>
          <CardHeader>
            <CardTitle>Temel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Başlık</Label>
              <Input id="title" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={140} aria-invalid={!!errors.title || undefined} autoFocus={!event} />
              {field('title')}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={f.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase())}
                placeholder="boş bırakılırsa başlık + tarihten üretilir"
                className="font-mono text-xs"
                aria-invalid={!!errors.slug || undefined}
              />
              {event && f.slug !== event.slug && <p className="text-xs text-amber-600 dark:text-amber-500">Slug değişirse paylaşılmış eski bağlantılar açılmaz.</p>}
              {field('slug')}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" value={f.description} onChange={(e) => set('description', e.target.value)} rows={6} maxLength={4000} />
              <p className="justify-self-end text-xs tabular-nums text-muted-foreground">{f.description.length} / 4000</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cover">Kapak görseli (adres)</Label>
              <div className="flex gap-3">
                <Input id="cover" value={f.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://…" aria-invalid={!!errors.coverUrl || undefined} />
                {isUrl(f.coverUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element -- dış kaynak önizleme
                  <img src={f.coverUrl} alt="" className="aspect-video h-9 shrink-0 rounded object-cover" />
                )}
              </div>
              {field('coverUrl')}
              {f.coverUrl.trim() && coverChanged && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="size-4 accent-primary" checked={coverOk} onChange={(e) => setCoverOk(e.target.checked)} />
                  Görselde alkol markası ya da ürünü yok (ADR-015)
                </label>
              )}
              {field('cover')}
              <p className="text-xs text-muted-foreground">Yükleme (sürükle-bırak, 16:9 kırpma) görsel deposu kurulunca gelecek; şimdilik adres.</p>
            </div>
          </CardContent>
        </Card>

        {/* 2. Zaman */}
        <Card>
          <CardHeader>
            <CardTitle>Zaman</CardTitle>
            <CardDescription>İstanbul saati (UTC+3).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="grid content-start gap-2">
              <Label htmlFor="startsAt">Başlangıç</Label>
              <Input id="startsAt" type="datetime-local" value={f.startsAt} onChange={(e) => set('startsAt', e.target.value)} aria-invalid={!!errors.startsAt || undefined} />
              {field('startsAt')}
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="doorsAt">Kapı açılış</Label>
              <Input id="doorsAt" type="datetime-local" value={f.doorsAt} onChange={(e) => set('doorsAt', e.target.value)} aria-invalid={!!errors.doorsAt || undefined} />
              <div className="flex gap-1">
                {[60, 30].map((m) => (
                  <Button key={m} type="button" variant="outline" size="xs" disabled={!f.startsAt} onClick={() => set('doorsAt', shift(f.startsAt, -m))}>
                    −{m === 60 ? '1 sa' : '30 dk'}
                  </Button>
                ))}
              </div>
              {field('doorsAt')}
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="endsAt">Bitiş</Label>
              <Input id="endsAt" type="datetime-local" value={f.endsAt} onChange={(e) => set('endsAt', e.target.value)} aria-invalid={!!errors.endsAt || undefined} />
              <div className="flex gap-1">
                {[2, 3, 5].map((h) => (
                  <Button key={h} type="button" variant="outline" size="xs" disabled={!f.startsAt} onClick={() => set('endsAt', shift(f.startsAt, h * 60))}>
                    +{h} sa
                  </Button>
                ))}
              </div>
              {field('endsAt')}
            </div>
            {f.startsAt && !f.endsAt && <p className="text-xs text-muted-foreground sm:col-span-3">Bitiş boşsa etkinlik başlangıçtan {DEFAULT_EVENT_HOURS} saat sonra bitmiş sayılır.</p>}
          </CardContent>
        </Card>

        {/* 3. Yer */}
        <Card>
          <CardHeader>
            <CardTitle>Yer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <VenuePicker value={f.venue} onChange={(v) => set('venue', v)} districts={districts} invalid={!!errors.venue} />
            {field('venue')}
          </CardContent>
        </Card>

        {/* 4. Müzik */}
        <Card>
          <CardHeader>
            <CardTitle>Müzik</CardTitle>
            <CardDescription>Türler keşif ve “bu gece” listelerini, lineup sanatçı takipçilerine bildirimi belirler.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label>Türler</Label>
              <GenreChips genres={genres} value={f.genreSlugs} onChange={(v) => set('genreSlugs', v)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lineup">Lineup</Label>
              <LineupPicker value={f.artists} onChange={(v) => set('artists', v)} genres={genres} />
            </div>
          </CardContent>
        </Card>

        {/* 5. Bilet ve güven */}
        <Card>
          <CardHeader>
            <CardTitle>Bilet ve güven</CardTitle>
            <CardDescription>Etkinlik sayfasındaki güven kutusu: kim satıyor, fiyata ne dahil, iade nasıl.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" className="size-4 accent-primary" checked={f.isFree} onChange={(e) => set('isFree', e.target.checked)} />
              Ücretsiz giriş
            </label>
            {!f.isFree && (
              <div className="grid content-start gap-2">
                <Label htmlFor="price">Başlangıç fiyatı (₺)</Label>
                <Input id="price" inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="450" aria-invalid={!!errors.price || undefined} />
                {field('price')}
              </div>
            )}
            <div className="grid content-start gap-2">
              <Label htmlFor="ageLimit">Yaş sınırı</Label>
              <div className="flex gap-2">
                <Input id="ageLimit" inputMode="numeric" value={f.ageLimit} onChange={(e) => set('ageLimit', e.target.value.replace(/\D/g, ''))} className="w-20" aria-invalid={!!errors.ageLimit || undefined} />
                <Button type="button" variant="outline" size="sm" onClick={() => set('ageLimit', '18')}>
                  18+
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => set('ageLimit', '')}>
                  Yok
                </Button>
              </div>
              {!f.ageLimit && venueAge ? <p className="text-xs text-muted-foreground">Boşsa mekânınki geçerli: {venueAge}+</p> : null}
              {field('ageLimit')}
            </div>
            <div className="grid content-start gap-2 sm:col-span-2">
              <Label htmlFor="ticketUrl">Bilet linki</Label>
              <div className="flex gap-2">
                <Input id="ticketUrl" value={f.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} placeholder="https://www.biletix.com/…" aria-invalid={!!errors.ticketUrl || undefined} />
                <NativeSelect className="w-44 shrink-0" aria-label="Bilet satıcısı" value={f.ticketProvider} onChange={(e) => set('ticketProvider', e.target.value as TicketProvider | '')}>
                  <option value="">Satıcı: linkten</option>
                  {(Object.keys(TICKET_PROVIDERS) as TicketProvider[]).map((p) => (
                    <option key={p} value={p}>
                      {TICKET_PROVIDERS[p]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              {event?.ticketProvider && !f.ticketProvider && (
                <p className="text-xs text-muted-foreground">Kayıtlı satıcı: {TICKET_PROVIDERS[event.ticketProvider] ?? event.ticketProvider}</p>
              )}
              {field('ticketUrl')}
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="sellerName">Satıcı / organizatör</Label>
              <Input id="sellerName" value={f.sellerName} onChange={(e) => set('sellerName', e.target.value)} maxLength={120} placeholder="Organizatör A.Ş." />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="totalPriceNote">Fiyat notu</Label>
              <Input id="totalPriceNote" value={f.totalPriceNote} onChange={(e) => set('totalPriceNote', e.target.value)} maxLength={200} />
              <Templates options={PRICE_NOTES} onPick={(v) => set('totalPriceNote', v)} />
            </div>
            <div className="grid content-start gap-2 sm:col-span-2">
              <Label htmlFor="refundPolicy">İade koşulu</Label>
              <Textarea id="refundPolicy" value={f.refundPolicy} onChange={(e) => set('refundPolicy', e.target.value)} rows={2} maxLength={500} />
              <Templates options={REFUND_POLICIES} onPick={(v) => set('refundPolicy', v)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. Yayın — sağda sabit */}
      <div className="grid content-start gap-4 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Yayın</CardTitle>
              <Badge variant={EVENT_STATUS[status].variant}>{event ? EVENT_STATUS[status].label : 'Yeni'}</Badge>
            </div>
            {event && (
              <CardDescription className="grid gap-0.5 text-xs">
                <span>
                  {SOURCE_LABEL[event.source]} · {event.saves} kayıt · {ago(event.updatedAt)} güncellendi
                </span>
                {event.fanoutAt && <span>Takipçilere bildirildi</span>}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            {check.flags.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Alkol mevzuatı (ADR-015)</AlertTitle>
                <AlertDescription>
                  {check.flags.join(', ')}. {held ? 'Etkinlik incelemede.' : 'Yayınlarsan incelemeye düşer.'}
                </AlertDescription>
              </Alert>
            )}
            {canOverride && (held || check.flags.length > 0) && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={allowFlagged} onChange={(e) => setAllowFlagged(e.target.checked)} />
                Yanlış alarm — yine de yayınla (denetim kaydına adınla geçer)
              </label>
            )}
            {check.duplicates.length > 0 && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Olası kopya</AlertTitle>
                <AlertDescription>
                  <ul className="grid gap-1">
                    {check.duplicates.map((d) => (
                      <li key={d.slug}>
                        <Link href={`/etkinlikler/${d.slug}`} target="_blank" className="underline-offset-4 hover:underline">
                          {d.title}
                        </Link>{' '}
                        · {trDateTime(d.startsAt)} · {EVENT_STATUS[d.status].label}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              {status === 'PUBLISHED' ? (
                <>
                  <Button disabled={pending} onClick={() => submit()}>
                    Kaydet
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" disabled={pending} onClick={() => submit('DRAFT')}>
                      Yayından kaldır
                    </Button>
                    <Button variant="outline" disabled={pending} onClick={() => submit('CANCELLED')}>
                      İptal et
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button disabled={pending} onClick={() => submit('PUBLISHED')}>
                    {status === 'CANCELLED' ? 'Yeniden yayınla' : 'Yayınla'}
                  </Button>
                  <Button variant="outline" disabled={pending} onClick={() => submit()}>
                    {event ? 'Kaydet' : 'Taslak olarak kaydet'}
                  </Button>
                </>
              )}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {pending ? 'Kaydediliyor…' : dirty ? 'Kaydedilmemiş değişiklik var · ' : ''}
              <kbd>⌘S</kbd> kaydet · <kbd>⌘↵</kbd> yayınla
            </p>
          </CardContent>
        </Card>

        {event && (
          <Card>
            <CardContent className="grid gap-2 text-sm">
              <Link href={`/etkinlikler/yeni?kopya=${event.slug}`} className="inline-flex items-center gap-2 underline-offset-4 hover:underline">
                <Copy className="size-4" /> Gelecek haftaya kopyala
              </Link>
              {event.refs.map((r) => (
                <a key={`${r.source}-${r.externalId}`} href={r.url ?? undefined} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-2', r.url && 'underline-offset-4 hover:underline')}>
                  <ExternalLink className="size-4" /> {TICKET_PROVIDERS[r.source as TicketProvider] ?? r.source} kaydı
                </a>
              ))}
              <DeleteButton slug={event.slug} title={event.title} saves={event.saves} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Templates({ options, onPick }: { options: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onPick(o)} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
          {o}
        </button>
      ))}
    </div>
  );
}

function DeleteButton({ slug, title, saves }: { slug: string; title: string; saves: number }) {
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-2 text-destructive underline-offset-4 hover:underline">
          <Trash2 className="size-4" /> Sil
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>“{title}” silinsin mi?</DialogTitle>
          <DialogDescription>
            Geri alınamaz.{' '}
            {saves > 0 ? `${saves} kişi kaydetmiş: silmek yerine “İptal et” onlara etkinliğin iptal olduğunu gösterir.` : 'Yayındaki etkinlik için “İptal et” tercih edilir.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Vazgeç</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteEvent(slug);
                if (r && !r.ok) toast.error(r.error);
              })
            }
          >
            Sil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
