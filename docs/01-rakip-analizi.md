# 01 — Rakip analizi: dünya ve Türkiye

> Ekim 2026 itibarıyla. Dünya bölümü uygulama mağazası sayfaları, şirket duyuruları, tasarım incelemeleri ve geliştirici
> dokümanlarından derlendi; kaynaklar satır içinde. Tasarım notlarının bir kısmı mağaza ekran görüntüleri ve incelemelere dayanır.

## 1. Özet

- **Playce'ın döngüsünün tamamını yapan uygulama yok.** Döngü şu: canlı radyo → çalan parça → sanatçı → yerel etkinlik ve mekân.
  - **Shazam** konser tarafında en yakın uygulama: şarkıyı tanıyınca sanatçının konserlerini gösteriyor.
  - **TouchTunes** mekân tarafında en yakın uygulama: barların jukebox listelerini harita üzerinde gösteriyor.
  - **Mekâna müzik zevki eşleşme yüzdesi veren canlı bir uygulama bulunamadı.** Yalnızca prototipler var.
- **Büyük platformlar turne konserlerini kendi içine çekiyor.** Apple Music'in Konserler sekmesi, Amazon Music'in Bandsintown entegrasyonu ve Spotify Live Events bunun örnekleri.
  - Playce turne listelemede yarışmamalı. Rekabet edeceği alan: **yerel, bu gece, tür ve mekân**. Özellikle **biletsiz bar ve kulüp geceleri** hiçbir uygulamada yok.
- **Zevk verisi kilitleniyor.** Spotify, 2024–2026 arasında yeni uygulamalara erişimi daralttı ([08 §5](08-zevk-eslesme.md)).
  - Playce'ın kendi radyosu kurulum gerektirmeyen, kendini açıklayabilen bir zevk sinyali üretiyor. Bu bir avantaj.
- **Konser verisi kapalı kutuda.** Bandsintown API'si yalnız sanatçılara açık, Songkick ücretli, Eventbrite'ın herkese açık araması 2019'dan beri kapalı.
  - İstanbul'un yerel verisini toplamak (mekân, organizatör, sanatçı alias'ları) **bizim hendeğimiz** olur.

## 2. Karşılaştırma matrisi

| | Radyo | Çalan → sanatçı | Konser | Bu gece / yerel | Mekân rehberi | Zevk → eşleşme | Bilet | Türkiye |
|---|---|---|---|---|---|---|---|---|
| **Playce** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **mekân + etkinlik** | yönlendirme | ✅ |
| Shazam | — | ✅ (ses tanıma) | ✅ | kısmen | — | geçmişten | link | ✅ |
| Bandsintown | — | — | ✅ | kısmen | — | sanatçı senkronu | affiliate | sınırlı |
| Spotify Live Events | — | — | ✅ | kısmen | mekân takibi | dinleme geçmişi | partner | sınırlı |
| Resident Advisor | — | — | ✅ (elektronik) | ✅ | kulüp takibi | takip + kütüphane | ✅ | kısmen |
| DICE (Fever) | — | — | ✅ | ✅ | harita | Spotify/Apple | ✅ | — |
| Xceed | — | — | ✅ | ✅ (gece) | ✅ | — | ✅ + misafir listesi | — |
| TouchTunes | jukebox | — | — | ✅ | ✅ (bar haritası) | ortak şarkılar | — | — |
| TuneIn / Radio Garden / iHeart | ✅ | parça adı | iHeart çekiliş | — | — | — | — | ✅ (yayın) |
| Ticketmaster | — | — | ✅ | "Last Minute" | mekân takibi | For You | ✅ | Biletix üzerinden |

## 3. Dünya örnekleri

Her uygulamada: **Özellik** · **Zevki nasıl öğreniyor** · **Geri getirme** · **Gelir** · **Tasarım** · **Playce için alınacak**

### 3.1 Konser keşfi
**Shazam**
- Özellik: şarkı tanınınca şarkı ve sanatçı sayfalarında yakındaki konserler ve bilet linkleri. "My Music" içinde geçmişe göre konser önerisi. Veri Bandsintown'dan, Ticketmaster etkinlikleri 2024'ten beri bağlı ([MacRumors](https://www.macrumors.com/2023/10/25/shazam-app-concert-info/)).
- Tasarım: tek dev düğme → parça kartı → sanatçı → konser kartı. Kurulum yok.
- **Alınacak:** "eşleşme → canlı izle" kartı. Bu, Playce'ın çekirdek anıyla birebir aynı. Biz bunu radyoyla, **dinlemeye ara vermeden** yapıyoruz.

**Bandsintown**
- Özellik: sanatçı takibi, yakındaki konser uyarıları, RSVP, "şehrime gelsin" talebi, partner üzerinden bilet. Verisi Shazam, Apple Music ve Amazon Music'i besliyor ([PR, Mar 2026](https://tools.prnewswire.com/en-us/live/20823/release/20260331EN20814)).
- Zevk: Spotify/Apple Music senkronuyla otomatik takip; konum.
- Gelir: bilet affiliate, sanatçı/promoter tanıtımı, Pro veri.
- Tasarım: etkinlik kartı akışı (sanatçı fotoğrafı, tarih bloğu, şehir). Her sanatçıda baskın **Track** düğmesi.
- **Alınacak:** oynatıcıda "Takip et" düğmesi; "İstanbul'a gelsin" talebi, organizatörlere satılabilecek bir talep sinyali olur.

**Spotify Live Events**
- Özellik: Ticketmaster, AXS, DICE ve Eventbrite'tan beslenen etkinlik akışı; mekân takibi ve mekân takvimi; Fans First ön satışları; en sadık dinleyiciye bilet ayıran "Reserved" (ABD, 2026, [TechRadar](https://techradar.com/audio/spotify/spotify-will-now-reserve-concert-tickets-for-artists-biggest-fans)).
- Geri getirme: kaydedilen etkinlik satışa çıkınca veya tükenmek üzereyken uyarı.
- Tasarım: konserler sanatçı sayfasında "On tour" bölümünde; konum seçicili akış.
- **Alınacak:** mekân takibi; "satışta / son biletler" uyarıları.

**Songkick** · Sanatçı takibi, kişisel konser takvimi. 2025'te Suno satın aldı; yol haritası belirsiz ([Dataconomy](https://dataconomy.com/2025/11/26/suno-buys-songkick-in-warner-music-group-settlement-deal/)). **Alınacak:** "takip ettiklerin" ve "yakındaki tüm konserler" ayrımı.

**JamBase** · Konum, tarih, tür ve yarıçap filtreli konser bulucu. **Alınacak:** tür + mesafe filtresi.

**Setlist.fm** · Topluluğun yazdığı setlistler, "oradaydım" kaydı, kişisel konser istatistiği. **Alınacak:** "oradaydım" ve yaşam boyu istatistik, kimlik ve geri getirme kancası olarak kullanılabilir.

### 3.2 Gece hayatı ve elektronik müzik
**Resident Advisor (RA Guide)**
- Özellik: 120'den fazla ülkede listeleme. DJ, kulüp ve promoter takibi. "Interested" düğmesi, For You ve New sekmeleri. Biletler Apple Wallet'a eklenebiliyor ([App Store](https://apps.apple.com/gb/app/ra-guide/id981952703)).
- Tasarım: siyah-beyaz editoryal görünüm; lineup'taki her sanatçı dokunulabilir liste olarak duruyor.
- **Alınacak:** sadece sanatçıyı değil **kulübü ve promoter'ı** da takip etmek. İstanbul kulüp sahnesi böyle işliyor.

**DICE** (2025'te Fever satın aldı, [Pollstar](https://news.pollstar.com/2025/06/05/ticketer-dice-acquired-by-events-discovery-platform-fever/))
- Özellik: biletler yalnız telefonda; tükenen etkinlikte nominal fiyatla bekleme listesi; ücretler dahil fiyat; konser haritası; etkinlik sayfasında müzik önizlemesi.
- Zevk: onboarding'de Spotify/Apple Music bağlama (atlanabilir).
- Tasarım: koyu arayüz ([inceleme](https://ixd.prattsi.org/2026/02/design-critique-dice-ios-app/)).
  - Ana ekran: büyük öne çıkan etkinlik → yeni gösteriler → popüler sanatçılar → kişisel listeler.
  - Etkinlik sayfasında yapışkan fiyat çubuğu ve sarı satın al düğmesi.
  - Harita ve altta açılan etkinlik listesi.
- **Alınacak:** kartta müzik önizlemesi (bizde radyo); harita + alt sheet; ileride bekleme listesi.

**Xceed**
- Özellik: bilet, **ücretsiz misafir listesi**, VIP masa, QR giriş; sanatçı profilleri; mekâna kapı tarayıcı ve kat planı gibi B2B araçlar.
- Tasarım: koyu gece estetiği; gezinmede #TECHNO gibi tür etiketleri.
- **Alınacak:** misafir listesi, bilet satmadan mekâna dönüşüm sağlayan en kolay yol (C1).

**Shotgun** · Müzik servisi senkronu ve takiplere göre uyarı; organizatörün lineup'ı Spotify, Bandsintown ve Songkick'e otomatik gidiyor ([yardım](https://support-pro.shotgun.live/hc/en-us/articles/31955056295058-Display-your-event-on-Spotify-Bandsintown-Songkick)).

### 3.3 Genel "dışarı çık" ve bilet
**Fever**
- Özellik: küratörlü şehir deneyimleri ve kendi prodüksiyonları (Candlelight konserleri); 125 milyon kullanıcı.
- Tasarım: fotoğraf ağırlıklı kartlar, puan, "başlayan fiyat", şehir seçici, kategori çipleri.
- **Alınacak (ileride):** Playce'ın ya da radyonun markalı geceleri.

**Eventbrite**
- 2025'te yenilendi: Keşfet sekmesi, kişisel öneriler, editoryal "It-Lists", arkadaş ve organizatör takibi, kimlerin gittiği ([Quantisnow](https://www.quantisnow.com/insight/get-into-it-eventbrites-reimagined-app-makes-discovering-your-next-5921916)).
- **Alınacak:** editoryal seçkiler (S5).

**Ticketmaster**
- 2026'da yeniden tasarlandı: ana ekranda For You, Trending ve **Last Minute**; Watchlist sekmesi; sanatçı ve mekân takibi ([Live Nation](https://news.livenationentertainment.com/news/ticketmasters-newest-app-update-makes-discovering-and-tracking-events-easier-and-more-personalized-than-ever)).
- **Alınacak:** "Son dakika / bu gece" şeridi, Playce'ın "bu gece" kullanımının ta kendisi.

**SeatGeek** · Her ilanda renkli **Deal Score** rozeti, fiyat uyarısı, koltuk haritası. **Alınacak:** tek bakışta karşılaştırılan puan → **eşleşme % rozeti** (M8).

**Time Out** · Editoryal "en iyiler" listeleri ve şehir rehberleri. **Alınacak:** editoryal otorite ve seçkiler.

**Foursquare / Swarm**
- City Guide 2024'te kapandı ([Foursquare](https://foursquare.com/city-guide-sunset/)).
- Swarm devam ediyor: check-in, kişisel harita, istatistik, seriler, mayorluk.
- **Alınacak:** check-in ve "gittiğin yerler" haritası (C4).

### 3.4 Radyo
**TuneIn**
- Canlı radyo, spor ve podcast.
- Explorer haritası: üstte tür çipleri, istasyona dokununca altta mini oynatıcı ([Android Headlines](https://www.androidheadlines.com/2023/02/tunein-explorer-helps-users-find-radio-channels-around-the-globe.html)).
- **Alınacak:** harita + tür çipleri + kalıcı mini oynatıcı.

**Radio Garden**
- 3B dünya küresinde her yeşil nokta bir istasyon; dokun ve dinle.
- Favoriler; "çalan parça adını kopyala".
- Reklam + yıllık abonelik.
- **Alınacak:** keşfi mekânsal ve eğlenceli yapmak. İstanbul haritasında istasyonlar ve mekânlar türlerine göre parlayabilir (C8).

**iHeartRadio**
- 2024 yenilemesi: "Live Radio Dial" ve **canlı radyoda çalan şarkının sözleri** ([BusinessWire](https://www.businesswire.com/news/home/20241212043206/en/iHeartMedia-Unveils-the-Next-Generation-iHeartRadio-App)).
- Sunucuya sesli mesaj (Talkback); etkinlik gezisi çekilişleri.
- **Alınacak:** zengin "şu an çalan" ekranı; radyonun bilet çekilişleri (C6).

### 3.5 Mekân ve müzik eşleşmesine en yakın örnekler
- **TouchTunes:** Kuzey Amerika ve Avrupa'da 65 binden fazla barda jukebox. Bar haritası; gitmeden önce barın listesini gezme; parayla şarkı çaldırma ([App Store](https://apps.apple.com/app/id378351144)). Android'de "mekânla paylaştığın şarkılar" görünümü olduğu bildiriliyor.
- **Prototipler:** GetOut (öğrenci projesi, Spotify zevki → mekân), Amex Music Tastes (Spotify → restoran), MUSE (anket tabanlı, Avustralya).
- **Sonuç:** zevk → mekân eşleştirmesi yapan **canlı ve ölçekli bir ürün yok**. Bu alan Playce'ın.

## 4. Türkiye örnekleri

> Türkiye araştırması tamamlanınca bu bölüm doldurulacak (bilet platformları, radyo uygulamaları, mekân keşfi, veri erişimi, yasal gereksinimler).

## 5. Tasarım desenleri — Playce'a ne alıyoruz

| Desen | Kaynak | Playce'ta nerede |
|---|---|---|
| Eşleşme → "canlı izle" kartı | Shazam | Dinle ekranı, "Sahnede!" kutusu (M2) |
| Her sanatçıda baskın tek dokunuş takip | Bandsintown | Oynatıcı + sanatçı kartı (M3) |
| Harita + altta açılan liste | DICE, TuneIn Explorer | Bu Gece ve Mekânlar harita görünümü (M5, M6) |
| Tek bakışta renkli puan rozeti | SeatGeek Deal Score | Eşleşme % rozeti (M8) |
| "Son dakika" şeridi | Ticketmaster | Dinle ekranında "Bu gece şehirde" (M4) |
| Tür etiketleriyle gezinme | Xceed, TuneIn | Tür çipleri her ekranda |
| Lineup'ın dokunulabilir sanatçı listesi olması | RA | Etkinlik detayı "Sahnede" |
| Kulüp ve promoter takibi | RA | Mekân takibi (S1) |
| Etkinlikte müzik önizlemesi | DICE | "Bu sesi dinle" / "Mekânın sesini dinle" |
| Yapışkan fiyat + birincil eylem çubuğu | DICE | Etkinlik detayında "Bilet al" çubuğu |
| Editoryal seçkiler | Eventbrite, Time Out | Seçki kartları (S5) |
| Mekânsal ve eğlenceli keşif | Radio Garden | Parlayan İstanbul haritası (C8) |
| Kalıcı mini oynatıcı | TuneIn, Apple Music | NativeTabs alt aksesuarı (ADR-009) |

## 6. Veri kaynakları ve API'ler (dünya)

| Kaynak | Ne için | Durum / kısıt | Playce kararı |
|---|---|---|---|
| **radio-browser.info** | İstasyon keşfi | Ücretsiz, ticari kullanıma açık; sunucu `all.api.radio-browser.info` ile seçilmeli, User-Agent gönderilmeli. Yayın hakkı vermez ([docs](https://api.radio-browser.info/)) | ✅ kullanılıyor |
| **MusicBrainz** | ICY metnini temiz sanatçı kimliğine ve etiketlere çevirmek | 1 istek/sn/IP, tanımlayıcı User-Agent zorunlu; ticari kullanım MetaBrainz planlarıyla ([limit](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting)) | ✅ admin "bul ve ekle" + gece zenginleştirme |
| **Last.fm** | Kullanıcı en çok dinlenenleri, sanatçı etiketleri | API anahtarı + kullanıcı adı yeter; ticari kullanım için anlaşma ([ToS](https://www.last.fm/api/tos)) | ✅ ses profili + etiket→tür |
| **Spotify Web API** | Zevk | Geliştirme modunda 5 kullanıcı; genişletilmiş kota yalnız kurumlara ve ≥ 250 bin MAU'ya ([quota](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)); 2024 ve 2026'da birçok uç kapatıldı ([2024](https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api), [2026](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)) | ❌ lansmanda yok |
| **Apple MusicKit** | Zevk (iOS) | Developer token + kullanıcı token'ı; Expo'da native modül; Android sorunlu ([docs](https://developer.apple.com/tutorials/data/documentation/applemusicapi/user-authentication-for-musickit.md)) | 🟡 iOS, faz 3 sonu |
| **YouTube Data API** | Beğenilen videolar → sanatçı | Resmi Music geçmişi yok; doğrulanmamış Google uygulaması 100 yeni kullanıcıyla sınırlı ([Google](https://support.google.com/cloud/answer/7454865)) | 🟡 beta |
| **Ticketmaster Discovery** | Konser verisi | Ücretsiz anahtar, 5000 çağrı/gün, 5 istek/sn ([docs](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/)). Biletix verisinin dahil olup olmadığı `countryCode=TR` ile **test edilmeli** | 🔍 test et |
| **Bandsintown** | Konser verisi | API yalnız sanatçılar ve temsilcileri için; geniş kullanım ortaklıkla ([terms](https://corp.bandsintown.com/data-applications-terms)) | 🤝 ortaklık görüşmesi |
| **Songkick** | Konser verisi | Ücretli lisans; Suno'ya geçti | ❌ |
| **JamBase** | Konser + 90 bin mekân | Ücretli, 14 gün deneme, MCP sunucusu var; uluslararası kapsam belirsiz ([JamBase](https://www.jambase.com/article/jambase-self-service-data-platform-mcp-server)) | 🔍 TR kapsamını test et |
| **Eventbrite** | — | Herkese açık arama 2019'dan beri kapalı | ❌ |
| **Setlist.fm** | Setlist | Yalnız ticari olmayan kullanım | ❌ |
| **Google Places (New)** | Mekân adresi, konum, saat | 2025'ten beri ürün başına aylık ücretsiz kota ([Google](https://developers.google.com/maps/billing-and-pricing/march-2025)) | ✅ admin "Places'ten doldur" |
| **Foursquare Places** | Mekân verisi | v3 kapandı; 500 çağrı ücretsiz, sonra 1000 çağrıda 15 $; açık veri seti (FSQ OS Places) var ([docs](https://docs.foursquare.com/developer/reference/upcoming-changes)) | 🟡 açık veri setiyle ilk mekân listesi |
| **ShazamKit** | Ortam müziği tanıma | Ücretsiz; iOS + Android kütüphanesi (Android'de 16 KB sayfa boyutu sorunu bildirildi) | 🟡 C7 |
| **ACRCloud / AudD** | ICY vermeyen istasyonları tanıma | Yayın başına ayda ~26–45 $ | 🟡 yalnız önemli HLS istasyonlarda |
| **Soundtrack Your Brand** | Mekânda canlı çalan | Başvuruyla token; mekân onayı şart | 🟡 C5 |

**Lisans notu:** Spotify tüketici hesabı kişisel kullanım içindir ve barda çalınamaz ([Spotify](https://support.spotify.com/us/article/use-spotify-in-my-bar-restaurant-store-school-etc/)). Mekânın paylaştığı Spotify listesi bu yüzden "ne çalıyor" kanıtı değil, **tarz beyanıdır**.

## 7. Farkımız — fazlasını ne yapabiliriz

1. **Radyo zevk motoru olarak çalışır.** Kurulum gerektirmez, pasiftir ve önerisini açıklayabilir: "Joy Türk'te X'i dinledin, bu gece Y'de". Spotify'ın kilidine takılmaz.
2. **Bilet satılmayan sıradan bir gece de kapsamda.** Dünya uygulamaları turne konserine odaklı; İstanbul'un biletsiz bar ve kulüp geceleri boşta.
3. **Mekânlara zevk eşleşme yüzdesi veriyoruz.** Canlı ve ölçekli bir örneği yok.
4. **İstasyon ↔ mekân ↔ etkinlik grafiği kuruluyor.** Radyolar kendi dinleyicisine mekân gecesi tanıtabilir. Bu B2B'de üç taraflı bir kanal açar: radyo, mekân ve Playce.
5. **Yerel veri hendek olur.** Türk sanatçıları, alias'ları, mekânlar ve organizatörler global veritabanlarında zayıf. Eşleşmeyenler kuyruğu ve organizatör ağıyla bunu biz tamamlarız.
6. **Mekânın sesini gitmeden dinlemek mümkün.** "Mekânın sesini dinle" hiçbir rehberde yok. Bugün tür radyosuyla, faz 7'de mekânın canlı yayınıyla.
