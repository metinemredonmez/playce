import { Injectable } from '@nestjs/common';

export type Track = { raw: string | null; artist: string | null; title: string | null };

// Canlı yayında "şu an çalan" (ICY StreamTitle). Uygulama yayının içindeki metadata'yı
// okuyamıyor; burada Icy-MetaData:1 ile bağlanıp ilk metadata bloğunu ayrıştırıyoruz.
// Kısa cache + basit SSRF koruması. (Luca radyo servisinden uyarlandı.)
@Injectable()
export class RadioService {
  private readonly cache = new Map<string, { track: Track; at: number }>();
  private readonly TTL = 10_000;

  // Özel/iç ağ adreslerine istek atılmasını engelle.
  private isBlockedHost(host: string): boolean {
    const h = host.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
    if (/^(127\.|10\.|169\.254\.|192\.168\.|::1|0\.0\.0\.0|\[)/.test(h)) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
    return false;
  }

  async nowPlaying(rawUrl: string): Promise<Track> {
    const empty: Track = { raw: null, artist: null, title: null };
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return empty;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return empty;
    if (this.isBlockedHost(url.hostname)) return empty;
    if (/\.m3u8$/i.test(url.pathname)) return empty; // HLS'te ICY yok

    const hit = this.cache.get(rawUrl);
    if (hit && Date.now() - hit.at < this.TTL) return hit.track;

    const raw = await this.readIcyTitle(rawUrl).catch(() => null);
    const track = parseTrack(raw);
    this.cache.set(rawUrl, { track, at: Date.now() });
    if (this.cache.size > 500) this.cache.delete(this.cache.keys().next().value as string);
    return track;
  }

  private async readIcyTitle(url: string): Promise<string | null> {
    const res = await fetch(url, {
      headers: { 'Icy-MetaData': '1', 'User-Agent': 'Playce/0.1', Accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    });
    const metaInt = Number(res.headers.get('icy-metaint'));
    if (!res.body || !Number.isFinite(metaInt) || metaInt <= 0) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    const reader = res.body.getReader();
    let audioSkipped = 0;
    let phase: 'audio' | 'len' | 'meta' = 'audio';
    let metaLen = 0;
    let metaBuf: number[] = [];
    let blocks = 0;

    try {
      // metaInt bayt ses → 1 bayt (uzunluk/16) → metadata bloğu. İlk dolu bloğu oku, bırak.
      for (let guard = 0; guard < 256; guard++) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        for (let i = 0; i < value.length; i++) {
          if (phase === 'audio') {
            audioSkipped++;
            if (audioSkipped >= metaInt) phase = 'len';
          } else if (phase === 'len') {
            metaLen = value[i] * 16;
            audioSkipped = 0;
            if (metaLen === 0) {
              // bu blokta başlık yok — birkaç blok daha dene
              if (++blocks >= 3) return null;
              phase = 'audio';
            } else {
              phase = 'meta';
            }
          } else {
            metaBuf.push(value[i]);
            if (metaBuf.length >= metaLen) {
              const text = Buffer.from(metaBuf).toString('utf8').replace(/\0+$/, '');
              const m = text.match(/StreamTitle='(.*?)';/s);
              return m?.[1]?.trim() || null;
            }
          }
        }
      }
      return null;
    } finally {
      await reader.cancel().catch(() => {});
    }
  }
}

// Reklam / jingle / istasyon adı gibi parça olmayan başlıklar.
const NOT_A_TRACK = /^(reklam|advert|commercial|jingle|haber|news|spot)\b|^\s*-\s*$/i;

/** "Sanatçı - Parça" başlığını ayırır. Ayrılamazsa yalnız raw döner. */
export function parseTrack(raw: string | null): Track {
  if (!raw || NOT_A_TRACK.test(raw)) return { raw: null, artist: null, title: null };
  const i = raw.indexOf(' - ');
  if (i <= 0) return { raw, artist: null, title: raw };
  const artist = raw.slice(0, i).trim();
  const title = raw.slice(i + 3).trim();
  return { raw, artist: artist || null, title: title || null };
}
