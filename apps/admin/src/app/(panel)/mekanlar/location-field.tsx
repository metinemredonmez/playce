'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type LatLng = { lat: number; lng: number };

/**
 * Yapıştırılan Google Haritalar bağlantısı ya da "enlem, boylam" → konum.
 * Yer sayfasında !3d…!4d… yerin kendisi, @… ise ekranın ortası: önce yer.
 */
export function parseLocation(text: string): LatLng | null {
  const t = text.trim();
  const patterns = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)\s*(-?\d+\.\d+)/i,
    /^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

/** İstanbul il sınırını kabaca kapsayan kutu: dışındaysa uyar (yanlış yapıştırma / enlem-boylam yer değiştirmesi). */
const inIstanbul = (p: LatLng) => p.lat > 40.75 && p.lat < 41.65 && p.lng > 27.95 && p.lng < 29.95;

export function LocationField({ value, onChange, invalid }: { value: LatLng | null; onChange: (v: LatLng | null) => void; invalid?: string }) {
  const [paste, setPaste] = useState('');
  const [lat, setLat] = useState(value ? String(value.lat) : '');
  const [lng, setLng] = useState(value ? String(value.lng) : '');
  const [unparsed, setUnparsed] = useState(false);

  const fromInputs = (la: string, ln: string) => {
    setLat(la);
    setLng(ln);
    const p = { lat: Number(la.replace(',', '.')), lng: Number(ln.replace(',', '.')) };
    onChange(la.trim() && ln.trim() && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? p : null);
  };
  const fromPaste = (text: string) => {
    setPaste(text);
    if (!text.trim()) return setUnparsed(false);
    const p = parseLocation(text);
    setUnparsed(!p);
    if (p) {
      fromInputs(String(p.lat), String(p.lng));
      setPaste('');
    }
  };
  const d = 0.004; // önizleme kutusu (~600 m)

  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="loc-paste">Google Haritalar bağlantısı ya da “enlem, boylam” yapıştır</Label>
        <Input id="loc-paste" value={paste} onChange={(e) => fromPaste(e.target.value)} placeholder="https://www.google.com/maps/place/…  ya da  41.0369, 28.9850" />
        {unparsed && (
          <p className="text-xs text-amber-600 dark:text-amber-500">
            Konum okunamadı. Kısa bağlantıyı (maps.app.goo.gl) tarayıcıda açıp adres çubuğundakini yapıştır ya da haritada sağ tıklayıp koordinatı kopyala.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="lat">Enlem</Label>
          <Input id="lat" inputMode="decimal" value={lat} onChange={(e) => fromInputs(e.target.value, lng)} placeholder="41.0369" aria-invalid={!!invalid || undefined} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lng">Boylam</Label>
          <Input id="lng" inputMode="decimal" value={lng} onChange={(e) => fromInputs(lat, e.target.value)} placeholder="28.9850" aria-invalid={!!invalid || undefined} />
        </div>
      </div>
      {invalid && <p className="text-xs text-destructive">{invalid}</p>}
      {value && !inIstanbul(value) && <p className="text-xs text-amber-600 dark:text-amber-500">Bu konum İstanbul dışında görünüyor — enlem ve boylam yer değiştirmiş olabilir.</p>}
      {value && (
        <div className="grid gap-1.5">
          <iframe
            title="Konum önizlemesi"
            className="aspect-[2/1] w-full rounded-md border"
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${value.lng - d},${value.lat - d / 1.6},${value.lng + d},${value.lat + d / 1.6}&layer=mapnik&marker=${value.lat},${value.lng}`}
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 justify-self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3" /> Google Haritalar’da kontrol et
          </a>
        </div>
      )}
    </div>
  );
}
