# Playce

**Müziği çal, mekânı bul.** Canlı radyo dinlerken çalan parçayı tanır, o sanatçının konserini ve
o türün bu gece şehirde nerede çaldığını gösterir.

```
playce/
├── apps/
│   ├── api/       NestJS + Prisma + Postgres — API (port 3030, /v1, Swagger: /docs) + worker
│   └── mobile/    Expo SDK 58 + Expo Router (iOS / Android)
├── package.json   pnpm workspace kök scriptleri
└── .nvmrc         Node 22 (Expo 58 ≥ 22.13 ister)
```

## Dokümanlar

Ürün, rakip analizi ve MVP planı [`docs/`](docs/) altında — başlangıç: [00-urun.md](docs/00-urun.md).

| | |
|---|---|
| [00 Ürün](docs/00-urun.md) · [01 Rakip analizi](docs/01-rakip-analizi.md) · [02 MVP kapsamı](docs/02-mvp-kapsam.md) | ne, neden, kime |
| [03 Backend](docs/03-backend.md) · [04 Admin](docs/04-admin.md) · [05 Mobil](docs/05-mobil.md) | nasıl |
| [06 Yol haritası](docs/06-yol-haritasi.md) · [07 Kararlar](docs/07-kararlar.md) · [08 Zevk eşleşmesi](docs/08-zevk-eslesme.md) | ne zaman, neden böyle |
| [09 Yayın](docs/09-yayin.md) | sunucu, güncelleme, yedek |

## Nasıl çalışır

```
radyo yayını ──ICY──▶ "Sanatçı - Parça" ──▶ sanatçı eşleşmesi ──▶ yaklaşan konserleri
      │
      └── tür (Genre) ──▶ bu gece o türün etkinlikleri + o türü çalan mekânlar
```

`Genre` her şeyin eksenidir: istasyonlar, etkinlikler, mekânlar ve sanatçılar türlere bağlıdır.
14 tür var; yerel türler (Türkçe Rap, Arabesk & Fantezi, Anadolu & Türkçe Rock, Türkü, Fasıl) birinci sınıftır (ADR-016).
Oynatıcının altındaki "Bu sesin canlısı" bölümü tek çağrıyla `GET /v1/discover/now?url=&genre=` ile beslenir.

İki süreç aynı kodu çalıştırır: **API** (HTTP) ve **worker** (push gönderimi, takipçilere "yeni etkinlik",
kaydedilen etkinlik hatırlatması, dakikada bir radyo yoklayıcısı → `PlayLog`, saatlik istasyon sağlığı, gece temizliği).
3 kontrol üst üste yanıt vermeyen istasyon (`DOWN`) uygulamada gizlenir, düzelince kendiliğinden geri gelir.

## İlk kurulum

```bash
nvm use                 # Node 22
pnpm install
cp apps/api/.env.example apps/api/.env   # DATABASE_URL, ADMIN_KEY, JWT_SECRET (openssl rand -base64 48)
pnpm db:create          # yerel Postgres'te playce_dev
pnpm db:migrate
pnpm db:seed            # temel veri (tür, istasyon) + demo mekân/sanatçı/etkinlik
```

## Günlük geliştirme

```bash
pnpm dev:api            # http://localhost:3030/v1  (Swagger: /docs)
pnpm dev:worker         # arka plan işleri (bildirim, radyo yoklayıcısı)
pnpm ios                # Expo → iOS simülatör (Expo Go)
pnpm test:api           # API e2e testleri (ayrı playce_dev_test veritabanında)
```

`.env` eksik ya da hatalıysa API açılmaz ve hangi değişkenin sorunlu olduğunu yazar (`src/config/env.ts`).
`SMTP_URL` boşken giriş kodları e-posta yerine API konsoluna yazılır (yalnız geliştirme).

Telefonda Expo Go ile açınca uygulama API'yi Metro'yu sunan bilgisayarın IP'sinden bulur
(`apps/mobile/src/lib/api.ts`). Başka bir adres için `EXPO_PUBLIC_API_URL` ver.

## Hesap ve kimlik

- Giriş: e-posta kodu (`POST /v1/auth/otp/request` → `/verify`), Apple (`/v1/auth/apple`), Google (`/v1/auth/google`).
- Access token 15 dk; refresh token her yenilemede döner (`/v1/auth/refresh`). Eski refresh token sonradan
  tekrar gelirse kullanıcının tüm oturumları kapanır.
- Uçlar **varsayılan olarak giriş ister**; herkese açık olanlar `@Public()` ile işaretlidir.
- Arama: `GET /v1/search?q=` Türkçe karakter ve küçük yazım hatası duyarsız ("dedubluman", "tarkn").
- Liste uçları sayfalı: `{ items, nextCursor }` → sonraki sayfa `?cursor=<nextCursor>`.
- Kullanıcı uçları `/v1/me/*`: profil, KVKK (onaylar, veri indir, hesap sil), takip, kaydet, favori istasyon,
  bildirim kutusu ve tercihleri. Ayrıntı: [03-backend.md §4.3](docs/03-backend.md).

## İçerik ekleme (admin)

Panel yok; `/docs` (Swagger) üzerinden. Yetki: **EDITOR+ rolünde kullanıcı** (Bearer token) ya da geçiş dönemi
için `X-Admin-Key`. Rol vermek için şimdilik: `UPDATE "User" SET role='ADMIN' WHERE email='…';`

| Uç | Ne yapar |
|---|---|
| `POST/PATCH/DELETE /v1/admin/events` | Etkinlik (`venueSlug`, `genreSlugs`, `artistSlugs` — ilk sanatçı headliner). Yayınlanınca worker takipçilere bildirir |
| `POST/PATCH/DELETE /v1/admin/venues` | Mekân (+ türleri, konum) |
| `POST/PATCH/DELETE /v1/admin/artists` | Sanatçı (+ `aliases`: radyo başlığındaki farklı yazılışlar) |
| `POST/PATCH/DELETE /v1/admin/stations` | Küratörlü istasyon (yalnız HTTPS) |
| `GET /v1/admin/unmatched` · `POST …/:key/{link,create,ignore}` | Radyoda çalıp veritabanında olmayan sanatçılar (en çok çalan üstte) |
| `GET /v1/admin/stations/health` · `POST …/stations/:slug/test` | İstasyon sağlığı; "test et" yayına hemen bağlanıp çalan parçayı da gösterir |
| `GET /v1/admin/audit` | Denetim kaydı: her admin yazması kim/ne/hangi kayıt/gönderilen alanlarla (ADMIN rolü) |

Para kuruş cinsindendir: 450 TL = `45000`. `priceFrom: 0` girilirse etkinlik ücretsiz sayılır; bilet satıcısı
(`ticketProvider`) verilmezse Biletix/Passo/Bubilet/Biletinial/Mobilet linkinden çıkarılır. `status: "REVIEW"` uygulamada görünmez.

## Demo verisi

İki seed var (`apps/api/prisma/seed/`):

- `pnpm db:seed:base` — türler, tür etiket eşlemesi (`TagGenreMap`) ve küratörlü istasyonlar. **Üretimde de çalışır**;
  admin tür/istasyon ekranı gelene kadar (Faz 2) bu listeler koddan yönetilir.
- `pnpm db:seed` — temel veri + gerçek İstanbul mekân adları ve sanatçılarla **kurgusal** etkinlikler
  (`source = DEMO`, uygulamada "DEMO" rozetiyle görünür). Tarihler seed'in çalıştığı güne göre hesaplanır;
  her çalıştırma "bu gece" listesini tazeler. `NODE_ENV=production` iken çalışmaz.

## Yayın

API ve worker `hazal` VPS'inde, pm2 altında (`playce-api`, `playce-worker`). Alan adı gelene kadar geçici adres
`http://94.138.209.152:8888` (HTTPS yok; admin uçları yalnız SSH tüneliyle). Güncelleme:

```bash
ssh hazal 'cd /var/www/playce && bash deploy/deploy.sh'
```

Sunucuda başka projeler de var: **asla `pm2 restart all`**. Ayrıntı: [docs/09-yayin.md](docs/09-yayin.md).

## Bilinen sınırlar

- HLS (`.m3u8`) yayınlarda "şu an çalan" bilgisi yok (Power Türk, Kral Pop, Radyo Eksen, TRT Türkü).
- Sanatçı eşleşmesi yalnız veritabanındaki sanatçılarla çalışır; kapsam büyüdükçe artar.
- Mobil uygulamada giriş ekranı henüz yok (Faz 4); favoriler cihazda. Hesaba taşıma ucu hazır: `POST /v1/me/merge-device`.
- Uygulama ikonu hâlâ Expo'nun varsayılanı.
