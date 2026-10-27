# 08 — Zevk eşleşmesi: "Senin sesin"

> Kullanıcı Spotify / YouTube Music / Apple Music / Last.fm hesabını bağlar (ya da türlerini seçer);
> Playce en çok dinlediği sanatçı ve türlerden bir **ses profili** çıkarır ve her mekâna, her etkinliğe
> bir **eşleşme puanı** verir: *"%92 senin sesin — Mabel Matiz'i sık dinliyorsun."*
>
> Bu, Playce'ın asıl farkı: konser uygulamaları sanatçıyı, mekân rehberleri yeri bilir;
> **dinleme zevkini mekânın sesiyle eşleştiren** yok. (Kanıt ve rakipler: [01-rakip-analizi.md](01-rakip-analizi.md).)

## 1. Kullanıcı deneyimi

1. **Onboarding'de** "Ses profilini oluştur": **"Türlerimi seçeceğim"** (varsayılan) · [Last.fm] · [Apple Music — iOS] · [YouTube] ·
   Spotify düğmesi lansmanda yok (kota kısıtı, §5). Radyo dinledikçe profil kendiliğinden güçlenir:
   "3 gecedir Deep House dinliyorsun — profiline ekledik."
2. Bağlantıdan sonra **özet ekranı** (paylaşılabilir kart):
   *"Senin sesin: Türkçe Pop %45 · Deep House %30 · Indie %15 · Caz %10 — En çok: Dedublüman, Mabel Matiz, Black Coffee"*
   + "Bu gece sana en uygun 3 mekân" önizlemesi.
3. **Her yerde rozet:** etkinlik ve mekân kartlarında pembe→turkuaz halka içinde yüzde. Yalnız ≥ %70 gösterilir
   (düşük puan göstermek mekânı kötü gösterir).
4. **"Senin sesin" filtresi ve sıralaması** Bu Gece ve Mekânlar'da.
5. **Açıklama** (detay sayfasında): "Neden %92? · Mabel Matiz'i sık dinliyorsun · Türkçe Pop profilinin en büyük parçası · Bu mekânda son 3 ayda 4 Türkçe Pop gecesi oldu."
6. **Sen → Ses profilim:** tür halkası, en çok sanatçılar, bağlı hesaplar, "yenile", "bağlantıyı kaldır", "profili sıfırla".
7. Takip önerisi: bağlanan hesaptaki sanatçılardan DB'de olanlar → "Bu 12 sanatçıyı takip et, İstanbul'a gelince haber verelim" (tek dokunuş).

## 2. Ses profili nasıl oluşur

Profil iki parçadır: **sanatçı ağırlıkları** (kime ne kadar bağlısın) ve **tür vektörü** (Playce türleri üzerinde, toplamı 1).

| Kaynak | Sinyal | Ağırlık |
|---|---|---|
| Uygulama içi dinleme | tür başına dinleme dakikası; eşleşen sanatçılar; parça beğenisi (♡) | 0.40 |
| Bağlı hesap — uzun dönem en çok dinlenenler | sanatçı sırası → ağırlık (1. = 1.0, 50. ≈ 0.2) | 0.25 |
| Bağlı hesap — son 4 hafta | aynı | 0.10 |
| Açık tercih | onboarding tür/sanatçı seçimi, takip edilen sanatçılar | 0.25 |

- Bağlı hesap yoksa kalan kaynaklar yeniden ölçeklenir (manuel + uygulama içi = 1).
- **Zaman sönümü:** uygulama içi sinyaller 60 günlük yarı ömürle azalır; zevk değişince profil de değişir.
- **Sanatçı → tür eşlemesi:** (1) sanatçı DB'mizde varsa onun türleri; (2) yoksa dış etiketler (Last.fm / MusicBrainz etiketleri)
  `TagGenreMap` ile Playce türlerine çevrilir ("turkish pop" → Türkçe Pop, "afro house" → Deep House 0.7 + Techno 0.3);
  (3) eşlenemeyen sanatçılar profile katılmaz ama admin'in **Eşleşmeyenler** kuyruğuna düşer (kapsam büyür).

## 3. Mekânın ses profili

| Kaynak | Açıklama |
|---|---|
| Admin / mekân sahibi | Ana tür (1.0) ve yan türler (0.3–0.7) — `VenueGenre.weight` |
| Lineup geçmişi | Son 6 ayda mekânda çıkan sanatçılar ve etkinlik türleri → `VenueArtist` + tür ağırlığı |
| Mekânın çalma listesi | Mekân Spotify/Apple/YouTube çalma listesi verirse içindeki sanatçılar (bkz. §5 kısıtları) |
| (Faz 7) Canlı çalan | İşletme müzik servisleri / mekân yayını üzerinden |

## 4. Eşleşme puanı

```
Mekân:
  türBenzerliği   = kosinüs(kullanıcı_tür_vektörü, mekân_tür_vektörü)          0..1
  sanatçıÖrtüşmesi = 1 − exp(−Σ kullanıcı_ağırlığı(a) · mekân_ağırlığı(a))       0..1, doygun
  puan = 100 · (0.7 · türBenzerliği + 0.3 · sanatçıÖrtüşmesi)

Etkinlik:
  lineupİsabeti = max(kullanıcı_ağırlığı(a) · (a headliner ise 1.0, değilse 0.7))  a ∈ lineup
  türBenzerliği = kosinüs(kullanıcı_tür_vektörü, etkinlik_türleri)
  puan = 100 · max(lineupİsabeti, 0.55 · lineupİsabeti + 0.45 · türBenzerliği)
  → en çok dinlediğin sanatçı headliner ise puan ≥ 90
```

- **Eşikler:** ≥ 85 "Tam senin sesin" · 70–84 "Sana uygun" · < 70 rozet yok.
- **Açıklama üretimi:** puana en çok katkı veren 1–2 terimden cümle ("X'i sık dinliyorsun", "profilinin %45'i Türkçe Pop").
- **Performans:** kullanıcı profili Redis'te (5 dk), mekân profilleri bellekte; liste uçlarında puan sorgu sonrası hesaplanır (≤ 200 öğe).
- **Soğuk başlangıç:** profil yoksa puan gösterilmez; "Ses profilini oluştur" çağrısı.

## 5. Sağlayıcılar (Ekim 2026 durumu)

> **Sonuç: Spotify'a lansmanda güvenilemez.** Ses profilinin omurgası **uygulama içi radyo dinleme + manuel seçim**;
> üstüne **Last.fm** ve **Apple Music** (iOS) eklenir. YouTube zayıf bir vekil sinyal, Spotify ise büyüyünce.

| Sağlayıcı | Ne alınır | Durum ve kısıt | Karar |
|---|---|---|---|
| **Uygulama içi** | Tür başına dinleme süresi, eşleşen sanatçılar, parça beğenisi | Tamamen bizde, kurulum gerektirmez | ✅ **MVP — ana sinyal** |
| **Manuel** | Onboarding tür + sanatçı seçimi, takipler | — | ✅ **MVP** |
| **Last.fm** | `user.getTopArtists` (dönem seçilebilir), sanatçı etiketleri | Yalnız API anahtarı + kullanıcı adı, OAuth yok. Ticari kullanım için Last.fm ile anlaşma gerekir ([ToS](https://www.last.fm/api/tos)) | ✅ **MVP** — Spotify kullanıcısına ipucu: "Spotify ayarlarından Last.fm'i bağla, sonra kullanıcı adını yaz" |
| **Apple Music** | Son çalınanlar, sık çalınanlar (heavy rotation), kütüphane sanatçıları | Apple Developer + developer token + kullanıcı token'ı; Expo'da **native modül** gerekir; Android'de kullanıcı token'ı elle yönetilir ve sorunlu | 🟡 **Faz 3 sonu, yalnız iOS** |
| **YouTube** | Beğenilen videolar (`videos.list myRating=like`), abonelikler → kanal/"Topic" adlarından sanatçı | Resmi YouTube Music geçmiş API'si yok; `youtube.readonly` hassas kapsam → **Google uygulama doğrulaması**; doğrulanmamış uygulama **100 yeni kullanıcıyla** sınırlı | 🟡 Beta'da dene, doğrulamayı erken başlat |
| **Spotify** | En çok dinlenenler, son çalınanlar, takip edilen sanatçılar | **Geliştirme modu: en fazla 5 izinli kullanıcı**, uygulama sahibinin Premium'u şart. **Genişletilmiş kota: 15 Mayıs 2025'ten beri yalnız kurumlar, ≥ 250 bin aylık aktif kullanıcı**, inceleme ~6 hafta ([quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)). Sanatçı türleri seyrek/boş dönebiliyor → türü bizim etiket eşlememizden al | ❌ Lansmanda yok · 🎯 250 bin MAU'da başvur |
| **Spotify veri dışa aktarma** | Kullanıcının kendi "Hesap verisi" JSON dosyası (dinleme geçmişi) | API değil; kullanıcı Spotify gizlilik ayarlarından ister, birkaç gün sürer, dosyayı uygulamaya yükler | 🟡 Faz 7 — Spotify'sız Spotify yolu |
| **Deezer** | Favoriler | Yeni API erişimi verilmiyor | ❌ |

**Sağlayıcı kuralları (hepsi için):**
- Veriler yalnız kullanıcıya öneri için kullanılır; reklam hedeflemesi ve üçüncü tarafa aktarma yok (Spotify/Google geliştirici politikalarıyla uyumlu).
- "X ile bağlan" düğmeleri her sağlayıcının marka kurallarına göre çizilir.
- Spotify tüketici hesabı **mekânda çalma lisansı vermez**; bu yüzden mekânın paylaştığı çalma listesi "ne çaldığının kanıtı" değil, **tarz beyanı** sayılır (§3).

### 5.1 Neden radyo bizim avantajımız
Büyük platformlar zevk verisini kilitliyor (Spotify 2024–2026 kısıtları). Playce'ın radyosu ise **kurulumsuz, pasif ve
açıklanabilir** bir sinyal üretir: "Joy Türk'te Dedublüman dinledin → bu gece Salon İKSV'de". Bu yüzden uygulama içi dinleme
profilin ana kaynağıdır; hesap bağlama yalnız hızlandırıcıdır.

### 5.2 Mekânın sesi — en güçlüden zayıfa sinyaller
1. Mekânda çıkan DJ/sanatçıların türleri (geçmiş lineup → MusicBrainz / Last.fm etiketleri).
2. Mekânın beyan ettiği türler, Playce ekibince doğrulanmış.
3. Mekânın kendi çalma listeleri (Apple Music / doğrudan mekândan; Spotify geliştirme modu başkasının listesini okuyamaz).
4. Mekânın onayıyla canlı "şu an çalan" (Soundtrack Your Brand gibi işletme müzik servisleri) — Faz 7.
5. Kullanıcı check-in'leri ve mekânda ses tanıma — Faz 7.

## 6. Veri modeli

```prisma
enum TasteSource { SPOTIFY YOUTUBE APPLE_MUSIC LASTFM DEEZER IN_APP MANUAL }
enum ConnectionStatus { ACTIVE EXPIRED REVOKED ERROR }

model MusicConnection {
  id              String           @id @default(cuid())
  userId          String
  provider        TasteSource
  externalUserId  String?
  displayName     String?
  scopes          String[]
  accessTokenEnc  String?          // AES-256-GCM, anahtar env'de (TOKEN_ENC_KEY)
  refreshTokenEnc String?
  expiresAt       DateTime?
  status          ConnectionStatus @default(ACTIVE)
  lastSyncedAt    DateTime?
  createdAt       DateTime         @default(now())
  @@unique([userId, provider])
}

/// Türetilmiş profil — ham dinleme geçmişi saklanmaz.
model TasteArtist {
  userId    String
  artistKey String      // normalize(ad)
  name      String
  artistId  String?     // DB'de eşleştiyse
  weight    Float
  source    TasteSource
  updatedAt DateTime    @updatedAt
  @@id([userId, artistKey, source])
  @@index([artistId])
}

model TasteGenre {
  userId    String
  genreId   String
  weight    Float       // kullanıcı başına toplamı 1
  updatedAt DateTime    @updatedAt
  @@id([userId, genreId])
}

model VenueGenre {           // Venue.genres (örtük) yerine ağırlıklı açık tablo
  venueId String
  genreId String
  weight  Float  @default(1)
  @@id([venueId, genreId])
}

enum VenueArtistSource { LINEUP PLAYLIST ADMIN }

model VenueArtist {
  venueId  String
  artistId String
  weight   Float
  source   VenueArtistSource
  @@id([venueId, artistId, source])
}

model TagGenreMap {
  tag     String @id     // normalize("turkish pop")
  genreId String
  weight  Float  @default(1)
}
```

## 7. API

| Uç | Açıklama |
|---|---|
| `GET /v1/me/taste` | Profil: tür vektörü, en çok sanatçılar, bağlı hesaplar |
| `POST /v1/me/taste/manual {genres[], artists[]}` | Onboarding seçimi |
| `POST /v1/me/connections/lastfm {username}` | Last.fm bağla + ilk senkron |
| `POST /v1/me/connections/apple-music {musicUserToken}` | iOS MusicKit kullanıcı token'ı; developer token sunucuda üretilir |
| `POST /v1/me/connections/google {code, codeVerifier}` | YouTube (beğenilenler + abonelikler) |
| `POST /v1/me/connections/spotify {code, codeVerifier, redirectUri}` | **Kota açılınca** (≥ 250 bin MAU); token değişimi sunucuda, refresh token şifreli |
| `POST /v1/me/connections/:provider/sync` | Elle yenile (günde ≤ 3) |
| `DELETE /v1/me/connections/:provider` | Bağlantıyı kaldır + o kaynaktan türeyen veriyi sil |
| `POST /v1/me/taste/reset` | Profili sıfırla |
| `GET /v1/me/taste/suggested-follows` | Bağlı hesaptaki sanatçılardan DB'de olanlar |
| Liste/detay yanıtlarında | `match: { score: 92, label: "Tam senin sesin", reasons: ["Mabel Matiz'i sık dinliyorsun"] }` (girişli ve profilli kullanıcıya) |

İşler: `taste-sync` (haftalık, bağlı hesaplar) · `venue-sound-refresh` (gece, lineup geçmişinden) · `taste-decay` (gece, uygulama içi sinyaller).

## 8. Gizlilik ve uyum

- **Açık rıza:** "Müzik hesabı verilerimin, mekân ve etkinlik önerisi amacıyla işlenmesine izin veriyorum" — ayrı onay kutusu, sürümlü `Consent`.
- **Veri minimizasyonu:** yalnız sanatçı adı + ağırlık ve tür ağırlıkları; parça listesi, zaman damgalı geçmiş, çalma listesi içeriği saklanmaz.
- **Silme:** bağlantıyı kaldırınca token ve o kaynağın `TasteArtist` satırları anında silinir; hesap silmede hepsi.
- **Amaç sınırı:** profil yalnız kullanıcıya öneri için; reklam hedeflemesi, üçüncü tarafa aktarma, mekâna kişi bazlı veri yok
  (mekân yalnız toplu istatistik görür: "profiliyle eşleşen 1.240 kullanıcı").
- Sağlayıcı geliştirici politikalarına uyum (marka kullanımı, "Spotify ile bağlan" düğme kuralları, veri saklama süreleri) — §5.1.

## 9. Ölçüm

- Ses profili oluşturma oranı (kaynak bazında), bağlama hata/vazgeçme oranı.
- Eşleşme rozeti görülen kartlarda tıklama oranı vs rozetsiz kartlar (A/B: rozet açık/kapalı).
- "Senin sesin" filtresi kullanım oranı.
- Eşleşen sanatçı takibi önerisinin kabul oranı.
