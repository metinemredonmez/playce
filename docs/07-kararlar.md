# 07 — Kararlar (ADR)

Her önemli karar burada: bağlam → karar → sonuç. Yeni karar en alta, numara artarak.

---

## ADR-001 · İsim: Playce
- **Bağlam:** İlk öneri "Frekans" yalnız radyoyu anlatıyordu; ürün radyo + mekân + etkinlik.
- **Karar:** **Playce** = *play* (müziği çal) + *place* (mekânı bul). Uluslararası okunur, kısa.
- **Sonuç:** Marka iki renkle anlatılır: pembe = play, turkuaz = place. Alan adı / marka tescili kontrol edilecek.

## ADR-002 · Luca'dan bağımsız ürün
- **Bağlam:** Luca'da radyo, koleksiyon ve etkinlik altyapısı vardı; ortak backend seçeneği konuşuldu.
- **Karar:** Ayrı repo, ayrı backend, ayrı veritabanı. Luca'dan yalnız kod parçaları (ICY okuyucu) kopyalandı.
- **Sonuç:** Bağımsız yayın takvimi ve ölçek; ortak kullanıcı hesabı yok.

## ADR-003 · Önce mobil (Expo)
- **Bağlam:** Radyo telefonda dinlenir; arka planda çalma ve kilit ekranı şart.
- **Karar:** Expo SDK 58 + expo-router + expo-audio; iOS ve Android tek kod. Web yalnız paylaşım sayfaları için (sonra).
- **Sonuç:** Development build + EAS zorunlu (push, Apple girişi, harita, OAuth Expo Go'da yok).

## ADR-004 · Tür (Genre) eksen
- **Karar:** İstasyon, etkinlik, mekân ve sanatçı türlere bağlıdır; tüm köprüler (dinlediğin tür → bu gece) tür üzerinden kurulur.
- **Sonuç:** Tür listesi küçük ve küratörlü tutulur (≈10–15); dış kaynak etiketleri `TagGenreMap` ile bu türlere eşlenir.

## ADR-005 · "Şu an çalan" = ICY metadata
- **Bağlam:** Ses tanıma (ACRCloud vb.) ücretli ve izin/batarya maliyeti var.
- **Karar:** Kendi yayınlarımızda ICY `StreamTitle` okunur (sunucuda, 10 sn cache, SSRF korumalı). HLS yayınlarda metadata yok → `hasMetadata=false`.
- **Sonuç:** Ücretsiz ve anlık; eşleşme kalitesi sanatçı veritabanının kapsamına bağlı → admin "Eşleşmeyenler" kuyruğu.

## ADR-006 · Sabit UTC+3 ve "gece" günü
- **Karar:** İstanbul sabit UTC+3 (yaz saati yok). "Bu gece" sabah 06:00'ya kadar sürer. API (`common/time.ts`) ve mobil (`lib/format.ts`) aynı mantık; Intl/timeZone'a güvenilmez.

## ADR-007 · Para kuruş
- **Karar:** Tüm tutarlar Int kuruş. Float yasak.

## ADR-008 · Demo verisi işaretli
- **Karar:** Seed'in kurgusal etkinlikleri `source=DEMO`; uygulamada "DEMO" rozeti. Prod'a yalnız tür + istasyon seed'i gider.

## ADR-009 · NativeTabs + BottomAccessory mini oynatıcı
- **Karar:** iOS 26+'da mini oynatıcı sekme çubuğuna gömülü (Apple Music deseni); diğer platformlarda yüzen kart + `PLAYER_SPACE` boşluğu.

## ADR-010 · `Link asChild` yerine `PressLink`
- **Bağlam:** expo-router 58'de `Link asChild`, Pressable'ın fonksiyon stillerini uygulamıyor (kart düzenleri bozuldu).
- **Karar:** Kart bağlantıları `router.push` kullanan `PressLink` bileşeniyle.

## ADR-011 · Bilet satışı MVP'de yok
- **Bağlam:** Bilet satmak; ödeme altyapısı, ETBİS, e-fatura, iade süreçleri ve organizatör sözleşmesi demek.
- **Karar:** MVP'de bilet **yönlendirme** (sağlayıcı linki, mümkünse affiliate). Kendi satışımız faz 3+.
- **Sonuç:** Gelir MVP'de affiliate + sponsorlu öne çıkarma; kullanıcı güveni için "Sponsorlu" etiketi zorunlu.

## ADR-012 · Admin = Next.js + rol tabanlı JWT
- **Karar:** Prototipteki tek `X-Admin-Key` yerine kullanıcı hesabı + rol (EDITOR/MODERATOR/ADMIN/SUPERADMIN). Panel Next.js + shadcn (Luca ile aynı).

## ADR-013 · Zevk eşleşmesi: türetilmiş veri saklanır
- **Karar:** Bağlı müzik hesaplarından yalnız **türetilmiş profil** (sanatçı adı + ağırlık, tür ağırlıkları) saklanır; ham dinleme geçmişi saklanmaz.
  Tokenlar şifreli; bağlantı kaldırılınca o kaynaktan türeyen veri silinir. Ayrıntı: [08-zevk-eslesme.md](08-zevk-eslesme.md).

## ADR-014 · Sunucu: mevcut VPS
- **Bağlam:** VPS 5,8 GB RAM (4,4 GB boş), 34 GB disk, 2 çekirdek, Postgres 16, nginx, Node 22; üzerinde hazal ve ogulcanates projeleri var.
- **Karar:** `playce-api`, `playce-worker`, `playce-admin` pm2 süreçleri; ayrı Postgres veritabanı/kullanıcısı. Redis MVP'de gerekmiyor (ADR-020).
  Güncellemede `pm2 restart all` **kullanılmaz** (diğer projeleri de yeniden başlatır) → `pm2 restart playce-*`.

## ADR-015 · Alkol mevzuatı: tanıtım yok, 18+ kapısı
- **Bağlam:** 7584 sayılı Kanun (RG 20.06.2026) 4250/6'yı değiştirdi.
  - Alkolün her türlü reklamı ve tanıtımı yasak; tüketimi özendiren kampanya, promosyon ve etkinlik de yasak.
  - Alkol markaları hiçbir etkinliğe ve hiçbir mecradaki paylaşıma sponsor olamaz.
  - Kaynak: [Tarım ve Orman Bakanlığı duyurusu](https://www.tarimorman.gov.tr/TADAB/Duyuru/280/Alkollu-Icki-Reklamlarina-Iliskin-Mevzuatta-Yapilan-Degisiklik-Hakkinda-Duyuru).
- **Karar:**
  - Playce'ta alkol promosyonu ("happy hour", kokteyl kampanyası), alkol markası/logosu ve alkol sponsorlu gece yer almaz.
  - Mekân kartında "kokteyl bar" gibi tür bilgisi olabilir; fiyat/kampanya olamaz.
  - Görseller admin onayından geçer.
  - Gece hayatı içeriği 18+ kapısının arkasındadır.
- **Sonuç:** Sponsorlu öne çıkarma gelirinde alkol markaları müşteri olamaz. Hukuk görüşü alınana kadar katı yorum uygulanır.

## ADR-016 · Yerel tür taksonomisi
- **Bağlam:** Spotify 2025 Türkiye ilk 100'ünün 98'i yerli. Türkçe rap, arabesk, Anadolu rock, türkü bar ve fasıl global taksonomilerde kayboluyor.
- **Karar:** Bu türler Playce'ta birinci sınıf `Genre` olur. Dış etiketler (`TagGenreMap`) bunlara eşlenir. Prototipteki 10 tür ~14'e çıkar:
  - "Hip-Hop & R&B" ikiye ayrılır: Türkçe Rap + Hip-Hop/R&B.
  - Arabesk & Fantezi eklenir.
  - Anadolu Rock eklenir (Rock'tan ayrılır).
  - Fasıl & Türk Sanat eklenir.
- **Uygulama (Faz 1, 28 Eki 2026):** 14 tür, yerel olanlar listede önce. Anadolu Rock'un adı **"Anadolu & Türkçe Rock"**:
  yalnız 70'ler Anadolu rock'ını çalan HTTPS yayın bulunamadı; Joy Türk Rock ve Türk Rock FM Türkçe rock çalıyor
  (Duman, maNga, Athena), dinleyici de bu ayrımı "Türkçe Pop / Pop" gibi görüyor. "Rock" yabancı rock olarak kalır.
  Fasıl'ın tek istasyonu TRT Nağme (HLS, "şu an çalan" yok). `TagGenreMap` ilk sürümü ~90 etiket (`prisma/seed/base.ts`);
  Faz 3'te müzik hesabı etiketlerini çevirmek için kullanılacak.

## ADR-017 · Veri edinme sırası ve kazıma yasağı
- **Karar:** Etkinlik verisi şu sırayla edinilir:
  1. Admin girişi
  2. Organizatör ve mekân başvurusu (BUGECE modeli)
  3. Etkinlik.io API'si
  4. Bandsintown / Ticketmaster (test sonrası)
  5. Bilet platformlarıyla derin link + UTM ve gelir paylaşımı teklifi
- **Kazıma yok:** Bilet sitelerinin kullanım koşulları, bot korumaları ve haksız rekabet riski nedeniyle hukuk görüşü olmadan yapılmaz.

## ADR-018 · Reklamsız radyo
- **Bağlam:** Türk radyo uygulamalarının en büyük şikâyeti reklam. En memnun uygulama reklamsız olan (TRT Dinle 4,79).
- **Karar:** Playce kendi oynatıcısına reklam eklemez. İstasyonun kendi yayınındaki reklam olduğu gibi kalır. Radyo kullanıcıyı getiren kancadır; gelir mekân ve etkinlik tarafından gelir.

## ADR-019 · İstasyon izni
- **Bağlam:** radio-browser yayın adresi verir ama yayın hakkı vermez. Türk istasyonlarını uygulamada çalmak için istasyonun izni gerekir.
- **Karar:**
  - Lansmandan önce çalınan her Türk istasyonu için yazılı izin veya ortaklık alınır. Öncelik Karnaval (Süper, Metro, JoyTürk, Joy, Virgin), Power ve Doğuş (Kral).
  - İzni olmayan istasyon küratörlü listeden çıkar.
  - Ortaklık teklifi: istasyon trafiği + istasyon markalı "bu gece" seçkisi + dinleyici istatistikleri.

## ADR-020 · Bildirim gönderimi: DB outbox (MVP'de Redis/BullMQ yok)
- **Bağlam:** 03'te iş kuyruğu olarak BullMQ + Redis planlanmıştı. Faz 1'deki işlerin hepsi periyodik
  (push gönderimi, fan-out, hatırlatma, radyo yoklayıcısı, temizlik) ve tek worker yetiyor. VPS'te Redis yok.
- **Karar:**
  - `Notification` satırı aynı zamanda gönderim kuyruğu: `pushState` (PENDING/SENT/SKIPPED/FAILED) + `pushAfter`.
  - `playce-worker` süreci `@nestjs/schedule` ile 10 sn'de bir bekleyenleri Expo Push'a yollar; makbuzları 15 dk'da bir okur.
  - Fan-out `Event.fanoutAt` ile, hatırlatma `SavedEvent.remindedAt` ile işaretlenir; `dedupeKey` aynı bildirimin iki kez oluşmasını engeller.
  - Bildirim yalnız `NotificationsService.notify()` ile üretilir (tercih, sessiz saat, tekilleştirme orada).
- **Sonuç:** Redis kurmadan çalışır; API çökerken üretilen bildirim kaybolmaz. Worker **tek kopya** çalışmalı.
  Kampanya gibi büyük toplu gönderimler veya çok worker gerektiğinde BullMQ'ya geçilir.

## ADR-021 · NestJS 11'de kal (12 ESM-only)
- **Bağlam:** Bağımlılık açıklarını kapatırken (36 → 2) NestJS 12 de çıkmıştı (Ağustos 2026). 12 ESM-only;
  Prisma 5 istemcisi, ts-node seed ve Jest kurulumu CommonJS.
- **Karar:** NestJS 11.2 (güvenlik yamalı, CommonJS). `jose` 5'te kalır (6 ESM-only). Kalan 2 açık yalnız
  geliştirme araçlarında: `zod@3` (@expo/cli, 3.x için yama yok) ve `deepmerge` (yama yok).
- **Sonuç:** ESM geçişi (Nest 12 + Prisma 7) ayrı bir iş olarak planlanır.

## ADR-022 · Kimlik: varsayılan kapalı uçlar, dönen refresh token
- **Karar:**
  - Global `AuthGuard`: her uç giriş ister; açık uçlar `@Public()` ile işaretlenir. Public uçta bozuk/eski token hata
    vermez (gezinme bozulmasın). Rol ve oturum her istekte DB'den okunur: çıkış ve ban anında etkili.
  - Access token 15 dk (HS256 JWT). Refresh token rastgele, DB'de yalnız sha256'sı; her kullanımda döner.
    Bir önceki token 30 sn'den sonra tekrar gelirse çalınmış sayılır → kullanıcının tüm oturumları kapanır.
  - E-posta kodu sunucu sırrıyla HMAC'lenir; 60 sn'de 1, saatte 5 kod, 5 yanlış denemede iptal.
  - Apple/Google token'ları yayıncının JWKS'iyle doğrulanır. **Doğrulanmış** aynı e-posta → aynı hesaba bağlanır.
  - Hesap silme: anında kapanır; 30 gün içinde giriş yapılırsa geri gelir, sonra kişisel veri anonimleştirilir
    (takip/kaydet satırları kimliksiz kalır, toplam sayılar bozulmasın).
  - Admin uçları `@Roles('EDITOR')`; geçiş dönemi için `X-Admin-Key` hâlâ kabul edilir (Faz 2'de admin paneli
    OTP girişiyle kalkacak).

## ADR-023 · Arama: Postgres pg_trgm + tetikleyiciyle tutulan searchText
- **Bağlam:** Arama Türkçe karakter duyarsız olmalı ("dedubluman" → Dedublüman) ve küçük yazım hatalarını tolere etmeli.
  Veri küçük (yüzlerce mekân, binlerce sanatçı/etkinlik); ayrı arama servisi (Meilisearch vb.) VPS'e yük ve senkron derdi getirir.
- **Karar:**
  - `Artist`, `Venue`, `Event`, `Station` tablolarında `searchText` sütunu + GIN trigram indeksi (`pg_trgm`).
  - Sütunu **veritabanı tetikleyicisi** doldurur (`playce_search_text()`); uygulama hiç yazmaz. Böylece admin, seed,
    PlayLog'dan sanatçı açma ya da ham SQL — hiçbir yazma yolu unutamaz.
  - Normalize kuralı iki yerde aynı: `playce_norm()` (SQL, `unaccent`) ve `normalize()` (`src/common/text.ts`).
    Biri değişirse diğeri de değişir; e2e testi ikisini karşılaştırır.
  - Eşleşme: tam önek, kelime öneki ya da (4+ harfte) `word_similarity ≥ 0.4`. Eşik işlem içinde `set_config` ile verilir.
- **Sonuç:** Ek servis yok. `pg_trgm` ve `unaccent` PG13+'da "trusted" eklenti; DB sahibi kullanıcı migration'da kurabilir
  (VPS kurulumunda kontrol et). Ölçek büyürse (100 bin+ satır, çok dilli) ayrı arama servisi yeniden değerlendirilir.
