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
- **Karar:** `playce-api`, `playce-worker`, `playce-admin` pm2 süreçleri; ayrı Postgres veritabanı/kullanıcısı; Redis kurulacak.
  Güncellemede `pm2 restart all` **kullanılmaz** (diğer projeleri de yeniden başlatır) → `pm2 restart playce-*`.
