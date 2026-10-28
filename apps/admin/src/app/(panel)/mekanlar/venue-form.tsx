'use client';

import { useEffect, useEffectEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarPlus, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { GenreChips } from '@/components/genre-chips';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { SOURCE_LABEL } from '@/lib/events';
import { ago } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { District, Genre, StationHealth, VenueCheck, VenueDetail } from '@/lib/types';
import { checkVenue, deleteVenue, saveVenue, type VenuePayload } from './actions';
import { HoursEditor, hoursValid, toHours, toRows, type DayRow } from './hours-editor';
import { LocationField, type LatLng } from './location-field';

type Form = {
  name: string;
  slug: string;
  district: string;
  address: string;
  location: LatLng | null;
  description: string;
  coverUrl: string;
  genreSlugs: string[];
  soundStationSlug: string; // '' = varsayılan
  priceLevel: number | null;
  ageLimit: string;
  capacity: string;
  doorPolicy: string;
  dressCode: string;
  phone: string;
  instagram: string;
  website: string;
  reservationUrl: string;
};

const DOOR_POLICIES = ['Kimlik zorunlu', 'Seçici kapı', 'Rezervasyonla giriş'];
const DRESS_CODES = ['Serbest', 'Spor ayakkabı kabul', 'Şık giyim'];

function initial(v: VenueDetail | null): Form {
  return {
    name: v?.name ?? '',
    slug: v?.slug ?? '',
    district: v?.district ?? '',
    address: v?.address ?? '',
    location: v?.lat != null && v?.lng != null ? { lat: v.lat, lng: v.lng } : null,
    description: v?.description ?? '',
    coverUrl: v?.coverUrl ?? '',
    genreSlugs: v?.genres.map((g) => g.slug) ?? [],
    soundStationSlug: v?.soundStation?.slug ?? '',
    priceLevel: v?.priceLevel ?? null,
    ageLimit: v?.ageLimit != null ? String(v.ageLimit) : '',
    capacity: v?.capacity != null ? String(v.capacity) : '',
    doorPolicy: v?.doorPolicy ?? '',
    dressCode: v?.dressCode ?? '',
    phone: v?.phone ?? '',
    instagram: v?.instagram ?? '',
    website: v?.website ?? '',
    reservationUrl: v?.reservationUrl ?? '',
  };
}

const isUrl = (s: string) => /^https?:\/\/\S+\.\S+/.test(s);
const orNull = (s: string) => (s.trim() ? s.trim() : null);

function validate(f: Form, rows: DayRow[]) {
  const errors: Partial<Record<keyof Form | 'hours', string>> = {};
  if (!f.name.trim()) errors.name = 'Ad gerekli';
  if (f.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) errors.slug = 'Yalnız küçük harf, rakam ve tire';
  if (!f.district.trim()) errors.district = 'Semt gerekli';
  for (const k of ['coverUrl', 'website', 'reservationUrl'] as const) if (f[k] && !isUrl(f[k])) errors[k] = 'https:// ile başlayan adres';
  if (f.location && (Math.abs(f.location.lat) > 90 || Math.abs(f.location.lng) > 180)) errors.location = 'Geçersiz koordinat';
  const age = f.ageLimit ? Number(f.ageLimit) : null;
  if (age !== null && !(Number.isInteger(age) && age <= 25)) errors.ageLimit = '0–25 arası';
  const cap = f.capacity ? Number(f.capacity) : null;
  if (cap !== null && !(Number.isInteger(cap) && cap >= 1 && cap <= 100_000)) errors.capacity = '1–100.000 arası';
  if (!hoursValid(rows)) errors.hours = 'Açık günlerde saat SS:DD olmalı';
  return errors;
}

function payload(f: Form, allowFlagged: boolean): VenuePayload {
  return {
    name: f.name.trim(),
    ...(f.slug ? { slug: f.slug } : {}),
    district: f.district.trim(),
    address: orNull(f.address),
    lat: f.location?.lat ?? null,
    lng: f.location?.lng ?? null,
    description: orNull(f.description),
    coverUrl: orNull(f.coverUrl),
    instagram: orNull(f.instagram.replace(/^@/, '')),
    phone: orNull(f.phone),
    website: orNull(f.website),
    reservationUrl: orNull(f.reservationUrl),
    capacity: f.capacity ? Number(f.capacity) : null,
    priceLevel: f.priceLevel,
    ageLimit: f.ageLimit ? Number(f.ageLimit) : null,
    doorPolicy: orNull(f.doorPolicy),
    dressCode: orNull(f.dressCode),
    genreSlugs: f.genreSlugs,
    soundStationSlug: f.soundStationSlug || null,
    ...(allowFlagged ? { allowFlagged: true } : {}),
  };
}

export function VenueForm({
  venue,
  genres,
  districts,
  stations,
  canOverride,
}: {
  venue: VenueDetail | null;
  genres: Genre[];
  districts: District[];
  stations: StationHealth[];
  canOverride: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => initial(venue));
  const [rows, setRows] = useState<DayRow[]>(() => toRows(venue?.hours ?? []));
  const [baseline, setBaseline] = useState(() => ({ form: JSON.stringify(f), hours: JSON.stringify(toHours(rows)) }));
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [check, setCheck] = useState<VenueCheck>({ flags: venue?.flags ?? [], duplicates: [] });
  const [allowFlagged, setAllowFlagged] = useState(false);
  const [pending, start] = useTransition();
  const hoursChanged = JSON.stringify(toHours(rows)) !== baseline.hours;
  const dirty = JSON.stringify(f) !== baseline.form || hoursChanged;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  // Kaydetmeden önce uyarılar: alkol denetimi + aynı ad / ~100 m içinde başka mekân (600 ms sonra)
  useEffect(() => {
    let live = true;
    const t = setTimeout(
      () =>
        void checkVenue({
          name: f.name,
          description: f.description,
          doorPolicy: f.doorPolicy,
          dressCode: f.dressCode,
          ...(f.location ? { lat: f.location.lat, lng: f.location.lng } : {}),
          exclude: venue?.slug,
        }).then((r) => live && setCheck(r)),
      600,
    );
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [f.name, f.description, f.doorPolicy, f.dressCode, f.location, venue?.slug]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const submit = () => {
    const errs = validate(f, rows);
    setErrors(errs);
    if (Object.keys(errs).length) return void toast.error('Formda düzeltilecek alanlar var');
    if (check.flags.length && !allowFlagged)
      return void toast.error('Alkol mevzuatı: işaretli ifadeyi çıkar', { description: canOverride ? 'Yanlış alarmsa “yine de kaydet”i işaretle.' : check.flags.join(', ') });
    start(async () => {
      const r = await saveVenue(venue?.slug ?? null, payload(f, allowFlagged), hoursChanged || !venue ? toHours(rows) : null);
      if (!r.ok) {
        toast.error(r.error);
        if ('slug' in r && r.slug && !venue) router.replace(`/mekanlar/${r.slug}`);
        return;
      }
      setBaseline({ form: JSON.stringify(f), hours: JSON.stringify(toHours(rows)) });
      toast.success(venue ? 'Kaydedildi' : 'Mekân eklendi');
      if (!venue || r.data.slug !== venue.slug) router.replace(`/mekanlar/${r.data.slug}`);
    });
  };

  const onSave = useEffectEvent(() => submit());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const field = (k: keyof Form | 'hours') => (errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null);
  const genreName = (slug: string) => genres.find((g) => g.slug === slug)?.name ?? slug;
  const stationGroups = [...new Set(stations.map((s) => s.genre))];
  const defaultSound = venue?.defaultSound ?? null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Temel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor="name">Ad</Label>
              <Input id="name" value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={120} aria-invalid={!!errors.name || undefined} autoFocus={!venue} />
              {field('name')}
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="district">Semt</Label>
              <Input id="district" value={f.district} onChange={(e) => set('district', e.target.value)} list="districts" maxLength={60} placeholder="Kadıköy" aria-invalid={!!errors.district || undefined} />
              <datalist id="districts">
                {districts.map((d) => (
                  <option key={d.slug} value={d.name} />
                ))}
              </datalist>
              {field('district')}
            </div>
            <div className="grid content-start gap-2 sm:col-span-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={f.slug}
                onChange={(e) => set('slug', e.target.value.toLowerCase())}
                placeholder="boş bırakılırsa addan üretilir"
                className="font-mono text-xs"
                aria-invalid={!!errors.slug || undefined}
              />
              {venue && f.slug !== venue.slug && <p className="text-xs text-amber-600 dark:text-amber-500">Slug değişirse paylaşılmış eski bağlantılar açılmaz.</p>}
              {field('slug')}
            </div>
            <div className="grid content-start gap-2 sm:col-span-2">
              <Label htmlFor="address">Adres</Label>
              <Input id="address" value={f.address} onChange={(e) => set('address', e.target.value)} maxLength={300} />
            </div>
            <div className="grid content-start gap-2 sm:col-span-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" value={f.description} onChange={(e) => set('description', e.target.value)} rows={4} maxLength={2000} />
              <p className="justify-self-end text-xs tabular-nums text-muted-foreground">{f.description.length} / 2000</p>
            </div>
            <div className="grid content-start gap-2 sm:col-span-2">
              <Label htmlFor="cover">Kapak görseli (adres)</Label>
              <div className="flex gap-3">
                <Input id="cover" value={f.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} placeholder="https://…" aria-invalid={!!errors.coverUrl || undefined} />
                {isUrl(f.coverUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element -- dış kaynak önizleme
                  <img src={f.coverUrl} alt="" className="aspect-video h-9 shrink-0 rounded object-cover" />
                )}
              </div>
              {field('coverUrl')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konum</CardTitle>
            <CardDescription>Harita, “yakınımda” sıralaması ve yol tarifi bundan.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocationField value={f.location} onChange={(v) => set('location', v)} invalid={errors.location} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Çalışma saatleri</CardTitle>
            <CardDescription>İstanbul saati. “Şimdi açık” ve “bu gece” buna göre.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <HoursEditor rows={rows} onChange={setRows} />
            {field('hours')}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ses profili</CardTitle>
            <CardDescription>Türler keşif süzgeçlerini ve zevk eşleşmesini, “mekânın sesi” mekân sayfasında çalan istasyonu belirler.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label>Türler (ilk seçilen ana tür)</Label>
              <GenreChips genres={genres} value={f.genreSlugs} onChange={(v) => set('genreSlugs', v)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sound">Mekânın sesi</Label>
              <NativeSelect id="sound" value={f.soundStationSlug} onChange={(e) => set('soundStationSlug', e.target.value)}>
                <option value="">Otomatik: ana türün ilk istasyonu{defaultSound && !f.soundStationSlug ? ` (${defaultSound.name})` : ''}</option>
                {stationGroups.map((g) => (
                  <optgroup key={g} label={genreName(g)}>
                    {stations
                      .filter((s) => s.genre === g)
                      .map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.name}
                          {s.status === 'DOWN' ? ' (çalışmıyor)' : ''}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </NativeSelect>
              {venue?.soundStation?.status === 'DOWN' && f.soundStationSlug === venue.soundStation.slug && (
                <p className="text-xs text-amber-600 dark:text-amber-500">Seçili istasyon çalışmıyor; uygulama düzelene kadar otomatik seçimi çalar.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kapı ve fiyat</CardTitle>
            <CardDescription>Mekân sayfasındaki güven kutusu. Yaş sınırı, sınırı girilmemiş etkinliklerine de geçer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label>Fiyat seviyesi</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <Button key={n} type="button" size="sm" variant={f.priceLevel === n ? 'default' : 'outline'} onClick={() => set('priceLevel', f.priceLevel === n ? null : n)}>
                    {'₺'.repeat(n)}
                  </Button>
                ))}
              </div>
            </div>
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
              {field('ageLimit')}
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="capacity">Kapasite</Label>
              <Input id="capacity" inputMode="numeric" value={f.capacity} onChange={(e) => set('capacity', e.target.value.replace(/\D/g, ''))} className="w-32" aria-invalid={!!errors.capacity || undefined} />
              {field('capacity')}
            </div>
            <div className="hidden sm:block" />
            <div className="grid content-start gap-2">
              <Label htmlFor="doorPolicy">Kapı politikası</Label>
              <Input id="doorPolicy" value={f.doorPolicy} onChange={(e) => set('doorPolicy', e.target.value)} maxLength={200} />
              <Templates options={DOOR_POLICIES} onPick={(v) => set('doorPolicy', v)} />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="dressCode">Kıyafet kuralı</Label>
              <Input id="dressCode" value={f.dressCode} onChange={(e) => set('dressCode', e.target.value)} maxLength={200} />
              <Templates options={DRESS_CODES} onPick={(v) => set('dressCode', v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İletişim</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid content-start gap-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} maxLength={30} placeholder="+90 212 …" />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} maxLength={60} placeholder="kullanıcı adı" />
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="website">Web sitesi</Label>
              <Input id="website" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" aria-invalid={!!errors.website || undefined} />
              {field('website')}
            </div>
            <div className="grid content-start gap-2">
              <Label htmlFor="reservationUrl">Rezervasyon linki</Label>
              <Input id="reservationUrl" value={f.reservationUrl} onChange={(e) => set('reservationUrl', e.target.value)} placeholder="https://…" aria-invalid={!!errors.reservationUrl || undefined} />
              {field('reservationUrl')}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader className="gap-2">
            <CardTitle>Kayıt</CardTitle>
            {venue && (
              <CardDescription className="grid gap-0.5 text-xs">
                <span>
                  {venue.openNow === null ? 'Saat bilgisi yok' : venue.openNow ? `Şu an açık${venue.openUntil ? ` · ${venue.openUntil}’e kadar` : ''}` : 'Şu an kapalı'}
                </span>
                <span>
                  {SOURCE_LABEL[venue.source]} · {venue.followers} takipçi · {ago(venue.updatedAt)} güncellendi
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            {check.flags.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Alkol mevzuatı (ADR-015)</AlertTitle>
                <AlertDescription>{check.flags.join(', ')}. Mekân metni işaretliyken kaydedilmez.</AlertDescription>
              </Alert>
            )}
            {canOverride && check.flags.length > 0 && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={allowFlagged} onChange={(e) => setAllowFlagged(e.target.checked)} />
                Yanlış alarm — yine de kaydet (denetim kaydına adınla geçer)
              </label>
            )}
            {check.duplicates.length > 0 && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>Aynı mekân olabilir</AlertTitle>
                <AlertDescription>
                  <ul className="grid gap-1">
                    {check.duplicates.map((d) => (
                      <li key={d.slug}>
                        <Link href={`/mekanlar/${d.slug}`} target="_blank" className="underline-offset-4 hover:underline">
                          {d.name}
                        </Link>{' '}
                        · {d.district} · {d.reason === 'name' ? 'aynı ad' : `${d.meters} m uzakta`}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            <Button disabled={pending} onClick={submit}>
              {venue ? 'Kaydet' : 'Mekânı ekle'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {pending ? 'Kaydediliyor…' : dirty ? 'Kaydedilmemiş değişiklik var · ' : ''}
              <kbd>⌘S</kbd> kaydet
            </p>
          </CardContent>
        </Card>

        {venue && (
          <Card>
            <CardContent className="grid gap-2 text-sm">
              <Link href={`/etkinlikler/yeni?mekan=${venue.slug}`} className="inline-flex items-center gap-2 underline-offset-4 hover:underline">
                <CalendarPlus className="size-4" /> Bu mekâna etkinlik ekle
              </Link>
              <Link href={`/etkinlikler?venue=${venue.slug}`} className="inline-flex items-center gap-2 underline-offset-4 hover:underline">
                <ExternalLink className="size-4" /> Yaklaşan etkinlikler ({venue.upcomingEvents})
              </Link>
              {venue.refs.map((r) => (
                <a key={`${r.source}-${r.externalId}`} href={r.url ?? undefined} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-2', r.url && 'underline-offset-4 hover:underline')}>
                  <ExternalLink className="size-4" /> {r.source} kaydı
                </a>
              ))}
              <DeleteButton slug={venue.slug} name={venue.name} />
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

function DeleteButton({ slug, name }: { slug: string; name: string }) {
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
          <DialogTitle>“{name}” silinsin mi?</DialogTitle>
          <DialogDescription>Geri alınamaz. Etkinliği olan mekân silinmez: önce etkinlikleri sil ya da başka mekâna taşı.</DialogDescription>
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
                const r = await deleteVenue(slug);
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
