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
- Faz sırası → `06-yol-haritasi.md` · Kararlar → `07-kararlar.md` (yeni kararı ADR olarak ekle) · Sunucu → `09-yayin.md`
- Ses profili / eşleşme % / müzik hesabı bağlama → `08-zevk-eslesme.md`

## Stack
- `apps/api` NestJS 11 + Prisma 5 + Postgres (port 3030, tüm uçlar `/v1`, Swagger `/docs`)
  - İki giriş: `main.ts` (HTTP) ve `worker.ts` (zamanlanmış işler, `src/jobs/jobs.service.ts`)
  - Nest 12 ESM-only; geçiş ayrı iş (ADR-021). `jose` 5'te kalır (6 ESM-only).
- `apps/mobile` Expo SDK 58 + Expo Router (src/app), NativeTabs, expo-audio
- Node 22 (`.nvmrc`). Expo 58, Node 20'de uyarı verir.

## Değişmez kurallar
1. **Para = kuruş (Int).** Asla float.
2. **Genre ekseni:** istasyon, etkinlik, mekân, sanatçı türlere bağlı; yeni özellik bu bağı kullanmalı.
3. **İstanbul saati sabit UTC+3.** "Bu gece" sabah 06:00'ya kadar sürer (`apps/api/src/common/time.ts`,
   mobilde `src/lib/format.ts` aynı mantık). Intl/timeZone'a güvenme.
4. **Yalnız HTTPS yayın** (iOS ATS). HLS yayınlarda `hasMetadata=false`.
5. **Uçlar varsayılan olarak giriş ister** (global `AuthGuard`). Herkese açık uç → `@Public()`;
   admin uçları → `@Roles('EDITOR')` vb. (geçiş dönemi için `X-Admin-Key` de kabul edilir). Kullanıcı → `@CurrentUser()`.
6. **DEMO veri** `source=DEMO` taşır ve uygulamada rozetle gösterilir; gerçek veriyle karışmasın.
7. **Bildirim yalnız `NotificationsService.notify()` ile üretilir** — tercih, sessiz saat ve `dedupeKey` orada uygulanır.
   Push'u worker gönderir (DB outbox, ADR-020); API'den doğrudan Expo çağrılmaz.
8. **Env** `src/config/env.ts` (zod) ile doğrulanır; yeni değişkeni oraya ve `.env.example`'a ekle.
9. **`searchText` sütunlarına yazma** — DB tetikleyicisi doldurur (ADR-023). `normalize()` (`src/common/text.ts`)
   değişirse SQL'deki `playce_norm()` da yeni migration'la değişmeli.
10. **Admin yazma uçlarına `@Audit('<tür>.<fiil>')`** ekle (AuditLog). Liste uçları `{ items, nextCursor }` döner.

## Mobil notları
- Expo API'leri her SDK'da değişir: kod yazmadan önce `https://docs.expo.dev/versions/v58.0.0/` oku
  (ayrıntı: `apps/mobile/AGENTS.md`). Paket eklerken `npx expo install`.
- Tek oynatıcı `src/player/player-context.tsx`'te (createAudioPlayer). Canlı yayında "devam" yerine
  yeniden bağlan; kilit ekranı `setActiveForLockScreen(..., { isLiveStream: true })`.
- iOS 26+'da mini oynatıcı `NativeTabs.BottomAccessory`; diğerlerinde yüzen kart (`PLAYER_SPACE`).
- `Link asChild` Pressable'ın fonksiyon stillerini uygulamıyor → kart bağlantıları için `PressLink`.

## Komutlar
`pnpm dev:api` · `pnpm dev:worker` · `pnpm ios` · `pnpm db:create` · `pnpm db:migrate` · `pnpm db:seed` (temel + demo) · `pnpm db:seed:base` (yalnız tür/istasyon, prod) · `pnpm db:studio` · `pnpm typecheck` · `pnpm test:api`

e2e testleri `apps/api/test/` altında, ayrı `<db>_test` veritabanında koşar (her çalıştırmada sıfırlanır).
E-posta, Expo Push, radyo okuma ve Apple/Google anahtarları sahteyle değiştirilir (`test/utils.ts`).

Yeni migration (headless, `migrate dev` TTY ister):
`npx prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_name/migration.sql` → `pnpm db:migrate`.
Prisma tetikleyici ve SQL fonksiyonlarını görmez (diff'e girmez); onları migration'a elle eklenir.

## Yayın
Sunucu `ssh hazal`, kod `/var/www/playce`, pm2 `playce-api` + `playce-worker`. Güncelleme: `bash deploy/deploy.sh` (sunucuda).
**Asla `pm2 restart all`** — aynı sunucuda başka projeler çalışıyor. Sırlar yalnız sunucudaki `apps/api/.env`'de.
Ayrıntı ve alan adına geçiş: `docs/09-yayin.md`.

## Stil
Türkçe açıklama/arayüz, kod İngilizce. Mevcut desenlere uy (Nest modül + DTO/class-validator; mobilde `C/S/R` tema sabitleri).
