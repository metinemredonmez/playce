# 03 — Backend MVP

> Durum (28 Eki 2026): Faz 1 kodu büyük ölçüde bitti — kimlik, kullanıcı, takip/kaydet, bildirim, PlayLog, arama,
> istasyon sağlığı, etkinlik filtreleri, AuditLog ve yerel türler çalışıyor; 70 e2e testi geçiyor.
> VPS'te yayında (geçici IP adresi, HTTPS alan adını bekliyor): [09-yayin.md](09-yayin.md).
> Kalanlar (HTTPS, dış kaynaktan içe aktarma): [06-yol-haritasi.md](06-yol-haritasi.md) Faz 1 listesi.
> Bu doküman MVP'ye (İstanbul lansmanı) kadar backend'in **hedef halini** tanımlar.
> Kapsam ve öncelik: [02-mvp-kapsam.md](02-mvp-kapsam.md). Kararlar: [07-kararlar.md](07-kararlar.md).

## 1. Mimari

```
                 ┌──────────────┐        ┌──────────────┐
  Mobil (Expo) ──┤              │        │  Admin (Next)│
                 │   nginx      ├────────┤  admin.…     │
                 │  (TLS, gzip) │        └──────┬───────┘
                 └──────┬───────┘               │ /v1/admin/*
                        │ api.…                 │
                 ┌──────▼──────────────────────▼──┐
                 │        NestJS API (pm2)         │
                 │  REST /v1 · Swagger /docs       │
                 └──┬───────────┬───────────┬──────┘
                    │           │           │
              ┌─────▼───┐ ┌─────▼────┐ ┌────▼─────────┐
              │Postgres │ │  Redis   │ │ Object store │
              │   16    │ │ (sonra — │ │ (R2/S3 —     │
              │ +outbox │ │ ADR-020) │ │  görseller)  │
              └────┬────┘ └──────────┘ └──────────────┘
                               │
                      ┌────────▼─────────┐
                      │ Worker (pm2,      │  istasyon sağlığı, now-playing
                      │ aynı kod, ayrı    │  poller, hatırlatma, fan-out,
                      │ süreç)            │  haftalık özet, import, temizlik
                      └──────────────────┘
       Dış servisler: radio-browser.info · Expo Push · Google Places ·
                      MusicBrainz · (bilet/etkinlik kaynakları — 01-rakip-analizi §veri)
```

- **Tek kod tabanı, iki süreç:** `playce-api` (HTTP) ve `playce-worker` (zamanlanmış işler, `@nestjs/schedule`). Aynı Nest modülleri, `main.ts` / `worker.ts` iki giriş.
- **Kuyruk = veritabanı (ADR-020):** bildirim satırı aynı zamanda push kuyruğu; MVP'de Redis/BullMQ yok.
- **Sürümleme:** tüm public uçlar `/v1` altında. Mobil eski sürümler kırılmasın diye alan silmek yerine yenisini ekle.
- **Sunucu:** mevcut VPS (5,8 GB RAM, 2 çekirdek, Postgres 16, nginx 1.24, Node 22). Tahmini kullanım: API ~200 MB + worker ~150 MB.

## 2. Modüller

| Modül | Sorumluluk | Durum |
|---|---|---|
| `auth` | E-posta OTP, Apple, Google girişi; JWT access (15 dk) + refresh (30 gün, rotasyonlu); global `AuthGuard` + `RolesGuard` | ✅ |
| `users` | Profil, şehir, zevk (türler), KVKK onayları, hesap silme/dışa aktarma | ✅ |
| `genres` | 14 tür (yerel türler önce, ADR-016), renk, radioTag, `TagGenreMap` | ✅ |
| `stations` | Küratörlü istasyon + radio-browser araması, saatlik sağlık işi | ✅ |
| `radio` | Şu an çalan: Triton (StreamTheWorld, kapaklı) > ICY; parça ayrıştırma, SSRF koruması, yayın sağlık yoklaması | ✅ |
| `playlog` | Çalan parça kaydı, eşleşmeyen sanatçı kuyruğu, "radyoda çaldı" bildirimi | ✅ (istatistik uçları Faz 2) |
| `artists` | Sanatçı, alias, eşleştirme indeksi, dış kimlikler, birleştirme | var → genişlet |
| `venues` | Mekân, çalışma saatleri + "şimdi açık", güven alanları, "mekânın sesi"; fotoğraf ve Google Place Faz 2 | ✅ (kısmen) |
| `events` | Etkinlik, lineup, REVIEW durumu, bilet satıcısı, filtreler + cursor, `.ics` | ✅ (seri yok) |
| `discover` | `/discover/now` köprüsü, ana sayfa akışı, öneri skoru | var → genişlet |
| `search` | Sanatçı/mekân/etkinlik/istasyon birleşik arama (pg_trgm, ADR-023) | ✅ |
| `social` | Takip (sanatçı/mekân), kaydet/gidiyorum, favori istasyon, cihazdan birleştirme | ✅ (mobil bağlantısı Faz 4) |
| `notifications` | Push token, bildirim kutusu, tercih, Expo gönderici, fan-out, hatırlatma | ✅ (kampanya Faz 2) |
| `submissions` | Organizatör/mekân başvurusu, moderasyon | yeni |
| `media` | Görsel yükleme (presigned URL), boyutlandırma | yeni |
| `ingest` | Etkinlik.io + Ticketmaster etkinlik içe aktarma, tekilleştirme, mekân eşleme, `ExternalRef`/`ImportRun` | ✅ (anahtarlar bekleniyor) |
| `admin` | Rol tabanlı admin uçları, dashboard metrikleri | JWT+rol ✅ (key geçiş dönemi), dashboard Faz 2 |
| `audit` | Admin değişiklik kaydı (`@Audit()` + global interceptor) | ✅ |
| `health` | `/health`, `/health/deep` (DB, push kuyruğu gecikmesi, son PlayLog, son sağlık kontrolü → sorun varsa 503) | ✅ |

## 3. Veri modeli (hedef)

Mevcut şemaya eklenecekler. Kurallar: para **kuruş Int**, tüm zamanlar **UTC** saklanır (gösterim İstanbul UTC+3),
slug'lar benzersiz, silme yerine çoğunlukla `status`/`deletedAt`.

```prisma
// ---------- Kullanıcı & kimlik ----------
enum Role { USER EDITOR MODERATOR ADMIN SUPERADMIN }
enum AuthProvider { EMAIL APPLE GOOGLE }
enum ConsentKind { KVKK_AYDINLATMA ACIK_RIZA_PAZARLAMA ANALYTICS LOCATION }

model User {
  id         String    @id @default(cuid())
  email      String?   @unique
  name       String?
  avatarUrl  String?
  role       Role      @default(USER)
  city       String    @default("istanbul")
  locale     String    @default("tr")
  birthYear  Int?      // 18+ içerik için (yalnız yıl — veri minimizasyonu)
  bannedAt   DateTime?
  deletedAt  DateTime? // KVKK silme: 30 gün sonra kalıcı anonimleştirme
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  identities    AuthIdentity[]
  sessions      Session[]
  consents      Consent[]
  tasteGenres   Genre[]          @relation("UserTaste")
  artistFollows ArtistFollow[]
  venueFollows  VenueFollow[]
  saves         SavedEvent[]
  favStations   FavoriteStation[]
  pushTokens    PushToken[]
  notifications Notification[]
}

model AuthIdentity {
  id       String       @id @default(cuid())
  userId   String
  provider AuthProvider
  subject  String       // Apple sub / Google sub / e-posta
  user     User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, subject])
}

model Session {
  id          String    @id @default(cuid())
  userId      String
  refreshHash String    @unique // sha256(refresh token) — düz token saklanmaz
  userAgent   String?
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model OtpCode {
  id         String    @id @default(cuid())
  email      String
  codeHash   String
  attempts   Int       @default(0)
  expiresAt  DateTime  // 10 dk
  consumedAt DateTime?
  createdAt  DateTime  @default(now())
  @@index([email, createdAt])
}

model Consent {
  id        String      @id @default(cuid())
  userId    String
  kind      ConsentKind
  version   String      // metin sürümü: "2026-11-01"
  granted   Boolean
  createdAt DateTime    @default(now()) // her değişiklik yeni satır (ispat için)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, kind])
}

// ---------- Sosyal ----------
enum SaveStatus { INTERESTED GOING }

model ArtistFollow {
  userId    String
  artistId  String
  notifyOnRadio Boolean @default(true) // "radyoda çaldığında haber ver"
  createdAt DateTime @default(now())
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  artist    Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)
  @@id([userId, artistId])
  @@index([artistId])
}

model VenueFollow {
  userId    String
  venueId   String
  createdAt DateTime @default(now())
  user      User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  venue     Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)
  @@id([userId, venueId])
  @@index([venueId])
}

model SavedEvent {
  userId     String
  eventId    String
  status     SaveStatus @default(INTERESTED)
  remindedAt DateTime?
  createdAt  DateTime   @default(now())
  user       User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  event      Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  @@id([userId, eventId])
  @@index([eventId])
}

/// radio-browser istasyonları DB'de olmayabilir → URL + ad da saklanır.
model FavoriteStation {
  id        String   @id @default(cuid())
  userId    String
  stationId String?
  streamUrl String
  name      String
  genreSlug String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, streamUrl])
}

// ---------- Bildirim ----------
enum NotificationKind { ARTIST_NEW_EVENT ARTIST_ON_RADIO EVENT_REMINDER VENUE_NEW_EVENT WEEKLY_DIGEST CAMPAIGN SYSTEM }

model PushToken {
  id         String   @id @default(cuid())
  userId     String?  // girişsiz cihazlar da kampanya alabilir
  deviceId   String
  token      String   @unique // ExponentPushToken[…]
  platform   String   // ios | android
  lastSeenAt DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  kind      NotificationKind
  title     String
  body      String
  deeplink  String?          // playce://event/slug
  readAt    DateTime?
  createdAt DateTime         @default(now())
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
}

model NotificationPref {
  userId          String  @id
  artistNewEvent  Boolean @default(true)
  artistOnRadio   Boolean @default(true)
  eventReminder   Boolean @default(true)
  weeklyDigest    Boolean @default(true)
  marketing       Boolean @default(false) // açık rıza gerektirir
  quietStart      Int     @default(1)     // 01:00–10:00 arası push yok
  quietEnd        Int     @default(10)
}

model Campaign {
  id          String    @id @default(cuid())
  title       String
  body        String
  deeplink    String?
  segment     Json      // { genres?: [], followersOfArtist?: id, district?: "Kadıköy", all?: true }
  scheduledAt DateTime?
  sentAt      DateTime?
  stats       Json?     // { targeted, sent, failed, opened }
  createdById String
  createdAt   DateTime  @default(now())
}

// ---------- Radyo istatistiği ----------
enum StationStatus { OK DOWN NO_METADATA }

// Station'a eklenecek alanlar:
//   status StationStatus @default(OK), lastCheckedAt DateTime?, failCount Int @default(0),
//   codec String?, bitrate Int?, isFeatured Boolean @default(false)

model PlayLog {
  id        BigInt   @id @default(autoincrement())
  stationId String
  raw       String
  artistRaw String?
  title     String?
  artistId  String?  // eşleştiyse
  at        DateTime @default(now())
  @@index([artistId, at])
  @@index([stationId, at])
}

enum UnmatchedStatus { OPEN IGNORED LINKED }

/// Radyoda çalan ama DB'de olmayan sanatçılar — admin "eşleşmeyenler" kuyruğu.
model UnmatchedArtist {
  normalized String          @id // normalize("Oğuzhan Koç") = "oguzhan koc"
  display    String
  plays      Int             @default(1)
  sampleRaw  String
  lastSeenAt DateTime        @default(now())
  status     UnmatchedStatus @default(OPEN)
  artistId   String?
  @@index([status, plays])
}

// ---------- İçerik zenginleştirme ----------
enum ExternalSource { MUSICBRAINZ SPOTIFY APPLE_MUSIC BANDSINTOWN TICKETMASTER BILETIX PASSO BUBILET BILETINIAL MOBILET GOOGLE_PLACES INSTAGRAM }

model ExternalRef {
  id         String         @id @default(cuid())
  entityType String         // artist | venue | event
  entityId   String
  source     ExternalSource
  externalId String
  url        String?
  syncedAt   DateTime?
  @@unique([source, externalId])
  @@index([entityType, entityId])
}

model VenueHours {
  venueId  String
  weekday  Int    // 0=Pazar … 6=Cumartesi
  opensAt  String // "20:00"
  closesAt String // "04:00" (ertesi gün sayılır)
  venue    Venue  @relation(fields: [venueId], references: [id], onDelete: Cascade)
  @@id([venueId, weekday])
}

model Media {
  id         String   @id @default(cuid())
  url        String
  width      Int?
  height     Int?
  blurhash   String?
  credit     String?  // görsel hakkı / kaynak
  entityType String
  entityId   String
  sort       Int      @default(0)
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
}

// Venue'ya eklenecek alanlar:
//   googlePlaceId String? @unique, phone String?, website String?, reservationUrl String?,
//   capacity Int?, ageLimit Int?, isClaimed Boolean @default(false), soundStationId String? (override),
//   hours VenueHours[], follows VenueFollow[], searchText String (normalize edilmiş)
// Artist'e eklenecek alanlar:
//   country String?, isTurkish Boolean @default(false), instagram String?, popularity Int @default(0),
//   follows ArtistFollow[], searchText String
// Event'e eklenecek alanlar:
//   isFree Boolean @default(false), ageLimit Int?, doorsAt DateTime?, ticketProvider ExternalSource?,
//   publishedAt DateTime?, cancelledReason String?, seriesId String?, createdById String?,
//   saves SavedEvent[], searchText String
//   EventStatus'e REVIEW eklenir: DRAFT → REVIEW → PUBLISHED → (CANCELLED | ARCHIVED)

// ---------- Moderasyon & operasyon ----------
enum SubmissionKind { EVENT VENUE ARTIST_CLAIM VENUE_CLAIM CORRECTION }
enum SubmissionStatus { PENDING APPROVED REJECTED }

model Submission {
  id           String           @id @default(cuid())
  kind         SubmissionKind
  payload      Json
  contactName  String
  contactEmail String
  contactPhone String?
  status       SubmissionStatus @default(PENDING)
  reviewerId   String?
  reviewNote   String?
  createdAt    DateTime         @default(now())
  reviewedAt   DateTime?
  @@index([status, createdAt])
}

enum FeaturedPlacement { HOME_HERO TONIGHT_PICKS WEEKEND_PICKS GENRE_TOP }

model FeaturedSlot {
  id         String            @id @default(cuid())
  placement  FeaturedPlacement
  entityType String            // event | venue | artist | station
  entityId   String
  title      String?
  startsAt   DateTime
  endsAt     DateTime
  sort       Int               @default(0)
  sponsored  Boolean           @default(false) // ücretli öne çıkarma → "Sponsorlu" etiketi zorunlu
  @@index([placement, startsAt, endsAt])
}

model ImportRun {
  id         String    @id @default(cuid())
  source     ExternalSource
  startedAt  DateTime  @default(now())
  finishedAt DateTime?
  created    Int       @default(0)
  updated    Int       @default(0)
  skipped    Int       @default(0)
  errors     Json?
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String   // event.publish, venue.update, artist.merge …
  entityType String
  entityId   String
  diff       Json?
  createdAt  DateTime @default(now())
  @@index([entityType, entityId])
  @@index([actorId, createdAt])
}
```

## 4. API (v1)

Kimlik: `Authorization: Bearer <access>`. 🔓 = girişsiz, 🔐 = kullanıcı, 🛡 = admin rolü.
Liste uçları **cursor** sayfalama: `?cursor=<id>&limit=20` → `{ items, nextCursor }`.

### 4.1 Keşif (public)
| Uç | | Açıklama |
|---|---|---|
| `GET /v1/home` | 🔓 | Ana sayfa akışı: öne çıkanlar, bu gece seçkisi, zevke göre türler, yakındaki mekânlar (konum verilirse) |
| `GET /v1/genres` | 🔓 | Türler + istasyon/mekân sayısı |
| `GET /v1/genres/:slug/stations?more=1` | 🔓 | Küratörlü + radio-browser |
| `GET /v1/stations/search?q&tag&country` | 🔓 | radio-browser araması (10 dk cache) |
| `GET /v1/radio/now-playing?url=` | 🔓 | ✅ `{raw, artist, title, cover}` — StreamTheWorld'de Triton (kapaklı), diğerlerinde ICY |
| `GET /v1/discover/now?url&genre` | 🔓 | Çalan parça + sanatçı eşleşmesi + konserleri + türün bu geceki etkinlikleri + mekânlar |
| `GET /v1/events?when&from&to&genre&venue&artist&district&free&priceMax&near&radiusKm&sort&cursor&limit` | 🔓 | ✅ `{items, nextCursor}`. `when`: tonight/tomorrow/weekend/upcoming; `from/to`: İstanbul günü ya da ISO; `priceMax` kuruş; `near=lat,lng` → `distanceKm`; `sort`: soonest/nearest (popular sonra) |
| `GET /v1/events/:slug` | 🔓 | Detay + lineup + mekân + benzer etkinlikler |
| `GET /v1/events/:slug/ics` | 🔓 | ✅ Takvime ekle dosyası (iptalde `STATUS:CANCELLED`) |
| `GET /v1/venues?genre&district&openNow&near&cursor` | 🔓 | Bu gece etkinliği olanlar, sonra şu an açık olanlar önce; her kartta `openNow`/`openUntil` (✅ genre, district, openNow; near/cursor sonra) |
| `GET /v1/venues/:slug` | 🔓 | Detay + saatler (Pazartesiden) + `openNow`/`openUntil` + yaş/kapı/kıyafet kuralı + program + "mekânın sesi" (fotoğraflar sonra) |
| `GET /v1/artists/:slug` | 🔓 | Detay + konserler + `onRadio` (son 7 günde çaldığı istasyonlar, PlayLog) |
| `GET /v1/stations/:slug/plays?limit` | 🔓 | İstasyonda son çalanlar (eşleşen sanatçıyla) |
| `GET /v1/search?q` | 🔓 | ✅ `{ artists, venues, events, stations }` — Türkçe karakter ve küçük yazım hatası duyarsız; etkinlikte lineup da aranır |
| `GET /v1/districts` | 🔓 | ✅ `[{slug, name, venues}]` — `district` filtresi slug ya da adı kabul eder |
| `POST /v1/submissions` | 🔓 | Organizatör etkinlik/mekân başvurusu (rate limit + captcha) |

### 4.2 Kimlik
| Uç | | |
|---|---|---|
| `POST /v1/auth/otp/request {email}` | 🔓 | 6 haneli kod e-postayla; 60 sn'de 1, saatte 5 |
| `POST /v1/auth/otp/verify {email, code}` | 🔓 | → `{access, refresh, user, isNew}`; 5 yanlışta kod iptal |
| `POST /v1/auth/apple {identityToken, name?}` | 🔓 | Apple JWKS ile doğrulama |
| `POST /v1/auth/google {idToken}` | 🔓 | Google tokeninfo / JWKS |
| `POST /v1/auth/refresh {refresh}` | 🔓 | Rotasyon: eski refresh iptal, yeniden kullanım = tüm oturumlar düşer |
| `POST /v1/auth/logout` | 🔐 | Oturumu kapat |

### 4.3 Ben
| Uç | | |
|---|---|---|
| `GET/PATCH /v1/me` | 🔐 | ad, şehir, doğum yılı, zevk türleri |
| `DELETE /v1/me` | 🔐 | KVKK: hesabı sil (soft → 30 gün sonra anonimleştir) |
| `GET /v1/me/export` | 🔐 | KVKK: verilerimi JSON indir |
| `POST /v1/me/consents` | 🔐 | onay ver/geri al (sürüm bilgisiyle) |
| `PUT/DELETE /v1/me/follows/artists/:slug` | 🔐 | sanatçı takip (+ `notifyOnRadio`) |
| `PUT/DELETE /v1/me/follows/venues/:slug` | 🔐 | mekân takip |
| `PUT/DELETE /v1/me/saves/:eventSlug {status}` | 🔐 | ilgileniyorum / gidiyorum |
| `GET /v1/me/saves?when=upcoming\|past` | 🔐 | takvimim |
| `GET/PUT /v1/me/stations` · `DELETE /v1/me/stations?url=` | 🔐 | favori istasyonlar (URL ile tekil) |
| `POST /v1/me/merge-device` | 🔐 | girişten önce cihazda tutulan favori istasyon/mekân/sanatçı/etkinlikleri hesaba taşır |
| `GET /v1/me/following` | 🔐 | takip edilen sanatçı/mekânlar |
| `POST /v1/me/push-tokens` | 🔓/🔐 | cihaz token kaydı (girişsiz de olur) |
| `GET /v1/me/notifications?cursor&limit` · `POST …/read {ids?}` | 🔐 | bildirim kutusu → `{items, nextCursor, unread}` |
| `GET/PATCH /v1/me/notification-prefs` | 🔐 | bildirim tercihleri, sessiz saatler |

### 4.4 Admin (🛡)
`/v1/admin/*` — JWT + `@Roles()`; her yazma işlemi `AuditLog`'a düşer. Ekranlar: [04-admin.md](04-admin.md).

| Grup | Uçlar | Rol |
|---|---|---|
| Dashboard | `GET stats/overview`, `GET stats/plays?range`, `GET stats/funnel` | EDITOR+ |
| Etkinlik | `GET events?status&when&q&genre&venue&source&missing&cursor` ✅ (liste + moderasyon kuyruğu; alkol bayrakları, `counts` = durum dağılımı), `GET events/:slug` ✅ (form: lineup sırası, kaydetme, dış kaynaklar), `POST events/check` ✅ (kaydetmeden önce alkol bayrağı + olası kopya; yazmaz), `POST/PATCH/DELETE events/:slug` ✅. Kurallar: kapı ≤ başlangıç < bitiş; bitmiş etkinlik yayına alınamaz. Toplu durum ve kopyalama panelde (tek tek PATCH / formu doldur) | EDITOR+ (`allowFlagged`: MODERATOR+) |
| Seçiciler | `GET lookup/venues?q`, `GET lookup/artists?q` ✅ (Türkçe karakter + yazım hatası duyarsız, 10 sonuç) | EDITOR+ |
| Mekân | CRUD ✅ + `PUT venues/:slug/hours` ✅, `GET places/search?q` (Google Places), `POST venues/:id/import-place` | EDITOR+ |
| Sanatçı | CRUD + `POST artists/:id/merge {intoId}`, `POST artists/:id/aliases`, `GET artists/lookup?q` (MusicBrainz) | EDITOR+ |
| Eşleşmeyenler | `GET unmatched?status&sort=plays`, `POST unmatched/:key/{link,create,ignore}` | EDITOR+ |
| İstasyon | CRUD + `POST stations/:slug/test` (bağlan + ICY oku) ✅, `GET stations/health` ✅ | EDITOR+ |
| Tür | CRUD + sıra | ADMIN |
| Başvurular | `GET submissions?status`, `POST submissions/:id/{approve,reject}` | MODERATOR+ |
| Öne çıkanlar | CRUD `featured` | EDITOR+ |
| Kampanya | CRUD `campaigns`, `POST campaigns/:id/{test,send}`, `GET campaigns/:id/stats` | ADMIN |
| Kullanıcı | `GET users?q`, `GET users/:id`, `POST users/:id/{ban,unban,delete}`, rol atama | ADMIN (rol: SUPERADMIN) |
| Medya | `POST uploads/presign {kind, contentType}` → `{url, fields, publicUrl}` | EDITOR+ |
| İçe aktarma | `POST imports/:source/run?dryRun` ✅, `GET imports` ✅ | ADMIN |
| Denetim | `GET audit?entityType&entityId&actor&cursor` ✅ | ADMIN |

## 5. Arka plan işleri (`playce-worker`, `src/jobs/jobs.service.ts`)

| İş | Sıklık | Ne yapar |
|---|---|---|
| `station-health` | saatte 1 | Her küratörlü yayına bağlan; 3 ardışık hata → `DOWN` (uygulamada gizlenir), ICY yoksa `NO_METADATA` |
| `now-playing-poller` | 60 sn | Küratörlü ICY istasyonlarını oku → `PlayLog`; eşleşmezse `UnmatchedArtist.plays++`; takip edilen sanatçı çalarsa `ARTIST_ON_RADIO` (kullanıcı başına günde en fazla 1) |
| `event-fanout` | etkinlik yayınlanınca | Sanatçı ve mekân takipçilerine `ARTIST_NEW_EVENT` / `VENUE_NEW_EVENT` |
| `event-reminder` | 5 dk | `SavedEvent` → başlangıçtan 3 saat önce `EVENT_REMINDER` (bir kez) |
| `weekly-digest` | Perşembe 18:00 TRT | Zevke + takiplere göre hafta sonu seçkisi (en fazla 5) |
| `push-dispatch` | 10 sn | `PENDING` ve `pushAfter ≤ şimdi` bildirimleri Expo'ya (100'lük paketler); cihaz yoksa `SKIPPED`, 6 saatte gidemeyen `FAILED` |
| `campaign-send` | zamanlanınca | Segmenti çöz → bildirim satırları üret (gönderimi `push-dispatch` yapar) — Faz 2 |
| `push-receipts` | 15 dk | Expo makbuzları; `DeviceNotRegistered` → token sil |
| `ingest` | gece 04:00 | Anahtarı tanımlı kaynaklardan (Etkinlik.io, Ticketmaster) İstanbul müzik etkinliklerini içe aktar, tekilleştir (§7); elle `pnpm ingest <kaynak> [--dry-run]` |
| `cleanup` | gece 03:00 | Süresi dolan OTP/oturum, 90 günden eski PlayLog (günlük özete indir), silinen hesapları anonimleştir |

Sessiz saatler (varsayılan 01:00–10:00) ve kullanıcı tercihleri tüm push işlerinde uygulanır: sessiz saatte push
ertelenir; "şu an radyoda" ertelenince anlamsızlaştığı için yalnız bildirim kutusuna düşer. Tercih kapalıysa bildirim hiç üretilmez.

## 6. Öneri ve sıralama (MVP: kural tabanlı)

Etkinlik skoru (ana sayfa / "senin için"):

```
skor = 3·(takip ettiğin sanatçı çıkıyor)
     + 2·(şu an dinlediğin tür) + 1.5·(zevk türlerinden biri)
     + 1·(takip ettiğin mekân)
     + 1·zaman_yakınlığı(0–1, bu gece = 1)
     + 0.5·mesafe_yakınlığı(0–1, konum izni varsa)
     + 0.5·popülerlik(log(kaydetme+1) normalize)
     + öne_çıkarma (FeaturedSlot, sponsorlu ise "Sponsorlu" etiketi)
```

ML yok; sinyaller `SavedEvent`, `ArtistFollow`, `PlayLog` ve tıklama olaylarından birikir, sonraki fazda kullanılır.

## 7. İçerik ve veri edinme

| Kaynak | Ne için | Yöntem |
|---|---|---|
| Admin girişi | Etkinlik, mekân, sanatçı | Panel (ana kaynak, MVP) |
| Organizatör başvurusu | Etkinlik/mekân | `POST /v1/submissions` → moderasyon |
| Eşleşmeyenler kuyruğu | Sanatçı kapsamı | Radyoda en çok çalan eşleşmeyen sanatçılar → tek tıkla ekle |
| MusicBrainz | Sanatçı kimliği, alias, ülke | Admin "ara ve ekle" (1 istek/sn sınırı, User-Agent zorunlu) |
| Google Places | Mekân adresi, konum, saat, telefon | Admin "Places'ten içe aktar" (yalnız place_id ve izin verilen alanlar saklanır) |
| **Etkinlik.io V2 API** | Türkiye etkinlik + mekân + semt | Yayıncı ağı başvurusu, `X-Etkinlik-Token`; gece `ingest:etkinlikio` — **ilk dış kaynak** |
| Bandsintown | İstanbul'a gelen yabancı sanatçılar | app_id başvurusu / ortaklık; DB'deki sanatçılar için sorgu |
| Ticketmaster Discovery | Biletix verisi var mı? | `countryCode=TR` ile test; varsa `ingest:ticketmaster` |
| Bilet platformları (Bubilet, Biletinial, Mobilet, Biletix, Passo) | Konser verisi + gelir | Herkese açık API yok → derin link + UTM; tıklama verisiyle gelir paylaşımı teklifi. **Kazıma yok** (hukuk görüşü olmadan) |
| **Triton now-playing XML** | Karnaval istasyonlarında sanatçı, parça, **kapak** | `np.tritondigital.com/public/nowplaying?mountName=<MOUNT>&eventType=track`; ICY'ye tercih edilir |
| ACRCloud / AudD | Metadata vermeyen önemli istasyonlar (Power, Kral, Eksen HLS) | İstasyon başına aylık ücret; yalnız seçili istasyonlar (S12) |
| radio-browser.info | İstasyon keşfi | Mevcut; sunucu `all.api.radio-browser.info` ile seçilmeli |

Tekilleştirme: `(normalize(title), venueId, startsAt ± 2 saat)` aynıysa aynı etkinlik → `ExternalRef` eklenir, yeni kayıt açılmaz.

## 8. Güvenlik ve uyum

- **Rate limit** (`@nestjs/throttler`, bellek içi — tek API süreci): genel 120 istek/dk/IP; giriş uçları 10/dk/IP;
  OTP ayrıca 60 sn'de 1 ve saatte 5/e-posta (DB'den); `discover/now` 30/dk/IP ve submissions 5/saat/IP (sonra).
- **Doğrulama:** class-validator `whitelist + forbidNonWhitelisted`; tüm slug/ID parametreleri doğrulanır.
- **Yetki:** admin uçlarında açık `@Roles()`; rol atama yalnız SUPERADMIN; admin girişi e-posta OTP + (sonra) TOTP.
- **SSRF:** now-playing ve istasyon testinde iç ağ adresleri engelli (mevcut), yanıt boyutu ve süresi sınırlı.
- **Gizli bilgiler:** `.env` repoda yok; prod'da `ADMIN` hesapları, JWT anahtarları, Expo access token, Places API key.
- **KVKK:** aydınlatma metni + açık rıza ayrımı (pazarlama push'u, analitik), onay sürümlü kayıt (`Consent`),
  hesap silme/dışa aktarma uçları, VERBİS değerlendirmesi, veri saklama süreleri (PlayLog ham 90 gün, silinen hesap 30 gün).
- **KVKK yurt dışı aktarım:** Yurt dışındaki her servis (Sentry, PostHog, Expo Push, e-posta sağlayıcısı, object store) için
  standart sözleşme imzalanır ve **imzadan sonra 5 iş günü içinde KVKK'ya bildirilir**. Mümkünse AB bölgesi veya kendi sunucumuz kullanılır;
  servis listesi `docs/` altında güncel tutulur.
- **Alkol mevzuatı (7584 sayılı Kanun, ADR-015):** etkinlik/mekân metin ve görsellerinde alkol markası, promosyonu
  ("happy hour", "2 al 1 öde") ve alkol sponsorlu gece yayınlanamaz. API'de basit anahtar kelime denetimi → `REVIEW` durumuna düşürür;
  son karar admin moderasyonunda. Gece hayatı içeriği `ageLimit ≥ 18` ile işaretlenir, 18 yaş altı/doğrulanmamış kullanıcıya gösterilmez.
- **Güven alanları:** `Event.sellerName`, `Event.refundPolicy`, `Event.totalPriceNote`; `Venue.doorPolicy`, `Venue.dressCode` — kartta gösterilir (M17).
- **Loglama:** pino JSON; kişisel veri (e-posta, token) maskelenir. Hata takibi: Sentry.
- **Yedek:** `pg_dump` her gece 03:30, 14 gün sakla, haftalık sunucu dışına kopya.

## 9. Gözlemlenebilirlik

- `/health` (canlılık) ve `/health/deep` (DB, en eski bekleyen push'un yaşı, son PlayLog, son istasyon kontrolü; sorun varsa 503).
- Sentry: `SENTRY_DSN` ile açılır; yalnız hata ve yığın izi (kişisel veri toplama kapalı, `src/instrument.ts`).
- Metrikler (admin dashboard'da): DAU, çalma oturumu, **eşleşme oranı** (eşleşen parça / metadata'lı parça),
  **köprü tıklama oranı** (discover kartı tıklaması / çalma oturumu), takip/kaydet sayıları, bilet çıkış tıklamaları,
  kırık istasyon sayısı, bekleyen başvurular.

## 10. Klasör yapısı (hedef)

```
apps/api/src/
  main.ts · worker.ts · app.module.ts
  common/        guards (jwt, roles, admin), decorators (@Public, @Roles, @CurrentUser),
                 pipes, filters, selects.ts, text.ts, time.ts, pagination.ts
  config/        env şeması (zod) — eksik env'de açılışta hata
  prisma/
  auth/ users/ genres/ stations/ radio/ playlog/ artists/ venues/ events/
  discover/ search/ social/ notifications/ submissions/ media/ ingest/ admin/ audit/ health/
  jobs/          queue tanımları + processor'lar
```

## 11. Kabul kriterleri (backend MVP bitti sayılır)

1. Kullanıcı OTP / Apple / Google ile girer, refresh rotasyonu çalışır, çıkış ve hesap silme çalışır.
2. Takip / kaydet / favori istasyon uçları idempotent (`PUT` iki kez = tek kayıt).
3. Etkinlik yayınlanınca takipçilere push gider; kaydedilen etkinlik için 3 saat önce hatırlatma gelir; sessiz saatlere uyulur.
4. Poller en az 20 küratörlü istasyonu dakikada okur; eşleşmeyenler kuyruğu admin'de görünür.
5. Kırık istasyon 3 saat içinde otomatik gizlenir.
6. `GET /v1/search` Türkçe karakter duyarsız ("dedubluman" → Dedublüman).
7. Tüm admin yazmaları AuditLog'da; rolsüz kullanıcı admin ucunda 403 alır.
8. e2e testler: auth akışı, discover, events filtreleri, admin yayınla → fan-out.
9. VPS'te `playce-api` + `playce-worker` pm2 altında, HTTPS arkasında, gece yedeği alınıyor.
