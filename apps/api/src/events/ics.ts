import { EventStatus } from '@prisma/client';
import { DEFAULT_EVENT_HOURS, HOUR_MS } from '../common/time';

export type IcsEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date | null;
  ticketUrl: string | null;
  status: EventStatus;
  venue: { name: string; address: string | null; district: string; lat: number | null; lng: number | null };
};

/** "Takvime ekle" dosyası (RFC 5545). Saatler UTC yazılır; takvim uygulaması yerel saate çevirir. */
export function eventIcs(e: IcsEvent, now = new Date()): string {
  const end = e.endsAt ?? new Date(e.startsAt.getTime() + DEFAULT_EVENT_HOURS * HOUR_MS);
  const v = e.venue;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Playce//Etkinlik//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.id}@playce.app`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(e.title)}`,
    `LOCATION:${text([v.name, v.address, v.district].filter(Boolean).join(', '))}`,
    v.lat !== null && v.lng !== null ? `GEO:${v.lat};${v.lng}` : null,
    e.description || e.ticketUrl ? `DESCRIPTION:${text([e.description, e.ticketUrl && `Bilet: ${e.ticketUrl}`].filter(Boolean).join('\n\n'))}` : null,
    e.ticketUrl ? `URL:${e.ticketUrl}` : null,
    `STATUS:${e.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.filter((l): l is string => l !== null).map(fold).join('\r\n') + '\r\n';
}

/** 20261101T180000Z */
function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function text(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Satırlar 75 baytı geçmez; devam satırı boşlukla başlar. UTF-8 karakterler bölünmez. */
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}
