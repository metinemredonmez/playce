/**
 * Temel veri — üretimde de çalışır: türler, tür etiket eşlemesi (TagGenreMap), küratörlü istasyonlar.
 * Slug ile upsert; tekrar çalıştırmak güvenli. Admin tür/istasyon ekranı gelene kadar (Faz 2)
 * bu listeler kaynak kabul edilir: değişiklik buraya yazılır ve `pnpm db:seed:base` çalıştırılır.
 * Sağlık alanlarına (status, failCount…) dokunmaz.
 */
import { PrismaClient } from '@prisma/client';
import { normalize } from '../../src/common/text';
import { run } from './run';

// Yerel türler birinci sınıf (ADR-016): Türkiye'de en çok dinlenenler önce.
export const GENRES = [
  { slug: 'turkce-pop', name: 'Türkçe Pop', color: '#FFB020', radioTag: 'turkish pop' },
  { slug: 'turkce-rap', name: 'Türkçe Rap', color: '#FDE047', radioTag: 'turkish rap' },
  { slug: 'arabesk', name: 'Arabesk & Fantezi', color: '#D946EF', radioTag: 'arabesk' },
  { slug: 'anadolu-rock', name: 'Anadolu & Türkçe Rock', color: '#B45309', radioTag: 'turkish rock' },
  { slug: 'turku', name: 'Türkü & Halk', color: '#F43F5E', radioTag: 'türkü' },
  { slug: 'fasil', name: 'Fasıl & Türk Sanat', color: '#94A3B8', radioTag: 'turkish classical' },
  { slug: 'deep-house', name: 'Deep House', color: '#8B5CF6', radioTag: 'deep house' },
  { slug: 'techno', name: 'Techno & Elektronik', color: '#FF3D71', radioTag: 'techno' },
  { slug: 'rock', name: 'Rock', color: '#FF7A1A', radioTag: 'rock' },
  { slug: 'pop', name: 'Pop', color: '#FF6FB1', radioTag: 'pop' },
  { slug: 'hip-hop', name: 'Hip-Hop & R&B', color: '#A3E635', radioTag: 'hip hop' },
  { slug: 'jazz', name: 'Caz', color: '#3DDC97', radioTag: 'jazz' },
  { slug: 'lounge', name: 'Lounge & Chill', color: '#2EC4E6', radioTag: 'lounge' },
  { slug: 'indie', name: 'Indie & Alternatif', color: '#60A5FA', radioTag: 'indie' },
];

/**
 * Dış etiket → tür (ağırlık). Last.fm / Spotify / radio-browser etiketleri normalize edilip burada aranır.
 * Bir etiket birden çok türe bölünebilir ("afro house" → Deep House 0.7 + Techno 0.3).
 */
export const TAGS: Record<string, [genre: string, weight: number][]> = {
  'turkish pop': [['turkce-pop', 1]], 'turkce pop': [['turkce-pop', 1]], 'turk pop': [['turkce-pop', 1]], 'pop turk': [['turkce-pop', 1]],
  'turkish rap': [['turkce-rap', 1]], 'turkce rap': [['turkce-rap', 1]], 'turkish hip hop': [['turkce-rap', 1]], 'turk rap': [['turkce-rap', 1]],
  'turkish trap': [['turkce-rap', 1]],
  arabesk: [['arabesk', 1]], arabesque: [['arabesk', 1]], 'turkish arabesque': [['arabesk', 1]], fantezi: [['arabesk', 1]],
  'anatolian rock': [['anadolu-rock', 1]], 'anadolu rock': [['anadolu-rock', 1]], 'turkish rock': [['anadolu-rock', 1]],
  'turkce rock': [['anadolu-rock', 1]], 'turkish psychedelic': [['anadolu-rock', 1]], 'anatolian psych': [['anadolu-rock', 1]],
  turku: [['turku', 1]], 'turkish folk': [['turku', 1]], 'turk halk muzigi': [['turku', 1]], 'halk muzigi': [['turku', 1]], baglama: [['turku', 1]],
  fasil: [['fasil', 1]], 'turk sanat muzigi': [['fasil', 1]], 'sanat muzigi': [['fasil', 1]], tsm: [['fasil', 1]],
  'turkish classical': [['fasil', 1]], 'ottoman classical': [['fasil', 1]],
  'deep house': [['deep-house', 1]], 'melodic house': [['deep-house', 1]], 'organic house': [['deep-house', 1]],
  'afro house': [['deep-house', 0.7], ['techno', 0.3]], house: [['deep-house', 0.6], ['techno', 0.4]],
  techno: [['techno', 1]], 'melodic techno': [['techno', 0.7], ['deep-house', 0.3]], 'minimal techno': [['techno', 1]],
  electronic: [['techno', 0.6], ['deep-house', 0.4]], edm: [['techno', 0.7], ['pop', 0.3]], dance: [['techno', 0.5], ['pop', 0.5]],
  trance: [['techno', 1]], electro: [['techno', 1]],
  rock: [['rock', 1]], 'classic rock': [['rock', 1]], 'hard rock': [['rock', 1]], 'alternative rock': [['rock', 0.6], ['indie', 0.4]],
  metal: [['rock', 1]], punk: [['rock', 0.6], ['indie', 0.4]],
  pop: [['pop', 1]], 'dance pop': [['pop', 1]], synthpop: [['pop', 0.6], ['indie', 0.4]], 'k pop': [['pop', 1]],
  'hip hop': [['hip-hop', 1]], rap: [['hip-hop', 1]], 'r b': [['hip-hop', 1]], rnb: [['hip-hop', 1]], trap: [['hip-hop', 1]],
  jazz: [['jazz', 1]], 'smooth jazz': [['jazz', 0.7], ['lounge', 0.3]], 'bossa nova': [['jazz', 0.6], ['lounge', 0.4]], swing: [['jazz', 1]],
  blues: [['jazz', 0.6], ['rock', 0.4]], soul: [['jazz', 0.5], ['hip-hop', 0.5]], funk: [['jazz', 0.5], ['hip-hop', 0.5]],
  lounge: [['lounge', 1]], chillout: [['lounge', 1]], downtempo: [['lounge', 1]], ambient: [['lounge', 1]], 'lo fi': [['lounge', 0.6], ['hip-hop', 0.4]],
  indie: [['indie', 1]], 'indie pop': [['indie', 1]], 'indie rock': [['indie', 0.7], ['rock', 0.3]], alternative: [['indie', 1]],
};

const STW = (id: string) => `https://playerservices.streamtheworld.com/api/livestream-redirect/${id}.mp3`;

// Hepsi HTTPS; yeni eklenenler 2026-10-28'da test edildi. HLS (.m3u8) yayınlarda "şu an çalan" yok → meta:false.
export const STATIONS: { slug: string; name: string; genre: string; url: string; country?: string; meta?: boolean }[] = [
  { slug: 'super-fm', name: 'Süper FM', genre: 'turkce-pop', url: STW('SUPER_FM'), country: 'TR' },
  { slug: 'joy-turk', name: 'Joy Türk', genre: 'turkce-pop', url: STW('JOY_TURK'), country: 'TR' },
  { slug: 'power-turk', name: 'Power Türk', genre: 'turkce-pop', url: 'https://live.powerapp.com.tr/powerturk/abr/powerturk/128/playlist.m3u8', country: 'TR', meta: false },
  { slug: 'kral-pop', name: 'Kral Pop', genre: 'turkce-pop', url: 'https://dygedge2.radyotvonline.net/kralfm/playlist.m3u8', country: 'TR', meta: false },

  { slug: 'number1-turk-rap', name: 'Number1 Türk Rap', genre: 'turkce-rap', url: 'https://dijimedya.radyotvonline.net/turkrap', country: 'TR' },
  { slug: 'powerturk-rap', name: 'PowerTürk Rap', genre: 'turkce-rap', url: 'https://live.powerapp.com.tr/powerturkrap/abr/playlist.m3u8', country: 'TR', meta: false },

  { slug: 'damar-turk', name: 'Damar Türk FM', genre: 'arabesk', url: 'https://live.radyositesihazir.com:10997/', country: 'TR' },
  { slug: 'arabesk-fm', name: 'Arabesk FM', genre: 'arabesk', url: 'https://yayin.radyoarabesk.com.tr:8000/stream', country: 'TR' },
  { slug: 'hayatmix-arabesk', name: 'Hayatmix Arabesk', genre: 'arabesk', url: 'https://radyo.yayin.com.tr:4078/mp3', country: 'TR' },

  { slug: 'joy-turk-rock', name: 'Joy Türk Rock', genre: 'anadolu-rock', url: STW('JOYTURK_ROCK'), country: 'TR' },
  { slug: 'turk-rock-fm', name: 'Türk Rock FM', genre: 'anadolu-rock', url: 'https://yayin5.radyohizmeti.com/8090/stream', country: 'TR' },

  { slug: 'trt-turku', name: 'TRT Türkü', genre: 'turku', url: 'https://rd-trtturku.medya.trt.com.tr/master_128.m3u8', country: 'TR', meta: false },
  { slug: 'radyo-7-turku', name: 'Radyo 7 Türkü', genre: 'turku', url: 'https://moondigitaledge2.radyotvonline.net/radyo7turku/playlist.m3u8', country: 'TR', meta: false },
  { slug: 'deva-fm', name: 'Deva FM Oyun Havası', genre: 'turku', url: 'https://radyo.radyoimza.com/8034/stream', country: 'TR' },

  { slug: 'trt-nagme', name: 'TRT Nağme', genre: 'fasil', url: 'https://rd-trtnagme.medya.trt.com.tr/master.m3u8', country: 'TR', meta: false },

  { slug: 'deep-house-radio', name: 'Deep House Radio', genre: 'deep-house', url: 'https://deephouse-radio.com/api/stream/free', country: 'IE' },
  { slug: 'ibiza-deep-house', name: 'Ibiza Deep House', genre: 'deep-house', url: 'https://stream.zeno.fm/lwv6zqgtv1dtv', country: 'CA' },
  { slug: '0r-deep-house', name: '0R Deep House', genre: 'deep-house', url: 'https://0nlineradio.radioho.st/technolovers-deep-house?ref=radio-browser26', country: 'DE' },

  { slug: 'intense-radio', name: 'Intense Radio', genre: 'techno', url: 'https://secure.live-streams.nl/main', country: 'NL' },
  { slug: 'i-love-dance', name: 'I Love Dance', genre: 'techno', url: 'https://streams.ilovemusic.de/iloveradio2.mp3', country: 'DE' },
  { slug: 'club-charts', name: 'Top 100 Club Charts', genre: 'techno', url: 'https://breakz-2012-high.rautemusik.fm/?ref=radiobrowser-top100-clubcharts', country: 'DE' },
  { slug: '0r-techno', name: '0R Techno', genre: 'techno', url: 'https://0nlineradio.radioho.st/technolovers-techno?ref=radio-browser26', country: 'DE' },

  { slug: 'radyo-eksen', name: 'Radyo Eksen', genre: 'rock', url: 'https://dygedge.radyotvonline.net/radyoeksen/playlist.m3u8', country: 'TR', meta: false },
  { slug: 'classic-rock-rdmix', name: 'RdMix Classic Rock', genre: 'rock', url: 'https://cast1.torontocast.com:4610/stream', country: 'CA' },

  { slug: 'metro-fm', name: 'Metro FM', genre: 'pop', url: STW('METRO_FM'), country: 'TR' },
  { slug: 'virgin-radio', name: 'Virgin Radio', genre: 'pop', url: STW('VIRGIN_RADIO'), country: 'TR' },

  { slug: 'west-coast-gfunk', name: 'West Coast G-Funk', genre: 'hip-hop', url: 'https://r.bgp.rodeo/listen/west_coast/radio.mp3', country: 'US' },
  { slug: '0r-lofi', name: '0R Lo-Fi', genre: 'hip-hop', url: 'https://0nlineradio.radioho.st/0r-lo-fi?ref=radio-browser26', country: 'DE' },

  { slug: 'joy-jazz', name: 'Joy Jazz', genre: 'jazz', url: STW('JOY_JAZZ'), country: 'TR' },
  { slug: 'soma-secret-agent', name: 'SomaFM Secret Agent', genre: 'jazz', url: 'https://ice6.somafm.com/secretagent-128-mp3', country: 'US' },
  { slug: 'bossa-jazz-brasil', name: 'Bossa Jazz Brasil', genre: 'jazz', url: 'https://centova5.transmissaodigital.com:20104/live', country: 'BR' },

  { slug: 'joy-fm', name: 'Joy FM', genre: 'lounge', url: STW('JOY_FM'), country: 'TR' },
  { slug: 'soma-groove-salad', name: 'SomaFM Groove Salad', genre: 'lounge', url: 'https://ice2.somafm.com/groovesalad-128-mp3', country: 'US' },
  { slug: 'ibiza-chillout', name: 'Ibiza Chillout Lounge', genre: 'lounge', url: 'https://0nlineradio.radioho.st/lounge-ibiza-chillout-lounge?ref=rb26', country: 'DE' },

  { slug: 'soma-indie-pop', name: 'SomaFM Indie Pop Rocks', genre: 'indie', url: 'https://ice6.somafm.com/indiepop-128-aac', country: 'US' },
  { slug: 'kexp', name: 'KEXP', genre: 'indie', url: 'https://kexp.streamguys1.com/kexp160.aac', country: 'US' },
  { slug: 'bytefm', name: 'ByteFM', genre: 'indie', url: 'https://bytefm.cast.addradio.de/bytefm/main/high/stream', country: 'DE' },
];

/** Türleri, etiket eşlemesini ve istasyonları yazar; tür slug → id döner. */
export async function seedBase(prisma: PrismaClient) {
  const genreId = new Map<string, string>();
  for (const [sort, g] of GENRES.entries()) {
    const row = await prisma.genre.upsert({ where: { slug: g.slug }, update: { ...g, sort }, create: { ...g, sort } });
    genreId.set(g.slug, row.id);
  }

  // Eşleme tamamen koddan yönetilir: sil ve yeniden yaz.
  const tags = Object.entries(TAGS).flatMap(([tag, targets]) =>
    targets.map(([genre, weight]) => {
      const id = genreId.get(genre);
      if (!id) throw new Error(`TagGenreMap: bilinmeyen tür ${genre} (${tag})`);
      return { tag: normalize(tag), genreId: id, weight };
    }),
  );
  await prisma.$transaction([prisma.tagGenreMap.deleteMany(), prisma.tagGenreMap.createMany({ data: tags })]);

  for (const [sort, s] of STATIONS.entries()) {
    const data = {
      name: s.name,
      streamUrl: s.url,
      country: s.country ?? null,
      hasMetadata: s.meta ?? true,
      sort,
      genreId: genreId.get(s.genre)!,
    };
    await prisma.station.upsert({ where: { slug: s.slug }, update: data, create: { slug: s.slug, ...data } });
  }
  return genreId;
}

if (require.main === module) run(async (prisma) => void (await seedBase(prisma)));
