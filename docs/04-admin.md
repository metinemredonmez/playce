# 04 — Admin paneli MVP

> Amaç: Playce ekibinin (ve sonra mekân/organizatörlerin) içeriği **hızlı ve hatasız** girmesi.
> Uygulamanın değeri verinin kapsamına bağlı: radyoda çalan sanatçıların ne kadarı DB'de,
> bu gecenin ne kadar etkinliği girilmiş. Panel bu iki sayıyı büyütmek için tasarlanır.

> Durum (28 Eki 2026): iskelet, e-posta kodu ile giriş, rol bazlı menü, **Moderasyon** ve **Eşleşmeyenler** ekranları hazır.
> Diğer menü öğeleri "yakında" olarak görünür. Yayın alan adı + SMTP'yi bekliyor ([09](09-yayin.md)).

## 1. Teknoloji

- `apps/admin` — **Next.js 16 (App Router) + Tailwind 4 + shadcn/ui (Radix)** — port 3031.
  TanStack Table + React Hook Form + Zod büyük liste/form ekranlarıyla (etkinlik, mekân) eklenecek; ilk iki kuyruk ekranında gerekmedi.
- Next 16'da `middleware` → `proxy.ts`. Kod yazmadan önce sürümün kendi dokümanı: `node_modules/next/dist/docs/`.
- **Oturum (ADR-025):** token'lar tarayıcıya gitmez — Next sunucusu API'yi kullanıcı adına çağırır, access/refresh token
  httpOnly çerezde. `src/proxy.ts` süresi dolmak üzere olan access token'ı refresh ile sessizce yeniler.
- Veri: API'nin `/v1/admin/*` uçları; sunucu tarafında `fetch` + kısa cache, istemcide TanStack Query.
- Giriş: e-posta OTP (API'deki `auth` modülü) → yalnız `role ∈ {EDITOR, MODERATOR, ADMIN, SUPERADMIN}` girebilir.
- Yayın: `admin.<alan-adı>` (nginx → Next, port 3031), pm2 adı `playce-admin`.
- Görsel yükleme: presigned URL ile doğrudan object store'a (R2/S3); API'den geçmez.

## 2. Roller

| Rol | Yapabilir | Yapamaz |
|---|---|---|
| **EDITOR** | Etkinlik/mekân/sanatçı/istasyon oluştur, düzenle, yayınla; eşleşmeyenler kuyruğu; öne çıkanlar | Kullanıcı, kampanya, tür, rol |
| **MODERATOR** | Başvuruları onayla/reddet, düzeltme taleplerini işle; içerik görüntüle | Yayından kaldırma dışında silme |
| **ADMIN** | Hepsi + türler, kampanya gönderimi, kullanıcı yasakla/sil, içe aktarma, denetim kaydı | Rol atama |
| **SUPERADMIN** | Hepsi + rol atama | — |

Her yazma işlemi `AuditLog`'a düşer; kim, ne zaman, neyi değiştirdi (diff) panelde görünür.

## 3. Bilgi mimarisi (sol menü)

```
Panel
├── Gösterge paneli
├── İçerik
│   ├── Etkinlikler
│   ├── Mekânlar
│   ├── Sanatçılar
│   │   └── Eşleşmeyenler  ← radyodan gelen kuyruk (rozet: açık sayı)
│   ├── İstasyonlar        ← sağlık durumu rozeti
│   └── Türler
├── Vitrin
│   └── Öne çıkanlar (ana sayfa, bu gece, hafta sonu)
├── Topluluk
│   ├── Başvurular         ← rozet: bekleyen sayı
│   └── Kullanıcılar
├── Bildirimler
│   └── Kampanyalar
└── Sistem
    ├── İçe aktarma
    ├── Denetim kaydı
    └── Ekip & roller
```

## 4. Ekranlar

### 4.1 Gösterge paneli
- **Üst KPI kartları (bugün / 7 gün):** aktif kullanıcı, çalma oturumu, **eşleşme oranı**, **köprü tıklama oranı**,
  bilet çıkış tıklaması, yeni takip, yeni kayıt.
- **"Bu gece" şeridi:** bu gece yayında kaç etkinlik var (tür bazında çubuk). 0 olan türler kırmızı → içerik açığı.
- **İş kuyrukları:** eşleşmeyen sanatçı (açık), bekleyen başvuru, kırık istasyon, kapağı olmayan etkinlik,
  konumu olmayan mekân — her biri tıklanınca filtreli listeye gider.
- **En çok çalanlar (24 saat):** sanatçı · çalma sayısı · DB'de mi · yaklaşan etkinliği var mı.
- **Grafikler:** günlük çalma oturumu, eşleşme oranı trendi, köprü tıklaması (son 30 gün).

### 4.2 Etkinlikler
**Liste:** tablo — kapak küçük resmi, başlık, mekân, tarih (İstanbul saati), türler, durum rozeti
(Taslak / İncelemede / Yayında / İptal / Arşiv), kaynak (Admin / Başvuru / İçe aktarma / Demo), kaydetme sayısı.
- Filtreler: durum, tarih aralığı (bugün / bu hafta / geçmiş), tür, mekân, kaynak, "kapağı yok", "bilet linki yok".
- Toplu işlemler: yayınla, yayından kaldır, arşivle, tür ata.
- Hızlı eylem: kopyala (aynı etkinliği gelecek hafta için çoğalt), önizleme (mobil görünüm).

**Form (tek sayfa, bölümlü):**
1. *Temel:* başlık, slug (otomatik, düzenlenebilir), açıklama (markdown), kapak (sürükle-bırak, 16:9 kırpma).
2. *Zaman:* başlangıç, kapı açılış, bitiş — **İstanbul saatiyle** girilir, UTC saklanır; "yinelenen" (her Cuma) → seri.
3. *Yer:* mekân seçici (arama + "yeni mekân" kısayolu); mekân yoksa form içinden hızlı ekle.
4. *Müzik:* türler (çoklu, renkli çip), **lineup** — sanatçı seçici (arama + yeni ekle), sürükle-bırak sıra, ilk sıra headliner.
5. *Bilet:* ücretsiz mi, başlangıç fiyatı (TL girilir, kuruş saklanır), bilet sağlayıcı, bilet linki (affiliate parametresi otomatik eklenir), yaş sınırı.
6. *Yayın:* durum, yayın zamanı (zamanlanmış yayın), "takipçilere bildir" (varsayılan açık).
- **Doğrulama:** bitiş > başlangıç; geçmiş tarihli etkinlik yayınlanamaz; aynı mekân + ±2 saat + benzer başlık → "olası kopya" uyarısı.
- **Alkol mevzuatı denetimi (ADR-015):** başlık/açıklamada promosyon ve marka kelimeleri ("happy hour", "1 alana 1", marka adları) →
  kırmızı uyarı, yayın engellenir; kapak görseli "alkol markası/ürünü yok" onay kutusuyla yayınlanır. Gece içeriğinde yaş sınırı 18 varsayılan.
- **Güven alanları (M17):** satıcı, hizmet bedeli notu, iade koşulu (şablonlardan seçilebilir), kapı/kıyafet kuralı.
- **Sağ panel önizleme:** mobil etkinlik kartı ve detay sayfası canlı önizleme.

### 4.3 Mekânlar
**Liste:** ad, semt, türler, fiyat seviyesi, bu gece açık mı, yaklaşan etkinlik sayısı, takipçi, "konum yok"/"saat yok" uyarıları.
**Form:**
- *Google Places'ten doldur:* ad yaz → sonuçlardan seç → adres, konum, telefon, web, saatler gelir (düzenlenebilir).
- Ad, slug, semt (sabit liste), adres, **harita pini** (sürüklenebilir), açıklama, kapak + galeri (sıralanabilir).
- **Ses profili:** türler (ağırlıklı — ana tür / yan tür), "mekânın sesi" istasyonu (varsayılan: ana türün ilk istasyonu; elle seçilebilir),
  mekânın Spotify/Apple çalma listesi linki (bkz. [08-zevk-eslesme.md](08-zevk-eslesme.md)).
- Çalışma saatleri (gün gün; "gece yarısını geçer" desteği), fiyat seviyesi (₺–₺₺₺₺), kapasite, yaş sınırı, dress code notu.
- İletişim: telefon, Instagram, web, rezervasyon linki.
- Sahiplik: "doğrulanmış mekân" işareti, bağlı organizatör hesabı (faz 2).

### 4.4 Sanatçılar
**Liste:** ad, türler, alias sayısı, son 7 gün radyoda çalma, yaklaşan etkinlik, takipçi.
**Form:** ad, slug, **alias'lar** (radyo başlığındaki farklı yazılışlar: "MVÖ", "maNga"), türler, ülke, Türk sanatçı mı,
görsel (+ hak sahibi/kaynak notu), kısa bio, Instagram/Spotify linki.
- **MusicBrainz'den bul:** isimle ara → MBID, ülke, alias'lar otomatik.
- **Birleştir:** iki kayıt aynı kişiyse → biri diğerine birleşir (alias + etkinlik + takipçiler taşınır), eski slug yönlenir.
- **Radyo geçmişi sekmesi:** hangi istasyonda ne zaman çaldı (PlayLog).

### 4.5 Eşleşmeyenler (kritik ekran)
Radyoda çalıp DB'de karşılığı olmayan sanatçılar, **çalma sayısına göre** sıralı.

| Görünen ad | Çalma (7 gün) | İstasyonlar | Örnek başlık | Eylem |
|---|---|---|---|---|
| Oğuzhan Koç | 46 | Süper FM, Joy Türk | Oğuzhan Koç - Küsme Aşka | **[Sanatçı oluştur]** · [Mevcut sanatçıya bağla] · [Yoksay] |

- *Sanatçı oluştur:* ad + türler (istasyon türlerinden önerilir) önceden dolu modal; kaydedince kuyruktan düşer, alias olarak eklenir.
- *Bağla:* "MVÖ" → "Mor ve Ötesi" gibi; alias eklenir.
- *Yoksay:* reklam/jingle/istasyon adı ("100 BEST IBIZA") → bir daha görünmez.
- Hedef: **haftada bir 30 dakika** bu ekranla eşleşme oranını %20'lerden %60+'ya çıkarmak.

### 4.6 İstasyonlar
**Liste:** ad, tür, ülke, durum (Çalışıyor / Kapalı / Metadata yok), **izin durumu** (Yazılı izin / Ortaklık / Bekliyor — bekleyen Türk istasyonu yayına alınamaz, ADR-019),
metadata kaynağı (ICY / Triton / ses tanıma), son kontrol, son 24 saat dinlenme, sıra (sürükle-bırak).
- **Test et:** panelde çal + "şu an çalan"ı oku (API `stations/:id/test`).
- **radio-browser'dan ekle:** ara → seç → tür ata → küratörlü listeye al.
- Kapalı istasyonlar en üstte kırmızı; "3 kez başarısız → uygulamada gizlendi" bilgisi.

### 4.7 Türler
Ad, slug, renk (önizlemeli), radio-browser etiketi, sıra, simge. Silme yok (bağlı içerik çok); "gizle" var.

### 4.8 Öne çıkanlar
- Yerleşimler: **Ana sayfa vitrin**, **Bu gece seçkisi**, **Hafta sonu seçkisi**, **Tür başı**.
- Her slot: içerik seçici (etkinlik/mekân/sanatçı/istasyon), başlık (opsiyonel), başlangıç–bitiş, sıra, **"Sponsorlu"** anahtarı
  (açıksa uygulamada etiket zorunlu — reklam mevzuatı ve güven için).
- Takvim görünümü: hangi gün hangi slotta ne var.

### 4.9 Başvurular
- Organizatör/mekân formundan gelenler: tür (etkinlik, mekân, sanatçı sahiplenme, mekân sahiplenme, düzeltme), gönderen, tarih.
- Detay: gönderilen alanlar ↔ önerilen kayıt yan yana; "onayla" → ilgili kayıt **taslak** olarak oluşur ve düzenleme formu açılır.
- Red nedeni şablonları; gönderene otomatik e-posta.

### 4.10 Kullanıcılar
- Arama (e-posta/ad), kayıt tarihi, son görülme, zevk türleri, takip sayıları, giriş yöntemi.
- Detay: onay geçmişi (KVKK), cihazlar/push token'ları, bildirim geçmişi.
- Eylemler: yasakla/kaldır, **KVKK silme** (onay modalı, geri alınamaz uyarısı), veri dışa aktarma.
- Kişisel veriye erişim de denetim kaydına yazılır.

### 4.11 Kampanyalar (push)
- Oluştur: başlık (≤ 40 karakter), metin (≤ 120), hedef (deeplink: etkinlik/mekân/sanatçı/istasyon seçici).
- **Segment:** herkes · türe göre (zevk) · sanatçı takipçileri · mekân takipçileri · semt · son X günde aktif.
  Segment boyutu canlı hesaplanır ("~1.240 cihaz").
- Test gönderimi (kendi cihazına), zamanlama, gönderim sonrası istatistik (hedeflenen / iletilen / hata / açılma).
- Kural: pazarlama içerikli kampanya yalnız **açık rıza veren** kullanıcılara gider; sessiz saatlerde gönderilemez.

### 4.12 İçe aktarma, denetim, ekip
- İçe aktarma: kaynak başına son çalışmalar (oluşturulan/güncellenen/atlanan/hata), elle çalıştır, hata ayrıntısı.
- Denetim kaydı: kişi/varlık/eylem filtresi, diff görünümü.
- Ekip: davet (e-posta), rol değiştir (yalnız SUPERADMIN), erişimi kaldır.

## 5. Tasarım ilkeleri

- Mobilin koyu temasıyla aynı aile (Playce pembe/turkuaz vurgu), ama **açık tema varsayılan** — uzun veri girişi için okunaklı.
- Her listede: arama, filtre çipleri, kaydedilebilir görünüm, CSV dışa aktarma.
- Form kısayolları: `⌘S` kaydet, `⌘↵` kaydet ve yayınla.
- Tarih/saat her yerde İstanbul saatiyle gösterilir ve girilir; tooltip'te UTC.
- Boş durumlar iş yaptırır: "Bu gece Techno etkinliği yok → [Etkinlik ekle]".

## 6. Faz 2 (MVP sonrası)

- **Mekân/organizatör self-servis paneli:** kendi mekânı ve etkinliklerini yönetir, istatistik görür (görüntülenme, kaydetme, bilet tıklaması).
- Ücretli öne çıkarma satın alma (iyzico) ve fatura.
- Etkinlik içe aktarma sihirbazı (CSV / Instagram gönderisinden AI ile taslak — Luca'daki WhatsApp→taslak deneyimi gibi).
- Çok dilli içerik (EN).

## 7. Kabul kriterleri

1. EDITOR bir etkinliği 2 dakikadan kısa sürede (mekân ve sanatçılar varsa) eksiksiz girip yayınlayabiliyor.
2. Eşleşmeyenler ekranından tek tıkla sanatçı oluşturulunca, aynı başlık bir sonraki poller turunda eşleşiyor.
3. Kırık istasyon panelde görünüyor ve test edilebiliyor.
4. Kampanya test gönderimi kendi cihaza ulaşıyor; segment sayısı doğru.
5. Rol kısıtları API seviyesinde de uygulanıyor (yalnız arayüzde gizlemek yetmez).
6. Tüm yazma işlemleri denetim kaydında görünüyor.
