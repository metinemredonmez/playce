import { Injectable } from '@nestjs/common';

/** cover: albüm kapağı (yalnız Triton verir) */
export type Track = { raw: string | null; artist: string | null; title: string | null; cover?: string | null };

/** Yayın sağlık kontrolü sonucu. codec: "audio/mpeg", "audio/aacp", "hls"… */
export type StreamProbe = { ok: boolean; codec: string | null; bitrate: number | null; icy: boolean; error: string | null };

// Canlı yayında "şu an çalan". İki kaynak:
// 1) Triton now-playing XML — StreamTheWorld yayınları (Karnaval: Süper, Metro, Joy, JoyTürk, Virgin):
//    sanatçı ve parça ayrı alanlarda, albüm kapağıyla. Varsa tercih edilir.
// 2) ICY StreamTitle — uygulama yayının içindeki metadata'yı okuyamıyor; burada Icy-MetaData:1 ile
//    bağlanıp ilk metadata bloğunu ayrıştırıyoruz. (Luca radyo servisinden uyarlandı.)
// Kısa cache + basit SSRF koruması.
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

    const mount = tritonMount(rawUrl);
    const triton = mount ? await this.readTriton(mount).catch(() => null) : null;
    const track = triton ?? { ...parseTrack(await this.readIcyTitle(rawUrl).catch(() => null)), cover: null };
    this.cache.set(rawUrl, { track, at: Date.now() });
    if (this.cache.size > 500) this.cache.delete(this.cache.keys().next().value as string);
    return track;
  }

  /**
   * Yayına bağlanıp yalnız başlıklara bakar (ses indirilmez): erişilebilir mi, ses mi, ICY başlığı veriyor mu.
   * HLS'te çalma listesinin geçerli olduğu kontrol edilir.
   */
  async probe(rawUrl: string): Promise<StreamProbe> {
    const fail = (error: string): StreamProbe => ({ ok: false, codec: null, bitrate: null, icy: false, error });
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return fail('Geçersiz adres');
    }
    if (url.protocol !== 'https:') return fail('Yalnız HTTPS');
    if (this.isBlockedHost(url.hostname)) return fail('İç ağ adresi');

    try {
      const res = await fetch(rawUrl, {
        headers: { 'Icy-MetaData': '1', 'User-Agent': 'Playce/0.1', Accept: '*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      });
      const type = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
      if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        return fail(`HTTP ${res.status}`);
      }
      if (/\.m3u8$/i.test(url.pathname) || type.includes('mpegurl')) {
        const head = (await res.text()).trimStart().slice(0, 7);
        return head === '#EXTM3U' ? { ok: true, codec: 'hls', bitrate: null, icy: false, error: null } : fail('Geçersiz HLS listesi');
      }
      await res.body?.cancel().catch(() => {});
      if (!/^(audio\/|application\/(ogg|octet-stream))/.test(type)) return fail(`Ses değil: ${type || 'tür yok'}`);
      const bitrate = parseInt(res.headers.get('icy-br') ?? '', 10); // "128, 128" olabilir
      return {
        ok: true,
        codec: type,
        bitrate: Number.isFinite(bitrate) ? bitrate : null,
        icy: Number(res.headers.get('icy-metaint')) > 0,
        error: null,
      };
    } catch (e) {
      return fail((e as Error).name === 'TimeoutError' ? 'Zaman aşımı' : (e as Error).message.slice(0, 200));
    }
  }

  private async readTriton(mount: string): Promise<Track | null> {
    const res = await fetch(`${TRITON_NP}?mountName=${encodeURIComponent(mount)}&eventType=track&numberToFetch=1`, {
      headers: { 'User-Agent': 'Playce/0.1' },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? parseTriton(await res.text()) : null;
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

const TRITON_NP = 'https://np.tritondigital.com/public/nowplaying';
/** Parça süresi bittikten bu kadar sonra bilgi eski sayılır (araya reklam/program girmiş olabilir) → ICY'ye düş. */
const TRITON_STALE_MS = 2 * 60_000;

/**
 * StreamTheWorld yayın adresinden Triton mount adı:
 * …/livestream-redirect/SUPER_FM.mp3 → SUPER_FM, …live.streamtheworld.com/METRO_FMAAC.aac → METRO_FMAAC.
 * Uzantı olmayabilir. "_SC" ekli adlar now-playing'de boş döner, ek atılır. StreamTheWorld değilse null.
 */
export function tritonMount(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (!/(^|\.)streamtheworld\.com$/i.test(url.hostname)) return null;
    const m = url.pathname.match(/\/([A-Z0-9_]+)(?:\.(?:mp3|aac))?$/i);
    return m ? m[1].toUpperCase().replace(/_SC$/, '') : null;
  } catch {
    return null;
  }
}

/** Triton now-playing XML'i → Track. Parça yoksa, eskiyse ya da reklamsa null. */
export function parseTriton(xml: string, now = Date.now()): Track | null {
  const prop = (name: string) =>
    xml.match(new RegExp(`<property name="${name}"><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></property>`))?.[1].trim() || null;
  const artist = prop('track_artist_name');
  const title = prop('cue_title');
  if (!artist || !title) return null;
  const start = Number(prop('cue_time_start'));
  const duration = Number(prop('cue_time_duration'));
  if (start > 0 && duration > 0 && now > start + duration + TRITON_STALE_MS) return null;
  const raw = `${artist} - ${title}`;
  if (NOT_A_TRACK.test(raw)) return null;
  const cover = prop('track_cover_url');
  // İstasyonun varsayılan görseli albüm kapağı değil
  return { raw, artist, title, cover: cover && !cover.includes('/default_images/') ? cover : null };
}

/** "Sanatçı - Parça" başlığını ayırır. Ayrılamazsa yalnız raw döner. */
export function parseTrack(raw: string | null): Track {
  if (!raw || NOT_A_TRACK.test(raw)) return { raw: null, artist: null, title: null };
  const i = raw.indexOf(' - ');
  if (i <= 0) return { raw, artist: null, title: raw };
  const artist = raw.slice(0, i).trim();
  const title = raw.slice(i + 3).trim();
  return { raw, artist: artist || null, title: title || null };
}
