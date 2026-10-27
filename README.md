# Playce

**Müziği çal, mekânı bul.** Canlı radyo dinlerken çalan parçayı tanır, o sanatçının konserini ve
o türün bu gece şehirde nerede çaldığını gösterir.

```
playce/
├── apps/
│   ├── api/       NestJS + Prisma + Postgres (port 3030, Swagger: /docs)
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

## Nasıl çalışır

```
radyo yayını ──ICY──▶ "Sanatçı - Parça" ──▶ sanatçı eşleşmesi ──▶ yaklaşan konserleri
      │
      └── tür (Genre) ──▶ bu gece o türün etkinlikleri + o türü çalan mekânlar
```

`Genre` her şeyin eksenidir: istasyonlar, etkinlikler, mekânlar ve sanatçılar türlere bağlıdır.
Oynatıcının altındaki "Bu sesin canlısı" bölümü tek çağrıyla `GET /discover/now?url=&genre=` ile beslenir.

## İlk kurulum

```bash
nvm use                 # Node 22
pnpm install
cp apps/api/.env.example apps/api/.env   # DATABASE_URL / ADMIN_KEY'i kontrol et
pnpm db:create          # yerel Postgres'te playce_dev
pnpm db:migrate
pnpm db:seed            # demo tür/istasyon/mekân/sanatçı/etkinlik
```

## Günlük geliştirme

```bash
pnpm dev:api            # http://localhost:3030  (Swagger: /docs)
pnpm ios                # Expo → iOS simülatör (Expo Go)
```

Telefonda Expo Go ile açınca uygulama API'yi Metro'yu sunan bilgisayarın IP'sinden bulur
(`apps/mobile/src/lib/api.ts`). Başka bir adres için `EXPO_PUBLIC_API_URL` ver.

## İçerik ekleme (admin)

Panel yok; `/docs` (Swagger) üzerinden `X-Admin-Key` başlığıyla:

| Uç | Ne yapar |
|---|---|
| `POST/PATCH/DELETE /admin/events` | Etkinlik (`venueSlug`, `genreSlugs`, `artistSlugs` — ilk sanatçı headliner) |
| `POST/PATCH/DELETE /admin/venues` | Mekân (+ türleri, konum) |
| `POST/PATCH/DELETE /admin/artists` | Sanatçı (+ `aliases`: radyo başlığındaki farklı yazılışlar) |
| `POST/PATCH/DELETE /admin/stations` | Küratörlü istasyon (yalnız HTTPS) |

Para kuruş cinsindendir: 450 TL = `45000`.

## Demo verisi

`pnpm db:seed` gerçek İstanbul mekân adları ve sanatçılarla **kurgusal** etkinlikler üretir
(`source = DEMO`, uygulamada "DEMO" rozetiyle görünür). Tarihler seed'in çalıştığı güne göre
hesaplanır; her çalıştırma "bu gece" listesini tazeler. Yayına almadan önce demo etkinlikleri sil
ve gerçek verilerle değiştir.

## Bilinen sınırlar

- HLS (`.m3u8`) yayınlarda "şu an çalan" bilgisi yok (Power Türk, Kral Pop, Radyo Eksen, TRT Türkü).
- Sanatçı eşleşmesi yalnız veritabanındaki sanatçılarla çalışır; kapsam büyüdükçe artar.
- Favoriler cihazda tutulur (hesap sistemi yok).
- Uygulama ikonu hâlâ Expo'nun varsayılanı.
