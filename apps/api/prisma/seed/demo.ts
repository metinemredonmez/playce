/**
 * Playce demo verisi — yalnız geliştirme içindir (NODE_ENV=production'da çalışmaz).
 * Önce temel veriyi (base.ts) yazar, sonra:
 * - Sanatçı + mekân: slug ile upsert (idempotent).
 * - Etkinlikler: source=DEMO olanlar silinip bugüne göre yeniden üretilir,
 *   yani her `pnpm db:seed` "bu gece" listesini tazeler.
 * Etkinlikler kurgusaldır; uygulamada "DEMO" rozetiyle gösterilir.
 */
import { PrismaClient } from '@prisma/client';
import { slugify } from '../../src/common/text';
import { seedBase } from './base';
import { run } from './run';

const VENUES: {
  slug: string;
  name: string;
  district: string;
  genres: string[];
  lat: number;
  lng: number;
  priceLevel: number;
  description: string;
}[] = [
  { slug: 'zorlu-psm', name: 'Zorlu PSM', district: 'Beşiktaş', genres: ['pop', 'turkce-pop', 'anadolu-rock', 'jazz'], lat: 41.0668, lng: 29.0172, priceLevel: 4, description: 'Büyük prodüksiyonlu konserler ve gösteriler için çok salonlu sahne.' },
  { slug: 'vw-arena', name: 'Volkswagen Arena', district: 'Sarıyer', genres: ['pop', 'turkce-pop', 'anadolu-rock', 'turkce-rap'], lat: 41.1103, lng: 29.0186, priceLevel: 3, description: 'Maslak’ta kalabalık konserlerin adresi.' },
  { slug: 'kucukciftlik-park', name: 'KüçükÇiftlik Park', district: 'Şişli', genres: ['turkce-pop', 'pop', 'deep-house', 'turkce-rap', 'anadolu-rock'], lat: 41.0436, lng: 28.9934, priceLevel: 3, description: 'Açık hava sahnesi; yazın festival, kışın kapalı alan.' },
  { slug: 'salon-iksv', name: 'Salon İKSV', district: 'Beyoğlu', genres: ['indie', 'anadolu-rock', 'jazz'], lat: 41.0281, lng: 28.9746, priceLevel: 2, description: 'Şişhane’de alternatif ve bağımsız müziğin evi.' },
  { slug: 'babylon-bomonti', name: 'Babylon Bomonti', district: 'Şişli', genres: ['indie', 'anadolu-rock', 'rock', 'techno'], lat: 41.0589, lng: 28.9797, priceLevel: 2, description: 'Eski bira fabrikasında konser ve kulüp geceleri.' },
  { slug: 'nardis-jazz', name: 'Nardis Jazz Club', district: 'Beyoğlu', genres: ['jazz'], lat: 41.0256, lng: 28.9739, priceLevel: 2, description: 'Galata Kulesi’nin dibinde, her gece canlı caz.' },
  { slug: 'blind', name: 'Blind', district: 'Beyoğlu', genres: ['techno', 'deep-house'], lat: 41.0316, lng: 28.9752, priceLevel: 2, description: 'Sabaha kadar elektronik; karanlık, yüksek ses.' },
  { slug: 'arkaoda', name: 'Arkaoda', district: 'Kadıköy', genres: ['indie', 'techno', 'deep-house', 'hip-hop'], lat: 40.9878, lng: 29.0284, priceLevel: 1, description: 'Kadıköy’ün bahçeli, samimi kulübü.' },
  { slug: 'moda-sahnesi', name: 'Moda Sahnesi', district: 'Kadıköy', genres: ['indie', 'rock', 'jazz'], lat: 40.9846, lng: 29.0262, priceLevel: 1, description: 'Akustik ve küçük ölçekli konserler.' },
  { slug: '360-istanbul', name: '360 İstanbul', district: 'Beyoğlu', genres: ['lounge', 'deep-house'], lat: 41.0336, lng: 28.9779, priceLevel: 4, description: 'İstiklal’in tepesinde, şehir manzaralı teras.' },
  { slug: 'anjelique', name: 'Anjelique', district: 'Ortaköy', genres: ['lounge', 'deep-house', 'pop'], lat: 41.0476, lng: 29.0275, priceLevel: 4, description: 'Boğaz kenarında akşam yemeği ve gece.' },
  { slug: 'munzur-bar', name: 'Munzur Türkü Bar', district: 'Beyoğlu', genres: ['turku'], lat: 41.0345, lng: 28.9798, priceLevel: 1, description: 'Bağlama, saz ve uzun geceler.' },
  { slug: 'harbiye-acikhava', name: 'Harbiye Cemil Topuzlu Açıkhava', district: 'Şişli', genres: ['arabesk', 'turkce-pop', 'anadolu-rock', 'fasil'], lat: 41.0455, lng: 28.9905, priceLevel: 3, description: 'Yaz konserlerinin klasik açık hava sahnesi.' },
  { slug: 'crr', name: 'Cemal Reşit Rey Konser Salonu', district: 'Şişli', genres: ['fasil', 'jazz'], lat: 41.0463, lng: 28.9899, priceLevel: 2, description: 'Harbiye’de Türk sanat müziği ve caz konserleri.' },
];

const ARTISTS: { name: string; genres: string[]; aliases?: string[] }[] = [
  // Türkçe pop
  { name: 'Tarkan', genres: ['turkce-pop'] },
  { name: 'Sezen Aksu', genres: ['turkce-pop'] },
  { name: 'Mabel Matiz', genres: ['turkce-pop', 'indie'] },
  { name: 'Dedublüman', genres: ['turkce-pop', 'indie'], aliases: ['Dedubluman'] },
  { name: 'Canozan', genres: ['turkce-pop'] },
  { name: 'Tefo', genres: ['turkce-pop'], aliases: ['Tefo & Seza', 'Tefo ve Seza'] },
  { name: 'Zeynep Bastık', genres: ['turkce-pop'] },
  { name: 'Edis', genres: ['turkce-pop'] },
  { name: 'Melike Şahin', genres: ['turkce-pop', 'indie'] },
  { name: 'Sertab Erener', genres: ['turkce-pop'] },
  // rock / indie
  { name: 'Duman', genres: ['anadolu-rock', 'rock'] },
  { name: 'Mor ve Ötesi', genres: ['anadolu-rock', 'rock'], aliases: ['MVÖ'] },
  { name: 'Manga', genres: ['anadolu-rock', 'rock'], aliases: ['maNga'] },
  { name: 'Teoman', genres: ['anadolu-rock', 'rock'] },
  { name: 'Athena', genres: ['anadolu-rock', 'rock'] },
  { name: 'Adamlar', genres: ['indie', 'rock'] },
  { name: 'Kalben', genres: ['indie'] },
  { name: 'Gaye Su Akyol', genres: ['anadolu-rock', 'indie'] },
  { name: 'Altın Gün', genres: ['anadolu-rock', 'indie'], aliases: ['Altin Gun'] },
  { name: 'Ty Segall', genres: ['indie', 'rock'] },
  // elektronik
  { name: 'Black Coffee', genres: ['deep-house'] },
  { name: 'Ben Böhmer', genres: ['deep-house'], aliases: ['Ben Bohmer'] },
  { name: 'Solomun', genres: ['deep-house', 'techno'] },
  { name: 'Mahmut Orhan', genres: ['deep-house'] },
  { name: 'Bedouin', genres: ['deep-house'] },
  { name: 'Charlotte de Witte', genres: ['techno'] },
  { name: 'Amelie Lens', genres: ['techno'] },
  { name: 'Boris Brejcha', genres: ['techno'] },
  { name: 'Hypaton', genres: ['techno'] },
  { name: 'David Guetta', genres: ['techno', 'pop'] },
  // caz / lounge
  { name: 'Kerem Görsev', genres: ['jazz'] },
  { name: 'İlhan Erşahin', genres: ['jazz', 'lounge'], aliases: ['Ilhan Ersahin'] },
  { name: 'Norah Jones', genres: ['jazz'] },
  { name: 'Thievery Corporation', genres: ['lounge'] },
  { name: 'Bonobo', genres: ['lounge', 'deep-house'] },
  // pop
  { name: 'Lady Gaga', genres: ['pop'] },
  { name: 'Dua Lipa', genres: ['pop'] },
  // Türkçe rap / hip-hop
  { name: 'Ezhel', genres: ['turkce-rap'] },
  { name: 'Ceza', genres: ['turkce-rap'] },
  { name: 'Sagopa Kajmer', genres: ['turkce-rap'] },
  { name: 'Gazapizm', genres: ['turkce-rap'] },
  { name: 'Motive', genres: ['turkce-rap'] },
  { name: 'Daz Dillinger', genres: ['hip-hop'] },
  // arabesk
  { name: 'Orhan Gencebay', genres: ['arabesk'] },
  { name: 'Müslüm Gürses', genres: ['arabesk'], aliases: ['Muslum Gurses'] },
  { name: 'Hakan Altun', genres: ['arabesk', 'turkce-pop'] },
  // Anadolu rock
  { name: 'Baba Zula', genres: ['anadolu-rock'] },
  { name: 'Barış Manço', genres: ['anadolu-rock'], aliases: ['Baris Manco'] },
  { name: 'Cem Karaca', genres: ['anadolu-rock'] },
  // fasıl / Türk sanat
  { name: 'Muazzez Ersoy', genres: ['fasil'] },
  { name: 'Zeki Müren', genres: ['fasil'] },
  // türkü
  { name: 'Erkan Oğur', genres: ['turku'] },
  { name: 'Selda Bağcan', genres: ['turku', 'anadolu-rock'] },
  { name: 'Ali Yaprak', genres: ['turku'] },
];

// day: bugünden kaç gün sonra (İstanbul), time: "HH:MM", price: TL (kuruşa çevrilir)
const EVENTS: {
  title: string;
  venue: string;
  genres: string[];
  lineup: string[];
  day: number;
  time: string;
  hours?: number;
  price?: number;
  description: string;
}[] = [
  // bu gece
  { title: 'Deep House Gecesi', venue: 'blind', genres: ['deep-house'], lineup: ['Mahmut Orhan', 'Bedouin'], day: 0, time: '23:00', hours: 6, price: 600, description: 'Sabaha kadar melodik deep house. Kapılar 23:00.' },
  { title: 'Dedublüman Akustik', venue: 'salon-iksv', genres: ['turkce-pop', 'indie'], lineup: ['Dedublüman'], day: 0, time: '21:30', hours: 2, price: 750, description: 'Yeni şarkılar ve sevilenler, sade bir akustik düzenle.' },
  { title: 'Gece Cazı', venue: 'nardis-jazz', genres: ['jazz'], lineup: ['Kerem Görsev'], day: 0, time: '22:00', hours: 3, price: 900, description: 'Kerem Görsev Trio ile standartlar ve besteler.' },
  { title: 'Türkü Gecesi', venue: 'munzur-bar', genres: ['turku'], lineup: ['Ali Yaprak'], day: 0, time: '21:00', hours: 5, price: 0, description: 'Bağlama ile canlı türküler. Giriş serbest.' },
  { title: 'Sunset Lounge', venue: '360-istanbul', genres: ['lounge', 'deep-house'], lineup: ['Bonobo'], day: 0, time: '20:00', hours: 5, price: 1200, description: 'Manzara eşliğinde downtempo ve lounge seti.' },
  { title: 'Canozan Konseri', venue: 'kucukciftlik-park', genres: ['turkce-pop'], lineup: ['Canozan'], day: 0, time: '21:00', hours: 3, price: 850, description: 'Canozan’ın en sevilen şarkıları canlı.' },
  // yarın / bu hafta
  { title: 'Techno Warehouse', venue: 'babylon-bomonti', genres: ['techno'], lineup: ['Charlotte de Witte', 'Hypaton'], day: 1, time: '23:30', hours: 6, price: 1100, description: 'Sert ve hızlı: büyük salonda tam ses techno.' },
  { title: 'Tefo & Seza Canlı', venue: 'kucukciftlik-park', genres: ['turkce-pop'], lineup: ['Tefo'], day: 1, time: '21:00', hours: 3, price: 700, description: 'Hit şarkılar ve sürprizlerle dolu bir gece.' },
  { title: 'Indie Akşamı', venue: 'moda-sahnesi', genres: ['indie'], lineup: ['Kalben'], day: 1, time: '20:30', hours: 2, price: 450, description: 'Kalben ile sakin, samimi bir konser.' },
  { title: 'Kadıköy Underground', venue: 'arkaoda', genres: ['techno', 'deep-house'], lineup: ['Ben Böhmer'], day: 2, time: '23:00', hours: 6, price: 500, description: 'Bahçede melodik techno, içeride deep house.' },
  { title: 'Duman Konseri', venue: 'vw-arena', genres: ['anadolu-rock', 'rock'], lineup: ['Duman'], day: 2, time: '21:00', hours: 3, price: 1250, description: 'Duman’dan yeni albüm ve klasikler.' },
  { title: 'Lounge Dinner', venue: 'anjelique', genres: ['lounge'], lineup: ['Thievery Corporation'], day: 2, time: '20:00', hours: 5, price: 1500, description: 'Boğaz kıyısında yemek ve lounge DJ seti.' },
  { title: 'Türkçe Rap Gecesi', venue: 'vw-arena', genres: ['turkce-rap'], lineup: ['Ezhel', 'Ceza'], day: 3, time: '21:00', hours: 4, price: 1000, description: 'Türkçe rap’in iki ismi aynı sahnede.' },
  { title: 'Mabel Matiz', venue: 'zorlu-psm', genres: ['turkce-pop'], lineup: ['Mabel Matiz'], day: 3, time: '21:00', hours: 2, price: 1400, description: 'Mabel Matiz’in yeni turnesi İstanbul’da.' },
  { title: 'Gaye Su Akyol', venue: 'salon-iksv', genres: ['anadolu-rock', 'indie'], lineup: ['Gaye Su Akyol'], day: 4, time: '21:30', hours: 2, price: 800, description: 'Anadolu psikedeliği ve fantezi rock.' },
  { title: 'Black Coffee Open Air', venue: 'kucukciftlik-park', genres: ['deep-house'], lineup: ['Black Coffee'], day: 4, time: '22:00', hours: 6, price: 1800, description: 'Afro house’un ustası tek gecelik set.' },
  { title: 'Mor ve Ötesi', venue: 'zorlu-psm', genres: ['anadolu-rock', 'rock'], lineup: ['Mor ve Ötesi'], day: 5, time: '21:00', hours: 3, price: 1100, description: 'Grubun en bilinen şarkılarıyla uzun set.' },
  { title: 'Altın Gün Konseri', venue: 'babylon-bomonti', genres: ['anadolu-rock', 'indie'], lineup: ['Altın Gün'], day: 5, time: '21:30', hours: 2, price: 900, description: 'Anadolu rock’ı yeniden yorumlayan grup.' },
  { title: 'Solomun Night', venue: 'blind', genres: ['deep-house', 'techno'], lineup: ['Solomun'], day: 6, time: '23:59', hours: 6, price: 1600, description: 'Uzun set, sabaha kadar.' },
  { title: 'Sezen Aksu Şarkıları', venue: 'zorlu-psm', genres: ['turkce-pop'], lineup: ['Sezen Aksu'], day: 6, time: '20:30', hours: 3, price: 2000, description: 'Sezen Aksu’nun repertuvarından özel bir akşam.' },
  { title: 'Norah Jones', venue: 'zorlu-psm', genres: ['jazz'], lineup: ['Norah Jones'], day: 8, time: '21:00', hours: 2, price: 2200, description: 'Piyano ve sesle sakin bir akşam.' },
  { title: 'Erkan Oğur', venue: 'salon-iksv', genres: ['turku'], lineup: ['Erkan Oğur'], day: 9, time: '20:30', hours: 2, price: 700, description: 'Perdesiz gitar ve türküler.' },
  { title: 'David Guetta', venue: 'vw-arena', genres: ['techno', 'pop'], lineup: ['David Guetta', 'Hypaton'], day: 10, time: '22:00', hours: 4, price: 2500, description: 'Stadyum enerjisinde dans gecesi.' },
  { title: 'Tarkan', venue: 'vw-arena', genres: ['turkce-pop'], lineup: ['Tarkan'], day: 11, time: '21:00', hours: 3, price: 2400, description: 'Megastar’dan hit dolu bir gece.' },
  { title: 'Teoman', venue: 'kucukciftlik-park', genres: ['anadolu-rock', 'rock'], lineup: ['Teoman'], day: 12, time: '21:00', hours: 2, price: 950, description: 'Teoman şarkılarıyla bir gece.' },
  { title: 'Amelie Lens', venue: 'babylon-bomonti', genres: ['techno'], lineup: ['Amelie Lens'], day: 13, time: '23:30', hours: 6, price: 1300, description: 'Belçikalı techno yıldızı İstanbul’da.' },
  { title: 'Lady Gaga Tribute', venue: 'anjelique', genres: ['pop'], lineup: ['Lady Gaga'], day: 7, time: '22:00', hours: 4, price: 600, description: 'Lady Gaga şarkılarıyla dans gecesi (tribute).' },
  { title: 'West Coast Classics', venue: 'arkaoda', genres: ['hip-hop'], lineup: ['Daz Dillinger'], day: 7, time: '22:30', hours: 4, price: 450, description: 'G-funk ve 90’lar hip-hop klasikleri.' },
  { title: 'Dua Lipa Pop Party', venue: 'babylon-bomonti', genres: ['pop'], lineup: ['Dua Lipa'], day: 8, time: '23:00', hours: 4, price: 500, description: 'Pop parti: Dua Lipa ve dönemin hitleri.' },
  { title: 'Gazapizm', venue: 'kucukciftlik-park', genres: ['turkce-rap'], lineup: ['Gazapizm'], day: 4, time: '21:00', hours: 3, price: 900, description: 'Yeni albüm turnesinin İstanbul durağı.' },
  { title: 'Arabesk Gecesi', venue: 'harbiye-acikhava', genres: ['arabesk'], lineup: ['Orhan Gencebay', 'Hakan Altun'], day: 5, time: '21:00', hours: 3, price: 1100, description: 'Bağlama virtüözü ve konuğuyla arabesk klasikleri.' },
  { title: 'Türk Sanat Müziği Konseri', venue: 'crr', genres: ['fasil'], lineup: ['Muazzez Ersoy'], day: 3, time: '20:30', hours: 2, price: 850, description: 'Saz heyeti eşliğinde şarkılar ve fasıl.' },
  { title: 'Anadolu Psikedelik Gecesi', venue: 'babylon-bomonti', genres: ['anadolu-rock'], lineup: ['Baba Zula'], day: 2, time: '22:00', hours: 3, price: 650, description: 'Elektro bağlama, dub ve 70’ler Anadolu rock’ı.' },
  { title: 'Ty Segall', venue: 'salon-iksv', genres: ['indie', 'rock'], lineup: ['Ty Segall'], day: 10, time: '21:00', hours: 2, price: 1200, description: 'Garaj rock’ın üretken ismi.' },
];

/**
 * İstanbul (UTC+3) gününe göre tarih üretir. API'deki "bu gece" mantığıyla aynı:
 * sabah 06:00'dan önce "bugün" hâlâ önceki gündür.
 */
function trDate(dayOffset: number, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const nowTr = new Date(Date.now() + 3 * 3600_000 - 6 * 3600_000);
  const d = Date.UTC(nowTr.getUTCFullYear(), nowTr.getUTCMonth(), nowTr.getUTCDate() + dayOffset, h, m);
  return new Date(d - 3 * 3600_000);
}

export async function seedDemo(prisma: PrismaClient, genreId: Map<string, string>) {
  const artistId = new Map<string, string>();
  for (const a of ARTISTS) {
    const slug = slugify(a.name);
    const genres = a.genres.map((g) => ({ id: genreId.get(g)! }));
    const row = await prisma.artist.upsert({
      where: { slug },
      update: { name: a.name, aliases: a.aliases ?? [], genres: { set: genres } },
      create: { slug, name: a.name, aliases: a.aliases ?? [], genres: { connect: genres } },
    });
    artistId.set(a.name, row.id);
  }

  const venueId = new Map<string, string>();
  for (const { genres: gs, ...v } of VENUES) {
    const genres = gs.map((g) => ({ id: genreId.get(g)! }));
    const row = await prisma.venue.upsert({
      where: { slug: v.slug },
      update: { ...v, source: 'DEMO', genres: { set: genres } },
      create: { ...v, source: 'DEMO', genres: { connect: genres } },
    });
    venueId.set(v.slug, row.id);
  }

  await prisma.event.deleteMany({ where: { source: 'DEMO' } });
  for (const e of EVENTS) {
    const startsAt = trDate(e.day, e.time);
    await prisma.event.create({
      data: {
        slug: `${slugify(e.title)}-${slugify(e.venue)}`,
        title: e.title,
        description: e.description,
        startsAt,
        endsAt: new Date(startsAt.getTime() + (e.hours ?? 4) * 3600_000),
        priceFrom: e.price === undefined ? null : e.price * 100,
        isFree: e.price === 0,
        // Kulüp geceleri 18+ (ADR-015)
        ageLimit: e.time >= '23:00' ? 18 : null,
        source: 'DEMO',
        // Demo etkinlikler takipçilere "yeni etkinlik" bildirimi üretmesin.
        fanoutAt: new Date(),
        venueId: venueId.get(e.venue)!,
        genres: { connect: e.genres.map((g) => ({ id: genreId.get(g)! })) },
        artists: { create: e.lineup.map((name, sort) => ({ artistId: artistId.get(name)!, sort })) },
      },
    });
  }
}

if (require.main === module) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Demo verisi üretimde yüklenmez. Temel veri için: pnpm db:seed:base');
    process.exit(1);
  }
  run(async (prisma) => seedDemo(prisma, await seedBase(prisma)));
}
