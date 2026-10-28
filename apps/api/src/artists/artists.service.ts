import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { eventCard, flattenEvent, genreCard } from '../common/selects';
import { normalize } from '../common/text';
import { liveEventWhere } from '../events/events.service';

type IndexedArtist = { id: string; slug: string; name: string; imageUrl: string | null; keys: string[] };
export type MatchedArtist = Omit<IndexedArtist, 'keys'>;

const RADIO_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

// ICY'deki sanatçı alanında birden çok isim olabilir: "Hypaton, David Guetta", "Tarkan & Sezen Aksu", "X feat. Y".
const ARTIST_SPLIT = /\s*(?:,|&|\+|\/|;|\bfeat\.?|\bft\.?|\bfeaturing\b|\bvs\.?|\bx\b|\bile\b|\bve\b)\s*/i;

@Injectable()
export class ArtistsService {
  private index: { at: number; artists: IndexedArtist[] } | null = null;
  private readonly TTL = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  async get(slug: string) {
    const a = await this.prisma.artist.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        imageUrl: true,
        bio: true,
        genres: genreCard,
        events: {
          where: { event: liveEventWhere() },
          orderBy: { event: { startsAt: 'asc' } },
          take: 20,
          select: { event: { select: eventCard } },
        },
        // Son 7 günde hangi istasyonda çaldı (PlayLog)
        plays: {
          where: { at: { gte: new Date(Date.now() - RADIO_LOOKBACK_MS) } },
          orderBy: { at: 'desc' },
          take: 5,
          select: { at: true, title: true, station: { select: { slug: true, name: true, streamUrl: true, hasMetadata: true } } },
        },
      },
    });
    if (!a) throw new NotFoundException('Sanatçı bulunamadı');
    const { plays, ...rest } = a;
    return { ...rest, events: a.events.map((e) => flattenEvent(e.event)), onRadio: plays };
  }

  /** Admin değişikliğinden sonra eşleştirme indeksini tazele. */
  invalidate() {
    this.index = null;
  }

  /**
   * "Şu an çalan" başlığındaki sanatçıyı veritabanındaki sanatçıyla eşleştirir.
   * 1) Sanatçı alanını parçalara böl, her parçayı ad/alias ile birebir karşılaştır.
   * 2) Bulunamazsa tüm başlıkta (≥4 harfli) sanatçı adını kelime sınırıyla ara.
   */
  async match(artistField: string | null, raw: string | null): Promise<MatchedArtist | null> {
    if (!artistField && !raw) return null;
    const artists = await this.loadIndex();

    if (artistField) {
      const parts = [artistField, ...artistField.split(ARTIST_SPLIT)].map(normalize).filter(Boolean);
      for (const p of parts) {
        const hit = artists.find((a) => a.keys.includes(p));
        if (hit) return strip(hit);
      }
    }

    const hay = ` ${normalize(raw ?? artistField ?? '')} `;
    const loose = artists.find((a) => a.keys.some((k) => k.length >= 4 && hay.includes(` ${k} `)));
    return loose ? strip(loose) : null;
  }

  private async loadIndex(): Promise<IndexedArtist[]> {
    if (this.index && Date.now() - this.index.at < this.TTL) return this.index.artists;
    const rows = await this.prisma.artist.findMany({ select: { id: true, slug: true, name: true, imageUrl: true, aliases: true } });
    const artists = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      imageUrl: r.imageUrl,
      keys: [...new Set([r.name, ...r.aliases].map(normalize).filter(Boolean))],
    }));
    // Uzun isimler önce: "Mor ve Ötesi" "Mor"dan önce eşleşsin.
    artists.sort((a, b) => Math.max(...b.keys.map((k) => k.length)) - Math.max(...a.keys.map((k) => k.length)));
    this.index = { at: Date.now(), artists };
    return artists;
  }
}

function strip({ keys: _k, ...a }: IndexedArtist) {
  return a;
}
