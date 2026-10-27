# 00 — Ürün

## Tek cümle
**Playce, dinlediğin müziği şehirdeki karşılığına bağlar:** radyoda çalan sanatçının konserini, sevdiğin türün bu gece
nerede çaldığını ve müzik zevkine en uygun mekânları gösterir.

> *Müziği çal, mekânı bul.*

## Problem
- Müzik dinlemek ve dışarı çıkmak ayrı uygulamalarda: Spotify/radyo bir yerde, Biletix/Passo bir yerde, mekânlar Instagram ve Google Maps'te.
- "Bu gece nereye gitsem?" sorusunun cevabı dağınık; hikâyeleri tek tek gezmek gerekiyor.
- Sevdiğin sanatçının İstanbul konserini çoğu zaman bitince öğreniyorsun.
- Mekânların "nasıl bir müzik çaldığı" hiçbir yerde düzgün yazmıyor; gidip görmeden bilemiyorsun.

## Çözüm: üç adımlı döngü

```
   DİNLE                      EŞLEŞ                          GİT
canlı radyo /        →   çalan sanatçı ↔ konser      →   kaydet · bilet · yol tarifi
bağlı müzik hesabı       sevdiğin tür ↔ bu geceki        hatırlatma bildirimi
                         etkinlik ve mekânlar
                         ses profilin ↔ mekân (%92)
        ▲                                                       │
        └──────── gittikçe ve dinledikçe profil iyileşir ◄──────┘
```

## Kime
| Kişi | İhtiyacı | Playce'ta ne bulur |
|---|---|---|
| **Gece kuşu Deniz** (24–32, İstanbul) | Haftada 1–2 çıkıyor, Instagram'dan mekân arıyor | "Bu gece senin sesin" listesi, mekânın sesini önceden dinleme |
| **Konser takipçisi Mert** | Sevdiği sanatçıları kaçırmak istemiyor | Last.fm / Apple Music'ten sanatçılarını içe aktar → tek dokunuşla takip → konser duyurulunca bildirim |
| **Radyo dinleyicisi Ayşe** | İşte/arabada radyo açıyor | Kesintisiz radyo + çalan şarkının sanatçısı yakında sahnede mi |
| **Mekân sahibi / organizatör** (B2B) | Doğru kitleye ulaşmak | Ses profili eşleşen kullanıcılara görünürlük, öne çıkarma |

## Farkımız (tek cümleyle)
Etkinlik uygulamaları **ne olduğunu**, müzik uygulamaları **ne dinlediğini** bilir; Playce ikisini birleştirip
**mekânın sesini senin sesinle eşleştirir** — Türkiye'de bunu yapan yok. Ayrıntılı karşılaştırma: [01-rakip-analizi.md](01-rakip-analizi.md).

## MVP'nin sınırları
**İçinde:** İstanbul; canlı radyo; ICY ile sanatçı eşleşmesi; müzik hesabı bağlama / tür seçimi ile ses profili;
etkinlik ve mekân keşfi (liste + harita); eşleşme yüzdesi; takip, kaydet, hatırlatma bildirimleri; bilet **yönlendirme**;
admin paneli; organizatör başvuru formu.

**Dışında (sonraki fazlar):** kendi bilet satışı · mekân self-servis paneli · sosyal özellikler (arkadaşın gidiyor, grup planı) ·
mekânlardan canlı "şu an çalan" · ses tanıma (Shazam benzeri) · diğer şehirler · web uygulaması.
Kapsam ayrıntısı: [02-mvp-kapsam.md](02-mvp-kapsam.md).

## Gelir modeli (sırayla)
1. **Bilet affiliate** — bilet sağlayıcılarına yönlendirmede komisyon (ortaklık varsa).
2. **Sponsorlu öne çıkarma** — mekân/etkinlik vitrin slotları, "Sponsorlu" etiketiyle.
3. **Mekân aboneliği (faz 2)** — doğrulanmış profil, istatistik paneli, kampanya gönderimi, ses profili analizi.
4. **Kendi biletleme (faz 3+)** — küçük ve orta ölçekli etkinlikler için düşük komisyon.

## Başarı ölçütleri (lansman + 90 gün)
| Ölçüt | Hedef |
|---|---|
| Onboarding tamamlama | ≥ %70 |
| Ses profili oluşturan (hesap bağlayan veya ≥3 tür seçen) | ≥ %80 |
| Eşleşme oranı (metadata'lı parçalardan DB'de sanatçısı olan) | ≥ %50 |
| Köprü tıklama oranı (çalma oturumu başına etkinlik/mekân açma) | ≥ %15 |
| **Haftalık "dinle → git"** (kaydet veya bilet tıklaması yapan aktif kullanıcı) | ≥ %10 |
| D7 / D30 tutunma | ≥ %25 / ≥ %12 |
| İstanbul'da her gece yayında etkinlik | ≥ 40 |
| Mekân kapsamı | ≥ 150 mekân, hepsi ses profilli |

## Doküman haritası
| # | Doküman |
|---|---|
| 00 | Ürün (bu dosya) |
| 01 | [Rakip analizi — dünya ve Türkiye, özellikler, tasarım, farkımız](01-rakip-analizi.md) |
| 02 | [MVP kapsamı ve özellik önceliği](02-mvp-kapsam.md) |
| 03 | [Backend](03-backend.md) |
| 04 | [Admin paneli](04-admin.md) |
| 05 | [Mobil](05-mobil.md) |
| 06 | [Yol haritası](06-yol-haritasi.md) |
| 07 | [Kararlar (ADR)](07-kararlar.md) |
| 08 | [Zevk eşleşmesi — Spotify / YouTube / Apple Music bağlama](08-zevk-eslesme.md) |
