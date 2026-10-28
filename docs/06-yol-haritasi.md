# 06 — Yol haritası

> Varsayım: 1 geliştirici + Claude, haftada ~5 iş günü. Başlangıç **2 Kasım 2026 (Hafta 1)**.
> Her faz **çalışır ve test edilebilir** bitmeden sonrakine geçilmez (içerik işleri hariç; o paralel yürür).

## Özet takvim

| Hafta | Faz | Çıktı |
|---|---|---|
| — | **0 · Prototip** ✅ | API + Expo prototipi, demo veri, simülatörde uçtan uca çalışıyor (28 Eki 2026) |
| 1–2 | **1 · Backend temeli** | Kimlik, kullanıcı, takip/kaydet, bildirim altyapısı, PlayLog + poller, arama, admin rolleri, VPS'te yayında |
| 3–4 | **2 · Admin paneli** | Tüm içerik ekranları, Eşleşmeyenler kuyruğu, istasyon sağlığı, kampanya |
| 4–5 | **3 · Zevk eşleşmesi** | Ses profili, hesap bağlama (Last.fm + Spotify + YouTube), mekân ses profili, eşleşme puanı API'si |
| 5–8 | **4 · Mobil MVP** | Onboarding, giriş, 5 sekme, harita, filtreler, tam ekran oynatıcı, bildirimler, eşleşme rozetleri, KVKK ayarları |
| 3–9 | **5 · İçerik ve beta** (paralel) | 150 mekân, 500+ sanatçı, her gece 40+ etkinlik akışı, organizatör ağı, TestFlight/Play beta (50–100 kişi) |
| 10 | **6 · Lansman (İstanbul)** | Mağazalarda yayın, lansman kampanyası |
| 11+ | **7 · Büyüme** | Mekân paneli, sponsorlu slotlar, sosyal, bilet satışı, yeni şehirler |

## Faz 1 — Backend temeli (Hafta 1–2)
- [x] Bağımlılık açıkları: NestJS 11, 36 → 2 (kalan ikisi geliştirme aracında, yaması yok — ADR-021).
- [x] `config` modülü: zod ile env doğrulama; `.env.example` güncel.
- [x] `auth`: e-posta OTP (SMTP; geliştirmede konsol), Apple, Google; JWT access/refresh rotasyonu; `@Public`, `@CurrentUser`, `AuthGuard`, `RolesGuard` (ADR-022).
- [x] `users`: profil, zevk türleri, `Consent` kayıtları, hesap silme (soft + 30 gün anonimleştirme işi), veri dışa aktarma.
- [x] `social`: `ArtistFollow`, `VenueFollow`, `SavedEvent`, `FavoriteStation` (idempotent PUT/DELETE) + cihazdan birleştirme ucu.
- [x] `notifications`: push token, bildirim kutusu, tercihler, Expo Push gönderici, makbuz işi, fan-out, hatırlatma (DB outbox, ADR-020).
- [x] `playlog`: poller işi (worker), `PlayLog`, `UnmatchedArtist` + admin kuyruğu, sanatçı "radyoda çaldı" bildirimi.
- [x] `stations`: saatlik sağlık işi, `status/failCount/lastError/codec/bitrate`; `DOWN` uygulamada (liste, arama, mekânın sesi) görünmez, `NO_METADATA` çalar ama "şu an çalan" sorulmaz; admin `stations/health` + `:slug/test`.
- [x] `search`: `pg_trgm` + tetikleyiciyle tutulan `searchText`; `/v1/search` Türkçe karakter ve yazım hatası toleranslı (ADR-023).
- [x] `events`: `REVIEW` durumu, `isFree/ageLimit/doorsAt/ticketProvider` (satıcı linkten çıkarılır), `/ics`, cursor sayfalama, `when=tomorrow`, `from/to`, `near`/`district`/`free`/`priceMax` filtreleri; `GET /v1/districts`.
- [ ] `venues`: ~~`VenueHours`, "şimdi açık"~~ ✅ (gece yarısını aşan saatler, `?openNow=1`, admin `PUT venues/:slug/hours`); Google Place alanları ve `Media` Faz 2'de (admin paneliyle).
- [x] `admin`: ~~`X-Admin-Key` → JWT + roller~~ ✅ (key geçiş dönemi için duruyor); `AuditLog` (`@Audit()` + global interceptor, `GET /v1/admin/audit` ADMIN).
- [x] `/v1` öneki (yayında eski sürüm olmadığı için yönlendirme gerekmedi; mobil güncellendi).
- [x] Seed'i ikiye böl: `db:seed:base` (tür + etiket + istasyon, prod'da da çalışır) / `db:seed` (temel + demo, prod'da çalışmaz).
- [x] Yerel türler (ADR-016): Türkçe Rap, Arabesk & Fantezi, Anadolu & Türkçe Rock, Fasıl & Türk Sanat (14 tür, 8 yeni istasyon); `TagGenreMap` ilk sürümü (~90 etiket).
- [x] `radio`: StreamTheWorld (Karnaval) yayınlarında Triton now-playing XML (sanatçı, parça, kapak); bilgi yoksa ya da eskiyse ICY'ye düşer (ADR-024).
- [x] Güven alanları (`sellerName`, `totalPriceNote`, `refundPolicy`; mekânda `doorPolicy`, `dressCode`, `ageLimit`) ve alkol denetimi: işaretli etkinlik `REVIEW`'a düşer, işaretli mekân metni kaydedilmez, MODERATOR+ `allowFlagged` ile geçirir; `GET /v1/admin/events?status=REVIEW` (ADR-015).
- [x] İçe aktarma: Etkinlik.io + Ticketmaster (`pnpm ingest <kaynak> [--dry-run]`, gece 04:00, admin `imports`); tekilleştirme ve mekân eşleme. **Anahtarlar bekleniyor** (`ETKINLIKIO_TOKEN`, `TICKETMASTER_API_KEY`).
- [ ] **Yayın:** ~~VPS'te Postgres kullanıcı/DB, `playce-api` + `playce-worker` (pm2), nginx, gece `pg_dump`~~ ✅ 28 Eki — geçici `http://94.138.209.152:8888` ([09](09-yayin.md)). `/health/deep` ✅; Sentry ve sunucu dışı yedek kodda hazır (DSN / hedef bekleniyor). Kalan: alan adı + certbot (HTTPS), e-posta sağlayıcısı.
- [x] e2e: auth, takip/kaydet, fan-out, bildirim, PlayLog, arama, istasyon sağlığı, etkinlik filtreleri, AuditLog, seed, discover, mekân saatleri, Triton, alkol denetimi, içe aktarma, derin sağlık (94 test).

## Faz 2 — Admin paneli (Hafta 3–4)
- [x] `apps/admin` Next.js 16 + shadcn iskeleti, OTP girişi (httpOnly çerez, sessiz yenileme — ADR-025), rol bazlı menü ve kuyruk rozetleri.
- [x] **Moderasyon** kuyruğu: alkol bayrakları, metni düzelt ve yayınla (yeniden denetim), "yine de yayınla" (MODERATOR+), taslağa al.
- [ ] Gösterge paneli (KPI'lar, iş kuyrukları, en çok çalanlar).
- [ ] Etkinlik liste + form (lineup sürükle-bırak, olası kopya uyarısı, canlı mobil önizleme, zamanlanmış yayın).
- [ ] Mekân liste + form (Google Places'ten doldur, harita pini, saatler, ses profili, galeri).
- [ ] Sanatçı liste + form (MusicBrainz'den bul, alias, birleştir, radyo geçmişi).
- [x] **Eşleşmeyenler** kuyruğu: oluştur (türler istasyondan önerilir) / bağla (yazım hatası toleranslı arama) / yoksay / geri al; çaldığı istasyonlar.
- [ ] İstasyonlar (sağlık, test et, radio-browser'dan ekle, sıralama), Türler.
- [ ] Öne çıkanlar (takvim görünümü, sponsorlu anahtarı), Başvurular, Kullanıcılar (KVKK silme), Kampanyalar, Denetim kaydı.
- [ ] Yayın: `admin.<alan-adı>`, pm2 `playce-admin` — alan adı (HTTPS) ve SMTP (giriş kodu) bekleniyor.

## Faz 3 — Zevk eşleşmesi (Hafta 4–5)
- [ ] Şema: `MusicConnection`, `TasteArtist`, `TasteGenre`, `VenueGenre` (ağırlıklı), `VenueArtist`, `TagGenreMap`.
- [ ] Sağlayıcılar: **Last.fm** (kullanıcı adı) → **Apple Music** (iOS, native modül) → **YouTube** (Google OAuth, doğrulama başvurusu erken).
      **Spotify lansmanda yok:** geliştirme modu 5 kullanıcı, genişletilmiş kota ≥ 250 bin MAU ve kurum şartı (08 §5).
- [ ] Uygulama içi sinyaller: tür bazında dinleme süresi, eşleşen sanatçılar, parça beğenisi.
- [ ] Mekân ses profili: admin ağırlıkları + geçmiş lineup + (varsa) mekân çalma listesi.
- [ ] Eşleşme puanı servisi + açıklama metni; `/v1/events` ve `/v1/venues` yanıtlarına `match: {score, reason}`.
- [ ] Haftalık yenileme işi; bağlantıyı kaldırınca türetilmiş verinin silinmesi.

## Faz 4 — Mobil MVP (Hafta 5–8)
- [ ] Development build + EAS profilleri; Sentry; PostHog (onaylı).
- [ ] Onboarding (welcome, ses profili, sanatçı ızgarası, konum).
- [ ] Giriş sheet'i (OTP, Apple, Google), token saklama, cihaz verisini hesaba taşıma.
- [ ] Sekmeler: Dinle (senin için radyo, son çalanlar), Bu Gece (liste/harita, filtre sheet'i), Mekânlar (liste/harita, "şimdi açık"), Ara, Sen.
- [ ] Tam ekran oynatıcı: önceki/sonraki istasyon, uyku zamanlayıcı, paylaş, kulaklık çıkınca dur.
- [ ] Eşleşme rozeti + açıklaması; "Senin sesin" sıralama ve filtre.
- [ ] Bildirimler: izin akışı (bağlamsal), kanallar, derin bağlantılar, bildirim kutusu.
- [ ] Takvime ekle, paylaş, yol tarifi, bilet çıkışı (sağlayıcı adıyla).
- [ ] Ayarlar: bildirim tercihleri, bağlı hesaplar, KVKK (aydınlatma, rızalar, veri indir, hesap sil).
- [ ] Evrensel linkler (`playce.app/e/…`) + paylaşım önizlemesi.
- [ ] Erişilebilirlik ve performans turu (VoiceOver, Dynamic Type, FlashList, açılış süresi).

## Faz 5 — İçerik ve beta (Hafta 3–9, paralel)
- [ ] Mekân listesi: Beyoğlu, Karaköy, Kadıköy, Beşiktaş, Şişli, Bomonti, Ortaköy, Bebek — **150 mekân**, hepsi ses profilli ve konumlu.
- [ ] Sanatçı: Türkiye'de radyoda en çok çalan **500+ sanatçı** (Eşleşmeyenler kuyruğu + liste), alias'larıyla.
- [ ] Etkinlik akışı: organizatör/mekân ağı (WhatsApp/e-posta), başvuru formu, bilet platformu ortaklıkları — hedef her gece 40+.
- [ ] İstasyon seçkisi: tür başına 4–6 çalışan HTTPS yayın, Türk istasyonları öncelikli.
- [ ] Hukuk: KVKK aydınlatma + ayrı açık rıza metinleri (konum, pazarlama, müzik profili), yurt dışı aktarım standart sözleşmeleri + 5 iş günü bildirimi,
      kullanım koşulları, VERBİS muafiyet teyidi, **alkol mevzuatı yorumu** (ADR-015).
- [ ] **İstasyon izinleri / ortaklıkları** (ADR-019): Karnaval → Power → Doğuş; izin yoksa istasyon çıkar.
- [ ] Veri başvuruları: Etkinlik.io yayıncı ağı, Bandsintown app_id; Bubilet / Biletinial / Mobilet'e derin link + UTM görüşmesi.
- [ ] Organizatör ağı: BUGECE tarzı self-servis giriş için ilk 30 organizatör/promoter (özellikle Kadıköy, Karaköy, Bomonti kulüpleri).
- [ ] Beta: TestFlight + Play internal (50–100 kişi), haftalık geri bildirim, çökme < %0,5.

## Faz 6 — Lansman (Hafta 10)
- [ ] Mağaza sayfaları (TR/EN ekran görüntüleri, kısa video), gizlilik etiketleri.
- [ ] Lansman haftası öne çıkanları; ilk 3 mekân ortaklığı.
- [ ] İzleme: dashboard KPI'ları, alarm (API down, poller durdu, kuyruk birikti).

## Faz 7+ — Büyüme (sıra değişebilir)
1. **Mekân / organizatör self-servis paneli** ve doğrulanmış profil.
2. **Sponsorlu öne çıkarma** satın alma (iyzico) + fatura.
3. **Sosyal:** arkadaşlarını bul, "arkadaşın gidiyor", ortak plan.
4. **Mekândan canlı "şu an çalan"** (işletme müzik servisleri / mekân yayını).
5. **Ses tanıma** (ortamdaki müziği tanı → mekân/etkinlik) — maliyet ve izin değerlendirmesiyle.
6. **Kendi bilet satışımız** (küçük/orta etkinlikler).
7. **Yeni şehirler:** İzmir, Ankara, Bodrum (yaz sezonu), Antalya.
8. **Web:** paylaşım sayfalarından tam web uygulamasına.

## Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Etkinlik verisi yetersiz | Uygulama boş görünür → kullanıcı kaçar | Lansmandan önce içerik fazı; organizatör ağı; "yakında" yerine her zaman dolu "bu hafta" |
| Müzik API kısıtları (özellikle Spotify) | Hesap bağlama herkese açılamaz | Last.fm + YouTube + manuel seçim + uygulama içi dinleme sinyali; ayrıntı 08 |
| Radyo yayınlarının kırılması | Kötü ilk deneyim | Saatlik sağlık işi, otomatik gizleme, tür başına yedek istasyon |
| Sanatçı eşleşme oranı düşük | Ana "aha" anı nadir | Eşleşmeyenler kuyruğu, alias'lar, MusicBrainz; tür köprüsü her zaman çalışır |
| Yayın hakları / istasyon izni | Hukuki risk, istasyonun listeden çıkması | Lansmandan önce yazılı izin/ortaklık (ADR-019); kayıt/yeniden yayın yok; istasyon adı ve logosu kaynağıyla |
| Alkol mevzuatı (7584) | Gece hayatı içeriğinde ceza riski | Promosyon/marka yasağı, görsel moderasyonu, 18+ kapısı, hukuk görüşü (ADR-015) |
| Biletçilerin API'si yok | Konser verisi eksik kalır | Etkinlik.io + organizatör girişi + Bandsintown; derin link ile ortaklık; kazıma yok (ADR-017) |
| fizy / BUGECE / NeYapsak? aynı alana girer | Fark erir | Hızlı lansman; asıl fark olan radyo + zevk eşleşmesi + mekân sesi üçlüsüne odak |
| Tek VPS | Kesinti | Gece yedeği, uptime alarmı, hızlı geri yükleme dokümanı |
