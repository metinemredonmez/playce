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
- [ ] `config` modülü: zod ile env doğrulama; `.env.example` güncel.
- [ ] `auth`: e-posta OTP (Mailpit/SMTP), Apple, Google; JWT access/refresh rotasyonu; `@Public`, `@CurrentUser`, `JwtGuard`, `RolesGuard`.
- [ ] `users`: profil, zevk türleri, `Consent` kayıtları, hesap silme (soft + 30 gün anonimleştirme işi), veri dışa aktarma.
- [ ] `social`: `ArtistFollow`, `VenueFollow`, `SavedEvent`, `FavoriteStation` (idempotent PUT/DELETE) + cihazdan birleştirme ucu.
- [ ] `notifications`: push token, bildirim kutusu, tercihler, Expo Push gönderici, makbuz işi.
- [ ] `playlog`: poller işi (BullMQ), `PlayLog`, `UnmatchedArtist`, sanatçı "radyoda çaldı" bildirimi.
- [ ] `stations`: sağlık işi, `status` alanları; uygulama `DOWN` olanları görmez.
- [ ] `search`: `pg_trgm` + normalize edilmiş `searchText` sütunları; `/v1/search`.
- [ ] `events`: `REVIEW` durumu, `isFree/ageLimit/doorsAt/ticketProvider`, `/ics`, cursor sayfalama, `near`/`district`/`priceMax` filtreleri.
- [ ] `venues`: `VenueHours`, "şimdi açık", Google Place alanları, `Media`.
- [ ] `admin`: `X-Admin-Key` → JWT + roller; `AuditLog` interceptor'ı.
- [ ] `/v1` öneki; eski uçlar bir sürüm boyunca yönlendirme.
- [ ] Seed'i ikiye böl: `seed:base` (tür + istasyon, prod) / `seed:demo` (yalnız geliştirme).
- [ ] Yerel türler (ADR-016): Türkçe Rap, Arabesk & Fantezi, Anadolu Rock, Fasıl & Türk Sanat; `TagGenreMap` ilk sürümü.
- [ ] `radio`: Karnaval istasyonları için Triton now-playing XML (sanatçı, parça, kapak); ICY'ye düşme.
- [ ] Güven alanları (`sellerName`, `refundPolicy`, `doorPolicy`, `dressCode`) ve alkol anahtar kelime denetimi → `REVIEW` (ADR-015).
- [ ] `ingest:etkinlikio` (token gelince) ve Ticketmaster `countryCode=TR` deneme betiği.
- [ ] **Yayın:** VPS'te Postgres kullanıcı/DB, Redis, `playce-api` + `playce-worker` (pm2), nginx + certbot (`api.<alan-adı>`), gece `pg_dump`, Sentry.
- [ ] e2e: auth, takip/kaydet, discover, events filtreleri, admin yayınla → fan-out.

## Faz 2 — Admin paneli (Hafta 3–4)
- [ ] `apps/admin` Next.js 15 + shadcn iskeleti, OTP girişi, rol bazlı menü.
- [ ] Gösterge paneli (KPI'lar, iş kuyrukları, en çok çalanlar).
- [ ] Etkinlik liste + form (lineup sürükle-bırak, olası kopya uyarısı, canlı mobil önizleme, zamanlanmış yayın).
- [ ] Mekân liste + form (Google Places'ten doldur, harita pini, saatler, ses profili, galeri).
- [ ] Sanatçı liste + form (MusicBrainz'den bul, alias, birleştir, radyo geçmişi).
- [ ] **Eşleşmeyenler** kuyruğu (oluştur / bağla / yoksay).
- [ ] İstasyonlar (sağlık, test et, radio-browser'dan ekle, sıralama), Türler.
- [ ] Öne çıkanlar (takvim görünümü, sponsorlu anahtarı), Başvurular, Kullanıcılar (KVKK silme), Kampanyalar, Denetim kaydı.
- [ ] Yayın: `admin.<alan-adı>`, pm2 `playce-admin`.

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
