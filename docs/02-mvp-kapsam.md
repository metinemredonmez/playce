# 02 — MVP kapsamı ve özellik önceliği

> Kaynak: [01-rakip-analizi.md](01-rakip-analizi.md) (dünya + Türkiye örnekleri) ve ürün hedefleri ([00-urun.md](00-urun.md)).
> Öncelik: **M** = olmazsa olmaz (lansman), **S** = olmalı (lansman veya hemen sonrası), **C** = olabilir (faz 7+), **W** = MVP'de bilinçli olarak yok.
> Katman: **A** = API, **P** = admin paneli, **M** = mobil.

## 1. Özellik listesi

### M — Lansman için şart
| # | Özellik | Nereden ilham | Katman | Durum |
|---|---|---|---|---|
| M1 | Canlı radyo: tür, istasyon, arka planda çalma, kilit ekranı | TuneIn, Radio Garden | A M | ✅ prototip |
| M2 | **Çalan parça → sanatçı → "Sahnede!" kartı** | Shazam (eşleşme → konser kartı) | A M | ✅ prototip |
| M3 | **Oynatıcıdan tek dokunuş sanatçı takibi** | Bandsintown "Track" | A M | yeni |
| M4 | **Dinlediğin türün bu geceki etkinlikleri ve mekânları** | Ticketmaster "Last Minute", Xceed tür etiketleri | A M | ✅ prototip |
| M5 | Etkinlik keşfi: zaman çipleri, filtreler, **liste ⇄ harita + alt sheet** | DICE harita, JamBase filtreleri | A M | kısmen |
| M6 | Mekân rehberi: liste ⇄ harita, "şimdi açık", **mekânın sesini dinle** | TouchTunes, TuneIn Explorer | A P M | kısmen |
| M7 | **Ses profili:** uygulama içi dinleme + tür/sanatçı seçimi + Last.fm (+ Apple Music iOS) | DICE/RA onboarding (Spotify'sız) | A M | yeni |
| M8 | **Eşleşme % rozeti + açıklaması** (etkinlik ve mekân) | SeatGeek "Deal Score" | A M | yeni — **farkımız** |
| M9 | Kaydet / ilgileniyorum / gidiyorum + 3 saat önce hatırlatma | RA "Interested", Spotify | A M | yeni |
| M10 | Takip ettiğin sanatçı İstanbul'a gelince bildirim | Bandsintown, Spotify | A M | yeni |
| M11 | Bilet yönlendirme (sağlayıcı adıyla, mümkünse affiliate) | Shazam, Spotify | A P M | kısmen |
| M12 | Birleşik arama (Türkçe karakter duyarsız) | — | A M | yeni |
| M13 | Hesap: e-posta OTP, Apple, Google; KVKK onayları, veri indir, hesap sil | — | A M | yeni |
| M14 | Admin: etkinlik/mekân/sanatçı/istasyon yönetimi, **Eşleşmeyenler kuyruğu**, istasyon sağlığı | — | A P | kısmen |
| M15 | Organizatör / mekân başvuru formu + moderasyon | Eventbrite organizatör akışı | A P M | yeni |
| M16 | ICY metni → sanatçı/tür temizleme hattı (alias, MusicBrainz, etiket→tür) | MusicBrainz, Last.fm | A P | kısmen |

### S — Olmalı
| # | Özellik | Nereden ilham | Katman |
|---|---|---|---|
| S1 | Mekân ve organizatör takibi (+ takvimleri) | RA (kulüp/promoter takibi), Spotify (mekân takibi) | A M |
| S2 | Son çalanlar listesi + "Spotify'da / YouTube'da aç" | Radio Garden ("parça adını kopyala") | M |
| S3 | Tam ekran oynatıcı: tür içinde istasyon geçişi, uyku zamanlayıcı | iHeartRadio "Live Radio Dial" | M |
| S4 | Haftalık "hafta sonu senin sesin" bildirimi | Ticketmaster For You | A M |
| S5 | **Editoryal seçkiler** ("Bu gece Kadıköy'de techno", "Ücretsiz caz geceleri") | Eventbrite It-Lists, Time Out | A P M |
| S6 | Paylaşım linkleri, takvime ekle, yol tarifi | — | A M |
| S7 | "Takip ettiğin sanatçı şu an radyoda" bildirimi | Playce'a özgü | A M |
| S8 | "Satışa çıktı / son biletler" uyarısı (kaynak veriyorsa) | Spotify, Ticketmaster | A M |

### C — Olabilir (faz 7+)
| # | Özellik | Nereden ilham |
|---|---|---|
| C1 | **Misafir listesi / masa rezervasyonu** (bilet satmadan mekâna dönüşüm) | Xceed |
| C2 | Tükenen etkinlikte bekleme listesi | DICE |
| C3 | Arkadaşların gidiyor / ortak plan | Eventbrite, Radiate |
| C4 | Check-in, "oradaydım", istatistik ve seriler | Swarm, setlist.fm |
| C5 | Mekândan canlı "şu an çalan" (mekân onayıyla) | TouchTunes, Soundtrack Your Brand |
| C6 | **İstasyon ortaklıkları:** radyonun "bu gece seçkisi", bilet çekilişleri, "İstanbul'a gelsin" talebi | iHeartRadio, Bandsintown "request a show" |
| C7 | Ortamdaki müziği tanı (ShazamKit — ücretsiz) → mekân/etkinlik | Shazam |
| C8 | İstanbul haritasında türlere göre parlayan istasyon + mekân görünümü | Radio Garden küresi |
| C9 | Spotify bağlama (≥ 250 bin MAU'da kota başvurusu) / Spotify veri dosyası yükleme | — |

### W — MVP'de bilinçli olarak yok
Kendi bilet satışı (ADR-011) · Spotify hesabı bağlama (kota) · İstanbul dışı şehirler · web uygulaması · kullanıcılar arası mesajlaşma.

## 2. Çekirdek kullanıcı hikâyeleri

### H1 — Radyodan konsere
> Joy Türk dinlerken Dedublüman çalıyor; 20 sn içinde "Dedublüman sahnede! · Cuma 21:30 · Salon İKSV" kartı çıkıyor.
- **Verilen:** sanatçı DB'de ve yaklaşan etkinliği var · **Olduğunda:** ICY başlığı eşleşir · **Sonra:** kart ≤ 20 sn içinde görünür;
  karttan etkinlik detayı → bilet linki açılır; "Takip et" tek dokunuşla çalışır (girişsizse cihazda tutulur).
- Eşleşmezse tür köprüsü yine görünür ("Bu gece · Türkçe Pop canlı").

### H2 — Bu gece nereye?
> Cuma 21:00, Deniz Kadıköy'de; "Bu Gece"yi açıyor, "Senin sesin" sıralamasıyla ilk 3'te %85+ eşleşen iki mekân ve bir konser görüyor.
- Liste varsayılan "senin için" sıralı; harita görünümünde pinler türe göre renkli; alt sheet'te kart.
- Ses profili yoksa rozetler yerine "Ses profilini oluştur (30 sn)" çağrısı.

### H3 — Mekânı gitmeden dinle
> Mert "Arkaoda" sayfasında "Mekânın sesini dinle"ye basıyor; deep house yayını başlıyor, mekânın programını kaydırıyor.

### H4 — Ses profili
> Ayşe onboarding'de "Türlerimi seçeceğim" → Caz, Indie, Türkçe Pop; 5 sanatçı seçiyor. 3 gün radyo dinledikten sonra
> "Lounge'u çok dinliyorsun — profiline ekledik" bildirimi geliyor; mekân rozetleri buna göre değişiyor.

### H5 — Hiçbir şeyi kaçırma
> Mert Mabel Matiz'i takip ediyor; konser admin'den yayınlandığı dakika "Mabel Matiz İstanbul'da!" push'u geliyor; kaydediyor;
> konser günü 3 saat önce hatırlatma geliyor.

### H6 — Editör haftası
> Editör Pazartesi 30 dakikada: Eşleşmeyenler kuyruğundan en çok çalan 20 sanatçıyı ekler, hafta sonunun 40 etkinliğini girer,
> "Bu hafta sonu ücretsiz caz" seçkisini oluşturur.

## 3. Lansman eşiği (bunlar yoksa yayına çıkılmaz)

1. Her gece en az **40 yayında etkinlik**, en az **150 mekân** (hepsi konumlu ve ses profilli).
2. Metadata'lı parçalarda **eşleşme oranı ≥ %50** (en çok çalan 500 sanatçı DB'de).
3. Tür başına en az **4 çalışan istasyon**; kırık istasyon 3 saatte otomatik gizleniyor.
4. M1–M16 kabul kriterleri geçti (03/04/05 dokümanlarının §kabul bölümleri).
5. KVKK metinleri, kullanım koşulları, mağaza gizlilik etiketleri hazır.
6. Beta'da çökme < %0,5 oturum, ilk ses < 3 sn.
