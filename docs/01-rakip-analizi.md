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
- **Türkiye'de parçalar dağınık.**
  - fizy şarkı tanıyor, Muud etkinlik gösteriyor, BUGECE "bu gece"yi yapıyor, Karnaval radyoyu yapıyor. **Hiçbiri hepsini birleştirmiyor.**
  - Biletçilerin herkese açık API'si yok; en gerçekçi veri kaynağı Etkinlik.io API'si ve organizatör girişi.
  - Yeni alkol yasası (7584, Haziran 2026) gece hayatı içeriğini sınırlıyor.
  - Türk radyo uygulamalarının en büyük şikâyeti **reklam**, biletçilerinkiyse **iade ve gizli ücret**.

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
| **fizy** (TR) | fizy radyoları | ✅ "NeBuÇalan" (ses tanıma) | ücretsiz konser bileti | — | — | ruh hâli listeleri | kampanya | ✅ |
| **Muud** (TR) | — | — | ana sayfada etkinlik | — | — | tür/sanatçı seçimi | — | ✅ |
| **Karnaval / PowerApp** (TR) | ✅ | şarkı bilgisi + kapak | — | — | — | basit öneri | — | ✅ |
| **BUGECE** (TR) | — | — | ✅ (gece) | ✅ | DJ/mekân/promoter takibi | — | ✅ | ✅ |
| **NeYapsak?** (TR) | — | — | ✅ | ✅ harita | kısmen | — | link | ✅ |
| **Bubilet / Biletix / Passo** (TR) | — | — | ✅ | kısmen | — | — | ✅ | ✅ |

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

> **Yöntem:**
> - App Store TR verisi iTunes Lookup ve RSS üzerinden toplandı: genel puan, oy sayısı ve son 50 TR yorumun ortalaması (son yorumlar şikâyete yatkındır).
> - Radyo metadata testleri 28 Ekim 2026'da yapıldı.
> - Tasarım notları mağaza metinlerinden ve yorumlardan çıkarıldı; uygulamalar kurulup ekran ekran incelenmedi.

### 4.1 Bilet ve etkinlik keşfi
| Uygulama | Ne sunuyor | Gelir | ★ (oy) / son 50 yorum | En sık şikâyet | Playce için ders |
|---|---|---|---|---|---|
| **Biletix** (Ticketmaster) | En geniş katalog; ana ekranda kategori ve kampanya vitrini | Hizmet bedeli. 2019'da hizmet bedeli için Rekabet Kurumu soruşturması açıldı ([Webrazzi](https://webrazzi.com/2019/07/22/rekabet-kurumu-biletix-sorusturma/)) | 1,70 (208) / 1,34 | Güncellemeden sonra çökme, saatlerce kuyruk, iade edilmeyen "iade edilebilir" bilet | Toplam fiyat ilk ekranda; yoğun anda kuyruk |
| **Passo** | Passolig ve maçlar, konser, tiyatro; alışveriş, yemek, sanal kart içeren bir "süper uygulama". İKSV'nin bilet ortağı | Hizmet bedeli, finansal çapraz satış | 4,42 (35,4K) / 1,52 | Maç günü hata, hesap blokesi, dağınık kapsam | Tek amaçlı, sade akış |
| **Bubilet** (İzmir, 2017) | Önce şehir seçiliyor; tür, tarih, konum ve fiyat filtreleri | Hizmet bedeli. 2025'in 11 ayında 4,4M bilet, 3,13M'si konser ([Webrazzi](https://webrazzi.com/2025/12/11/bubilet-in-2025-performansi-ve-son-uc-yilda-one-cikan-verileri/)) | 4,42 (27,7K) / 2,92 | Donma, iptal/iade, münhasır etkinliklere tepki | **En hızlı büyüyen konser satıcısı → ilk ortaklık hedefi** |
| **Biletinial** | Sinema, tiyatro, Kültür Bakanlığı ve İBB Şehir Tiyatroları satışları; mekânlara yazılım | Hizmet bedeli + B2B yazılım | 4,62 (23,1K) / 1,34 | Güncellemede sekme kayboldu, oturum düşüyor | Bilgi mimarisi değişikliği kademeli yapılmalı |
| **Mobilet** | "Sosyal planlama": arkadaşlarla keşif, ilgisiz etkinliği gizleme | Hizmet bedeli, Platinum üyelik | 4,81 (991) / 1,56 | Boş görünen koltuk son adımda "dolu", SMS aboneliği iptal edilemiyor | Sosyal fikir iyi; stok bilgisi gerçek zamanlı olmalı |
| **Biletino** | Organizatörün kendi kurduğu biletleme, küçük etkinlikler | Organizatör komisyonu | 3,55 (11) | Tüketici uygulaması zayıf | Organizatörün etkinliği kendisinin girmesi modeli |
| **BUGECE** | Kulüp ve gece hayatı: yakınlık, mekân, DJ ve promoter araması; DJ/mekân/promoter takibi; QR "Fast Pass"; koyu tema, 17+ | Bilet komisyonu | 3,32 (379) / 2,82 | Giriş sorunları, iade, kapı politikası | **"Bu gece" alanındaki en yakın rakip** — ama müzik zevki ya da radyo yok |
| **NeYapsak?** (Haziran 2026) | Tüm etkinlikler haritada, 14 kategori; şehir, tarih, mesafe, fiyat, saat filtreleri **etiket olarak** görünüyor; üyeliksiz; tek dokunuşla resmî bilet sayfası | Belirsiz | 4,78 (18) | Yeni | Harita + etiket filtreleri iyi örnek; zevk eşleşmesi yok |
| **TAN** (Mayıs 2026) | Mekân keşfi, masa rezervasyonu, yapay zekâ asistanı, "For You", yoğunluk tahmini, yorumlardan atmosfer özeti | Rezervasyon | 5,0 (20) | Yeni | Mekân tarafında yoğunluk ve atmosfer özeti |
| **Radar Türkiye** (Kültür AŞ) | Konser, tiyatro, sergi, yapay zekâ rotası, widget, Wallet, QR, 6 dil; gençlere boş koltuk ("Koltuk Senin") | Kamu; bilet üçüncü tarafta | 4,72 (5,9K) / 3,31 | "Arama ve filtre hiç iyi çalışmıyor" | Widget ve Wallet kopyalanmalı; arama onlardan iyi olmalı |
| **Zorlu PSM** | 4 sahne, favoriler, takvim, uygulamaya özel fırsat | Bilet | 4,28 (18) | "Sonuç bulunamadı", üyelik tamamlanamıyor | Mekânların kendi uygulamaları tutmuyor → toplayıcıya ihtiyaç var |
| **İKSV** | Festivaller, Salon İKSV; etkinlik sayfalarında Spotify listesi linki | Bilet + sponsorluk | ayrı uygulama yok | — | Sanatçı kartına "dinle" linki |
| **Etkinlik.io** | Etkinlik toplayıcı, V2 REST API | Yayıncı ağı | uygulama zayıf | — | **Veri kaynağı** (§4.6) |

**Kapanan veya el değiştirenler:**
- **Time Out İstanbul:** Mayıs 2026'da franchise Lift Content Factory'ye geçti; yeni plan dijital ve video ağırlıklı ([Time Out](https://www.timeout.com/about/latest-news/time-out-expands-across-turkey-greece-the-greek-islands-croatia-and-cyprus-through-a-franchise-agreement-with-lift-content-factory-050726)).
- **Zomato TR:** Mekanist'i 2015'te satın aldı, 2017'de Türkiye'yi dondurdu. Gerekçeler kur, risk ve sektörün karmaşıklığıydı ([Webrazzi](https://webrazzi.com/2017/05/23/zomato-turkiye/)).
- **Foursquare City Guide:** 2024–2025'te kapandı.
- **Ders:** Mekân rehberi Türkiye'de tek başına zor yaşar. Playce'ı ayakta tutacak olan müzikle ve etkinlikle kurduğu bağ.

### 4.2 Radyo ve müzik dinleme
| Uygulama | Öne çıkanlar | Gelir | ★ / son 50 | Şikâyet | Ders |
|---|---|---|---|---|---|
| **Karnaval** (Süper FM, Metro, JoyTürk, Joy, Virgin) | Canlı radyo, podcast, Hi-Fi kalite, sıralanabilir liste, "Kitaplığım" | Reklam | 4,87 (7,9K) / 3,10 | Kapatılamayan görsel reklam | Şarkı bilgisi kapakla birlikte geliyor → **1 numaralı istasyon ortaklığı adayı** |
| **PowerApp** | Yüzlerce kanal, canlı DJ setleri, kampüs radyoları, CarPlay/watchOS/tvOS, uyku modu | Reklam | 4,77 (15,3K) / 3,52 | Hesap sıfırlanması, çökme, reklam | DJ seti ve uyku modu artık temel beklenti |
| **KRAL** (Doğuş) | Kral FM, Kral Pop, Kral TV | Yoğun reklam | 3,22 (117) / 2,20 | "2 şarkı, 10 dakika reklam" | **Az reklam başlı başına fark** |
| **Radyo Eksen** | Canlı yayın, akış, programa mesaj, etkinlik haberleri | Reklam + sponsor | 3,54 (67) / 3,06 | Açılmıyor, kendiliğinden duruyor | Etkinlik haberi var ama yayınla bağlantısı yok |
| **TRT Dinle** | TRT arşivi, tüm TRT radyoları, sesli kitap | Kamu, reklamsız | 4,79 (23,2K) / **4,30** | Yurt dışında engel, CarPlay | **En yüksek memnuniyet:** reklamsız + tür seçimiyle net kurulum |
| **fizy** (Turkcell) | Müzik, video, podcast; **"NeBuÇalan" şarkı tanıma**; fizy radyoları; **ücretsiz konser bileti, sanatçıyla buluşma** | Freemium + operatör paketi | 4,54 (368K) / 2,32 | Açılmıyor, indirim kodu çalışmıyor | **Konsept olarak Playce'a en yakın** — ama mekân ve "bu gece" yok |
| **Muud** (Türk Telekom) | Kişisel ana sayfada şarkı, haber **ve etkinlik**; ruh hâli listeleri | Premium | 4,21 (28,5K) / 2,88 | Sunucu, sürekli puan isteme | Etkinlik ikincil planda |
| **Spotify TR** | Gözat'ta "Konserler" ve "Yakınındaki konserler"; mekân takibi (Ekim 2025) | Premium + reklam | 4,68 (3,26M) | — | Türk biletçilerin Spotify ortağı olduğu doğrulanamadı; 2025'teki Türkiye çıkış krizi atlatıldı |
| **Genel radyo uygulamaları** (Turkish FM Radios, Radyo Burada) | İstasyon ızgarası, favoriler | Reklam | 4,75 / 4,56 | — | Hiçbirinde etkinlik yok |

### 4.3 Türkler mekânı nasıl buluyor
- **Instagram baskın:** 2025'te 58,4M kullanıcı ([Daily Sabah](https://www.dailysabah.com/turkiye/turkiye-reports-58m-active-social-media-users-in-2025/news)). Mekânlar Reels ve hikâyeyle duyuruyor; rezervasyon DM ya da WhatsApp'tan.
- **Google Maps:** puan, yorum ve yol tarifi için kullanılıyor; müzik türü bilgisi yok.
- **Swarm:** check-in alışkanlığı sürüyor (TR'de 10,5K oy, puan 3,38).
- **Yeni yerel oyuncular:** TAN, NeYapsak?, BUGECE. Elektronik sahne için RA.

### 4.4 Türk uygulamalarından tasarım dersleri (yorumlardan)
1. **Yoğun anda ödeme çöküyor** (Passo, Mobilet, Biletix) → bilet satarsak sanal kuyruk ve koltuk kilidi.
2. **İade ve iptal belirsiz** (Biletix, Bubilet, BUGECE) → **satıcı, hizmet bedeli ve iade koşulu kartın üstünde.**
3. **Güncellemeler bir şeyleri bozuyor** (Biletinial, Biletix) → aşamalı yayın, özellik bayrakları, EAS Update.
4. **Radyoda reklam bunaltıyor** (KRAL, Karnaval, PowerApp) → Playce radyosu reklamsız ya da çok az reklamlı.
5. **Hesap ve oturum kaybı** (PowerApp, BUGECE, Zorlu PSM) → Apple/Google girişi, rotasyonlu refresh, cihaz verisinin hesaba taşınması.
6. **Arama ve filtre zayıf** (Radar Türkiye) → NeYapsak? tarzı etiket filtreler, Türkçe karakter duyarsız arama.
7. **Sürekli puan isteme** (Muud), **arka plan çalma ve CarPlay sorunları** (Eksen, TRT Dinle) → puan isteği yalnız mutlu anda (kaydettikten sonra), CarPlay/Android Auto.

### 4.5 Türkiye'deki boşluklar
- **"Şu an çalan"dan "canlı izle"ye köprü yok.** Karnaval ve Power şarkıyı biliyor ama bilet linki vermiyor; biletçiler zevki bilmiyor.
- **Platformlar arası "bu gece" görünümü yok.** Münhasır satışlar etkinlikleri 6'dan fazla platforma bölüyor.
- **Mekânın sesi bilinmiyor.** Tür, canlı müzik ya da DJ, kapı politikası, yaş ve kıyafet kuralı hiçbir yerde toplu değil.
- **Tüm biletçileri tarayan sanatçı alarmı yok.** "X İstanbul'a geliyor, Bubilet'te satışa çıktı" diyen bir uygulama yok.
- **Yerel tür taksonomisi eksik.** Türkçe rap, arabesk, Anadolu rock, türkü bar, fasıl global uygulamalarda iyi karşılanmıyor. Spotify 2025 Türkiye ilk 100'ünün 98'i yerli ([Teknoblog](https://www.teknoblog.com/spotify-2025-ozeti-turkiyenin-muzik-tercihleri/)).
- **Küçük mekâna ücretsiz listeleme ve basit biletleme yok.**

### 4.6 Türkiye'de veri erişimi
**Etkinlik verisi:**
- **Biletix, Passo, Bubilet, Biletinial, Mobilet:** herkese açık API, affiliate programı ya da widget bulunamadı.
- **Etkinlik.io V2 API:** etkinlik, mekân, kategori, şehir ve semt uçları var; `X-Etkinlik-Token` başlığıyla, yayıncı ağı başvurusuyla açılıyor ([etkinlik.io/api-bilgi](https://etkinlik.io/api-bilgi)). **En gerçekçi başlangıç kaynağı.**
- **Bandsintown:** app_id başvuru ve onayla; İstanbul'a gelen yabancı sanatçılar için.
- **Ticketmaster Discovery:** Türkiye kapsamı belirsiz, `countryCode=TR` ile test edilmeli.
- **Sıralama:**
  1. Etkinlik.io + Bandsintown
  2. Mekân ve organizatörün etkinliği kendisinin girmesi (BUGECE modeli), editör onayıyla
  3. Resmî satış sayfasına derin link, tıklama verisi birikince UTM'li gelir paylaşımı teklifi (Bubilet, Biletinial, Mobilet)
  4. Kazıma son çare: kullanım koşulları, bot koruması ve haksız rekabet riski var; önce hukuk görüşü.

**Radyo "şu an çalan" (28 Ekim 2026 testi):**

| Grup | Altyapı | Sonuç |
|---|---|---|
| **Karnaval** (Metro, Süper, JoyTürk, Joy, Virgin) | Triton / StreamTheWorld | ICY **dolu**. Ayrıca `np.tritondigital.com/public/nowplaying?mountName=METRO_FM&eventType=track` XML'i sanatçı, şarkı, süre ve **kapak görselini** ayrı veriyor |
| Power FM / PowerTürk / Power Pop | Icecast + HLS | ICY yok; site kapalı bir API kullanıyor |
| Kral, Radyo Eksen, Best FM, Voyage | HLS | ID3 yok; eski Shoutcast yayınlarında `StreamTitle` boş |
| TRT FM | ICY | Alan var, içi boş |
| Küçük Shoutcast istasyonları (Radyo 7, Arabesk FM) | ICY | Dolu |

**Sonuç:**
- ICY popüler istasyonların bir kısmını kapsıyor. Karnaval grubu için Triton XML'i daha zengin bir kaynak.
- Metadata vermeyenler için **ShazamKit / ACRCloud** yedeği gerekir.
- **İstasyonları uygulama içinde çalmak için istasyon izni ve ortaklık** gerekir. Karnaval, Power ve Doğuş öncelikli (risk: [06](06-yol-haritasi.md)).

### 4.7 Türkiye'ye özgü gereksinimler
| Konu | Ne gerekiyor | Playce'a etkisi |
|---|---|---|
| **KVKK** | Aydınlatma metni. Konum, pazarlama bildirimi ve müzik profili için **ayrı açık rıza**. Yurt dışına aktarımda (Sentry, PostHog, Expo Push gibi) 2024'ten beri **standart sözleşme + imzadan sonra 5 iş günü içinde KVKK'ya bildirim** ([KVKK](https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu)) | Rıza ekranları sürümlü (`Consent`); yurt dışı servis listesi tutulur; mümkünse AB bölgesi veya kendi sunucumuz |
| **VERBİS** | 50'den az çalışan ve 100M TL altı bilançoda muafiyet (özel nitelikli veri ana faaliyet değilse) | Başlangıçta muaf olma ihtimali yüksek; hukuken teyit edilmeli |
| **ETBİS / İYS** | Uygulamadan satış yapılacaksa ETBİS kaydı. SMS ve e-posta pazarlaması için İYS kaydı ve onay | Bilet satışı (faz 7+) ve e-posta bülteni öncesi |
| **e-Fatura / e-Arşiv** | Satış eşikleri; GİB'den teyit | Sponsorlu öne çıkarma faturası için muhasebe kurulumu |
| **Ödeme** | **Stripe Türkiye'yi desteklemiyor.** iyzico Pazaryeri (alt üye işyeri, para bölüştürme) veya PayTR / Param | Organizatörün parası Playce'ta tutulmaz |
| **Bilet satışı** | Belirli tarihli eğlence hizmetinde 14 günlük cayma hakkı yok; iade koşulu açık yazılmalı; toplam fiyat baştan gösterilmeli | Kartta satıcı + toplam fiyat + iade koşulu (güven katmanı) |
| **Alkol — 7584 sayılı Kanun (RG 20.06.2026)** | Alkolün **her türlü reklamı ve tanıtımı**, tüketimi özendiren kampanya, promosyon ve **etkinlik** yasak. Alkol markaları **hiçbir etkinliğe ve hiçbir mecradaki paylaşıma** sponsor olamaz. Mekân tabela ve vitrinleri için son tarih 20.06.2027 ([Tarım ve Orman Bak.](https://www.tarimorman.gov.tr/TADAB/Duyuru/280/Alkollu-Icki-Reklamlarina-Iliskin-Mevzuatta-Yapilan-Degisiklik-Hakkinda-Duyuru)) | **ADR-015:** happy hour, kokteyl kampanyası, alkol markalı ya da sponsorlu gece listelenmez. Görseller moderasyondan geçer. Gece hayatı içeriğine 18+ kapısı konur |
| **Servis / kuver ücreti** | 2026'da denetim başladı | Mekân kartında böyle ibare yok |
| **Mağaza yaş derecelendirmesi** | Apple'ın yeni 13+/16+/18+ sınıfları | Gece hayatı nedeniyle 16+ ya da 18+ beklenir |
| **Uygulama içi satın alma** | Bilet uygulama dışında tüketilen bir hizmet → Apple 3.1.3(e) gereği IAP yerine iyzico kullanılabilir | Faz 7 bilet satışı |
| **Müzik lisansı** | Bar ve kafede müzik için MESAM/MSG ve MÜYORBİR/MÜYAP lisansı; Spotify işletmede çalınamaz | Playce "bu mekân bu listeyi çalıyor" demez, **"mekânın tarzı"** der. İleride mekâna yayın verilirse lisanslı işletme müziği sağlayıcısı gerekir |

**Müzik platformu dağılımı:**
- Güvenilir bir pazar payı verisi yok.
- Vekil gösterge olarak App Store TR oy sayıları: Spotify 3,26M · fizy 368K · YouTube Music 239K · Apple Music 59K · Muud 28K.
- fizy ve Muud'un herkese açık API'si yok → **Turkcell ve Türk Telekom ortaklığı** ileride gerçek bir rekabet avantajı olabilir.

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
| Seçili filtrelerin etiket olarak görünmesi | NeYapsak? | Bu Gece / Mekânlar filtre satırı |
| Reklamsız radyo + tür seçimiyle net kurulum | TRT Dinle (TR'nin en memnun radyo uygulaması) | Onboarding + reklamsız oynatıcı |
| Güven katmanı: satıcı, toplam fiyat, iade, yaş/kapı/kıyafet kartta | Biletix/Bubilet/BUGECE şikâyetlerinin tersi | Etkinlik ve mekân kartı (M17) |
| Ana ekran widget'ı + Wallet | Radar Türkiye | "Bu gece senin sesin" widget'ı (S9) |
| Uyku modu, CarPlay / Android Auto | PowerApp | Oynatıcı (S3, S10) |
| Mekânda atmosfer özeti ve yoğunluk | TAN | Faz 7 |

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
7. **Tüm kaynakları tarayan sanatçı alarmı.** "X İstanbul'a geliyor, Bubilet'te satışa çıktı" diyen bir Türk uygulaması yok. Münhasır satışların böldüğü pazarda tek görünüm biz oluruz.
8. **Güven katmanı.** Satıcı, toplam fiyat, iade koşulu, yaş, kapı ve kıyafet kuralı kartın üstünde. Rakiplerin en büyük şikâyet konusunu biz baştan çözeriz.
9. **Reklamsız (ya da çok az reklamlı) radyo kanca olur.** Türk radyo uygulamalarının bir numaralı şikâyeti reklam. Playce radyodan para kazanmaz; radyo kullanıcıyı getirir, para mekân ve etkinlik tarafından gelir.
10. **İstasyonu bir kanal gibi kullanmak.** "Eksen dinleyenler bu gece nereye gidiyor?", radyoyla ortak (alkolsüz) "Radyo X Gecesi" etkinlikleri, istasyonun kendi seçkisi.
11. **B2B kitle analitiği.** Organizatöre ve mekâna "senin sesine uyan kaç kişi var, kim tıkladı" (toplu ve anonim). Uzun vadede ana gelir bu olabilir.
12. **Yerel tür taksonomisi.** Türkçe rap, arabesk, Anadolu rock, türkü bar ve fasıl birinci sınıf türler olarak yer alır. Global uygulamalar bunu yapamaz.
13. **Operatör ortaklıkları (ileride).** fizy (Turkcell) ve Muud'un (Türk Telekom) herkese açık API'si yok. Ortaklık kurulursa Spotify kısıtını aşan, Türkiye'ye özgü bir zevk kaynağı olur.
