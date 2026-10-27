# AGENTS.md — Playce

Her oturum başında oku.

## Proje nedir
Playce = radyo + mekân + etkinlik. Kullanıcı canlı radyo dinler; uygulama çalan parçanın sanatçısını
tanıyıp konserini, dinlenen türün bu gece şehirde nerede çaldığını ve o türü çalan mekânları gösterir.
Luca'dan (lucaevent) **bağımsız** bir projedir; kendi backend'i vardır.

## Önce oku
İş yapmadan önce ilgili dokümanı oku (`docs/`):
- Ne / kime / neden → `00-urun.md`, rakipler ve farkımız → `01-rakip-analizi.md`
- Öncelik (M/S/C/W) → `02-mvp-kapsam.md`
- Backend hedef şema + API → `03-backend.md` · Admin ekranları → `04-admin.md` · Mobil ekranlar → `05-mobil.md`
- Faz sırası → `06-yol-haritasi.md` · Kararlar → `07-kararlar.md` (yeni kararı ADR olarak ekle)
- Ses profili / eşleşme % / müzik hesabı bağlama → `08-zevk-eslesme.md`

## Stack
- `apps/api` NestJS 10 + Prisma 5 + Postgres (port 3030, Swagger `/docs`)
- `apps/mobile` Expo SDK 58 + Expo Router (src/app), NativeTabs, expo-audio
- Node 22 (`.nvmrc`). Expo 58, Node 20'de uyarı verir.

## Değişmez kurallar
1. **Para = kuruş (Int).** Asla float.
2. **Genre ekseni:** istasyon, etkinlik, mekân, sanatçı türlere bağlı; yeni özellik bu bağı kullanmalı.
3. **İstanbul saati sabit UTC+3.** "Bu gece" sabah 06:00'ya kadar sürer (`apps/api/src/common/time.ts`,
   mobilde `src/lib/format.ts` aynı mantık). Intl/timeZone'a güvenme.
4. **Yalnız HTTPS yayın** (iOS ATS). HLS yayınlarda `hasMetadata=false`.
5. **/admin/* uçları `AdminKeyGuard` ile korunur** (`X-Admin-Key`).
6. **DEMO veri** `source=DEMO` taşır ve uygulamada rozetle gösterilir; gerçek veriyle karışmasın.

## Mobil notları
- Expo API'leri her SDK'da değişir: kod yazmadan önce `https://docs.expo.dev/versions/v58.0.0/` oku
  (ayrıntı: `apps/mobile/AGENTS.md`). Paket eklerken `npx expo install`.
- Tek oynatıcı `src/player/player-context.tsx`'te (createAudioPlayer). Canlı yayında "devam" yerine
  yeniden bağlan; kilit ekranı `setActiveForLockScreen(..., { isLiveStream: true })`.
- iOS 26+'da mini oynatıcı `NativeTabs.BottomAccessory`; diğerlerinde yüzen kart (`PLAYER_SPACE`).
- `Link asChild` Pressable'ın fonksiyon stillerini uygulamıyor → kart bağlantıları için `PressLink`.

## Komutlar
`pnpm dev:api` · `pnpm ios` · `pnpm db:create` · `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:studio` · `pnpm typecheck`

Yeni migration (headless, `migrate dev` TTY ister):
`npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_name/migration.sql` → `pnpm db:migrate`.

## Stil
Türkçe açıklama/arayüz, kod İngilizce. Mevcut desenlere uy (Nest modül + DTO/class-validator; mobilde `C/S/R` tema sabitleri).
