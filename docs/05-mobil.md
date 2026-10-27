# 05 — Mobil MVP

> Prototipte çalışan: Dinle / Bu Gece / Mekânlar / Favoriler sekmeleri, tek oynatıcı (arka plan + kilit ekranı),
> iOS 26+ sekme çubuğu mini oynatıcısı, "Bu sesin canlısı" köprüsü, etkinlik/mekân/sanatçı detayları.
> Bu doküman İstanbul lansmanına kadar mobilin **hedef halini** tanımlar.
> Zevk eşleşmesi (Spotify/YouTube bağlama): [08-zevk-eslesme.md](08-zevk-eslesme.md).

## 1. Teknoloji

| İhtiyaç | Paket (Expo SDK 58 — eklemeden önce sürüm dokümanına bak) |
|---|---|
| Yönlendirme | expo-router (`src/app`), `NativeTabs`, Stack, form sheet |
| Ses | expo-audio (tek `createAudioPlayer`, arka plan, kilit ekranı `isLiveStream`) |
| Veri | @tanstack/react-query (+ AsyncStorage persist: son akış çevrimdışı görünür) |
| Kimlik | expo-apple-authentication, expo-auth-session (Google, Spotify PKCE), expo-secure-store (token) |
| Bildirim | expo-notifications (Expo Push) |
| Konum / harita | expo-location, expo-maps (iOS Apple Maps / Android Google Maps) — alpha ise react-native-maps |
| Takvim / paylaşım | expo-calendar, React Native `Share` |
| Görsel / UI | expo-image, expo-linear-gradient, expo-symbols, expo-haptics, expo-glass-effect |
| Liste performansı | @shopify/flash-list (uzun etkinlik/istasyon listeleri) |
| Güncelleme | expo-updates (EAS Update ile JS düzeltmeleri mağaza beklemeden) |
| Hata / analitik | @sentry/react-native, posthog-react-native (onaya bağlı) |

**Expo Go yetmez:** push, Apple girişi, haritalar ve OAuth için **development build** (`eas build --profile development`)
gerekir. Prototipteki Expo Go kullanımı yalnız erken deneme içindi.

## 2. Gezinme

```
Kök Stack
├── (onboarding)            ilk açılış — bitince bir daha görünmez
│   ├── welcome             3 kart: Dinle → Eşleş → Git
│   ├── taste               Ses profilini oluştur (hesap bağla / tür seç)
│   ├── artists             (tür seçildiyse) sevdiğin sanatçılar ızgarası
│   └── location            konum izni açıklaması
├── (tabs)  NativeTabs  [mini oynatıcı = BottomAccessory (iOS 26+) / yüzen kart]
│   ├── index   Dinle
│   ├── tonight Bu Gece     (liste ⇄ harita)
│   ├── venues  Mekânlar    (liste ⇄ harita, "senin sesin" sıralaması)
│   ├── search  Ara         (iOS 26: role="search" — sekme çubuğunda arama)
│   └── me      Sen         (takvimim, takip, favoriler, ses profilim, ayarlar)
├── player                  tam ekran oynatıcı (form sheet, mini oynatıcıdan yukarı kaydır)
├── event/[slug]
├── venue/[slug]
├── artist/[slug]
├── station/[id]            (paylaşılan istasyon linki)
├── auth                    giriş sheet'i (OTP / Apple / Google)
├── filters                 filtre sheet'i
├── notifications           bildirim kutusu
└── settings/*              hesap, bildirim tercihleri, gizlilik (KVKK), hakkında
```

Derin bağlantılar: `playce://event/slug` ve evrensel linkler `https://playce.app/e/slug`, `/v/slug`, `/a/slug`, `/s/id`.

## 3. Ekranlar

Her ekran için: **amaç · içerik · durumlar** (yükleniyor = iskelet, boş, hata, çevrimdışı).

### 3.1 Onboarding (ilk açılış, ≤ 60 sn)
1. **Welcome** — 3 kaydırmalı kart, her biri tek cümle + animasyon: *Dinle* (radyo dalgası), *Eşleş* (sanatçı → konser kartı),
   *Git* (harita pini). "Başla" + "Giriş yap".
2. **Ses profili** — seçenekler (ayrıntı 08; Spotify API kotası yüzünden lansmanda Spotify düğmesi yok):
   - **"Türlerimi seçeceğim"** (varsayılan) → tür ızgarası (renkli kartlar, en az 3) → popüler sanatçı ızgarası (opsiyonel, en az 5 önerilir)
   - **Last.fm kullanıcı adı** (Spotify kullananlara: "Spotify → Ayarlar → Last.fm'i bağla" ipucu) · **Apple Music** (iOS) · **YouTube** (beta)
   - Radyo dinledikçe profil kendiliğinden güçlenir; bağlama yalnız hızlandırır.
   - Bağlantı sonrası özet: "En çok dinlediğin: Dedublüman, Mabel Matiz, Black Coffee · Türlerin: Türkçe Pop %45, Deep House %30…"
3. **Konum** — "Sana yakın mekânları önce göstermek için" → sistem izni. Reddedilirse semt seçici.
4. Bildirim izni burada **sorulmaz**; ilk sanatçı takibinde veya ilk etkinlik kaydında bağlamıyla sorulur (kabul oranı daha yüksek).
5. Hesap zorunlu değil. Takip/kaydet ilk kez yapılınca "Kaybolmasın, giriş yap" sheet'i (geç → cihazda kalır, girişte birleşir).

### 3.2 Dinle (ana sekme)
- **Üst:** wordmark, bildirim zili (okunmamış rozeti), selamlama ("İyi akşamlar — bu gece 14 etkinlik").
- **Oynatıcı kartı:** istasyon, parça/sanatçı, ekolayzer, oynat/durdur, favori. Hiç çalmıyorsa "Ses profiline göre başlat" (zevkin en güçlü türü).
- **Bu sesin canlısı** (çalarken): sanatçı sahnede kartı → türün bu geceki etkinlikleri → bu sesi çalan mekânlar (eşleşme %).
- **Senin için radyo:** ses profilinden 6 istasyon (yatay).
- **Türler:** renkli çipler → seçilen türün istasyonları; "Daha fazla" radio-browser'dan.
- **Son çalanlar:** bu oturumda duyduğun parçalar — sanatçıya git · "Spotify'da aç" · "YouTube'da aç" (arama linki).
- Durumlar: istasyon hatası → "Yayına ulaşılamadı · sıradaki istasyona geç" düğmesi; çevrimdışı → bant.

### 3.3 Tam ekran oynatıcı (sheet)
- Büyük kapak (istasyon logosu yoksa tür degradesi + frekans halkaları), parça / sanatçı, istasyon adı.
- Kontroller: oynat/durdur, **önceki/sonraki istasyon** (aynı tür içinde; yatay kaydırma), favori, paylaş, **uyku zamanlayıcı** (15/30/60 dk/parça sonu yok — canlı).
- "Bu sanatçı" düğmesi → sanatçı sayfası; altta açılır **"Bu sesin canlısı"** listesi.
- Kilit ekranı / Control Center / Android medya bildirimi: başlık, sanatçı, istasyon; oynat/durdur.

### 3.4 Bu Gece
- **Zaman çipleri:** Bu gece · Yarın · Hafta sonu · Tarih seç (takvim).
- **Filtre sheet'i:** tür (çoklu), semt, fiyat (ücretsiz / ≤ ₺500 / ≤ ₺1000 / hepsi), **"Senin sesin" (eşleşme ≥ %70)**, yaş sınırı.
- **Sıralama:** senin için (varsayılan) · en yakın · en erken · popüler.
- **Liste ⇄ Harita** düğmesi. Harita: etkinlik pinleri (tür rengi), alt sheet'te seçili etkinlik kartı.
- Kart: tarih kapağı, başlık, mekân · semt · fiyat, tür çipleri, **eşleşme rozeti** (%92), "Şu an" / "Az kaldı" / "Ücretsiz" rozetleri, kaydet (♡).
- Boş durum: "Bu filtrede etkinlik yok — Yarın 8 etkinlik var →".

### 3.5 Mekânlar
- Üst: arama, **"Şimdi açık"** anahtarı, tür çipleri, liste ⇄ harita.
- Sıralama: senin sesin (eşleşme) · yakın · bu gece etkinliği olan.
- Kart: kapak, ad, semt + mesafe, fiyat seviyesi, türler, **"%88 senin sesin"**, bu gece/sonraki etkinlik, "Mekânın sesini dinle" (▶).
- Harita: pinler eşleşmeye göre parlaklık; "bu bölgede ara".

### 3.6 Ara
- Tek kutu, Türkçe karakter duyarsız; sonuçlar gruplu: Sanatçılar · Mekânlar · Etkinlikler · İstasyonlar.
- Boşken: son aramalar, popüler aramalar, türler ızgarası.

### 3.7 Sen
- Üst: ad/avatar (veya "Giriş yap"), **Ses profilim** kartı (tür halkası grafiği + bağlı hesaplar + "yenile").
- **Takvimim:** gidiyorum / ilgileniyorum etkinlikleri (yaklaşan · geçmiş).
- **Takip:** sanatçılar (yaklaşan etkinliği olanlar önce), mekânlar.
- **Favori istasyonlar.**
- Ayarlar: bildirim tercihleri (türlere göre aç/kapat, sessiz saatler), bağlı hesaplar, konum, dil, gizlilik
  (KVKK aydınlatma, açık rızalar, **verilerimi indir**, **hesabımı sil**), destek, "Mekânını/etkinliğini ekle" (başvuru formu), sürüm.

### 3.8 Etkinlik detayı
- Kapak (görsel veya tür degradesi), başlık, tür çipleri, durum rozetleri (Şu an / Az kaldı / İptal / Demo).
- Bilgi satırları: tarih-saat (kapı açılış), mekân (→ mekân), fiyat, yaş sınırı.
- **Eşleşme açıklaması:** "%92 senin sesin — Mabel Matiz'i sık dinliyorsun, Türkçe Pop profilinin %45'i".
- **Sahnede:** lineup çipleri (→ sanatçı, takip et).
- Eylemler: **Bilet al** (sağlayıcı adıyla: "Biletix'te bilet al" — dış tarayıcı / in-app browser), **Gidiyorum / İlgileniyorum**,
  takvime ekle, paylaş, yol tarifi, **"Bu sesi dinle"** (türün radyosu).
- Benzer etkinlikler (aynı tür, aynı hafta).

### 3.9 Mekân detayı
- Kapak + galeri, ad, semt, fiyat seviyesi, **ses profili** (tür çubukları) ve eşleşme yüzdesi.
- **Mekânın sesini dinle** (canlı radyo, mekânın türünde) · mekânın çalma listesi (Spotify/Apple linki varsa).
- Bilgiler: adres (harita önizleme → yol tarifi), çalışma saatleri ("Şimdi açık · 04:00'e kadar"), telefon, Instagram, rezervasyon.
- **Program:** yaklaşan etkinlikler. Takip et (yeni etkinlikte bildirim).
- "Bilgi yanlış mı?" → düzeltme başvurusu.

### 3.10 Sanatçı detayı
- Görsel, ad, türler, takipçi sayısı, **takip et** (+ "radyoda çaldığında haber ver" anahtarı).
- **Sahne takvimi** (yaklaşan konserler); yoksa "Takip et, İstanbul'a gelince haber verelim".
- **Radyoda son çaldığı yerler** (PlayLog: istasyon + ne zaman) → tek dokunuşla o istasyonu aç.
- Dış linkler: Spotify, YouTube, Instagram. "Benzer sesi dinle" (tür radyosu).

### 3.11 Bildirim kutusu
Liste (okunmamış vurgulu), türüne göre ikon; dokununca derin bağlantı. "Tümünü okundu say".

## 4. Bildirimler

| Tür | Ne zaman | Örnek metin | Hedef |
|---|---|---|---|
| Sanatçı yeni etkinlik | Takip ettiğin sanatçının etkinliği yayınlanınca | "Mabel Matiz İstanbul'da! 14 Kasım · Zorlu PSM" | etkinlik |
| Sanatçı radyoda | Takip ettiğin sanatçı şu an bir istasyonda çalıyorsa (günde ≤ 1) | "Duman şu an Radyo Eksen'de çalıyor 🎸" | istasyon (çalmaya başlar) |
| Etkinlik hatırlatma | Kaydettiğin etkinlikten 3 saat önce | "Bu gece 23:00 · Deep House Gecesi, Blind" | etkinlik |
| Mekân yeni etkinlik | Takip ettiğin mekâna etkinlik eklenince | "Arkaoda'da Cumartesi: Ben Böhmer" | etkinlik |
| Haftalık seçki | Perşembe 18:00 | "Hafta sonu senin sesin: 5 etkinlik %85+ eşleşme" | Bu Gece (hafta sonu filtresi) |
| Kampanya | Admin, açık rıza verenlere | — | deeplink |

Kurallar: sessiz saat (01:00–10:00), günlük üst sınır (3), tür bazlı kapatma, Android bildirim kanalları (her tür ayrı kanal).

## 5. Tasarım sistemi (prototipteki dil korunur)

- **Tema:** koyu sahne (`#0B0B10`), kartlar `#15151E`/`#1D1D29`.
- **İki vurgu:** **play pembe** `#FF4D8D` (müzik/çalma eylemleri) · **place turkuaz** `#2EE6C5` (mekân/zaman/konum). Mor `#7C5CFF` degrade eşi.
- **Tür renkleri** her yerde tutarlı (çip, kapak degradesi, harita pini, ekolayzer).
- **Tipografi:** sistem fontu; başlıklar 800–900 ağırlık, sıkı harf aralığı (−0,8); gövde 15/22.
- **İmza öğeleri:** frekans halkalı degrade kapaklar, canlı ekolayzer, eşleşme rozeti (pembe→turkuaz degrade halka + %).
- **Hareket:** ekolayzer yalnız çalarken; `reduceMotion` açıksa durur. Kart basışta 0,75 opaklık + hafif haptik.
- **Erişilebilirlik:** tüm ikon düğmelerinde `accessibilityLabel`; Dynamic Type; tür renkleri koyu zeminde AA kontrast
  (açık tonlu çip yazıları kapak üstünde koyu zeminli varyant — `GenrePills onCover`).

## 6. Analitik olayları (onaya bağlı)

`app_open` · `onboarding_step{step}` · `taste_connected{provider}` · `taste_manual{genres}` · `play_start{station,genre,source}` ·
`play_error{station}` · `track_matched{artist}` · `bridge_impression{type}` · `bridge_click{type}` · `event_view{slug,source}` ·
`venue_view` · `artist_view` · `follow_artist` · `follow_venue` · `save_event{status}` · `ticket_click{provider}` ·
`map_open{tab}` · `search{len,results}` · `share{type}` · `push_open{kind}` · `sleep_timer_set`

Kuzey yıldızı: **haftalık "dinle → git" dönüşümü** = köprüden etkinlik/mekân açıp kaydeden veya bilet tıklayan kullanıcı oranı.

## 7. Performans ve kalite bütçesi

- Soğuk açılış < 2 sn (orta seviye Android), ilk ses < 3 sn (Wi-Fi).
- Listeler 60 fps (FlashList, sabit kart yükseklikleri, `expo-image` önbellek).
- Bellek: arka planda çalarken < 150 MB.
- Çökme oranı < %0,5 oturum (Sentry).
- Çevrimdışı: son ana akış ve kaydedilenler görünür; radyo için "bağlantı yok" bandı.

## 8. Mağaza hazırlığı

- iOS: arka plan ses gerekçesi (radyo), konum kullanım metni, **App Privacy** etiketleri, yaş derecelendirmesi
  (gece hayatı/alkol referansı → 17+ değerlendir), Apple ile Giriş zorunlu (başka sosyal giriş varsa).
- Android: Data safety formu, medya oynatma ön plan servisi bildirimi, bildirim izni (Android 13+).
- Ekran görüntüleri (TR + EN), kısa video: radyo → "sanatçı sahnede" → bilet anı.
- EAS: `development`, `preview` (TestFlight / internal testing), `production` profilleri; EAS Update kanalları.

## 9. Klasör yapısı (hedef)

```
apps/mobile/src/
  app/            rotalar (yukarıdaki ağaç)
  components/     ui.tsx, cover, equalizer, cards (event/venue/station/artist), match-badge, map/, player/
  features/       taste/ (bağlama akışları), auth/, notifications/, search/
  player/         player-context, sleep-timer, history
  lib/            api (+ auth interceptor), queries, format, theme, layout, links, analytics, storage
```

## 10. Kabul kriterleri (mobil MVP bitti sayılır)

1. Yeni kullanıcı 60 saniyede onboarding'i bitirip (hesap bağlayarak ya da tür seçerek) ilk sesi duyuyor.
2. Çalarken sanatçı eşleşirse kart 20 sn içinde çıkıyor; kart → etkinlik → bilet linki çalışıyor.
3. Bu Gece ve Mekânlar'da liste ⇄ harita, filtreler ve eşleşme sıralaması çalışıyor.
4. Takip/kaydet girişsiz cihazda tutuluyor, giriş yapınca hesaba taşınıyor.
5. Üç bildirim türü (sanatçı yeni etkinlik, hatırlatma, haftalık seçki) gerçek cihazda geliyor ve doğru ekranı açıyor.
6. Uyku zamanlayıcı, kilit ekranı kontrolü, kulaklık çıkınca durma çalışıyor.
7. Hesap silme ve veri indirme ayarlardan yapılabiliyor.
8. iOS ve Android development build'de; TestFlight + Play internal testing'e yüklendi.
