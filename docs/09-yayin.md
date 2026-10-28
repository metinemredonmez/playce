# 09 — Yayın (VPS)

> Durum (28 Eki 2026): API ve worker `hazal` sunucusunda çalışıyor. Alan adı gelene kadar geçici adres
> **`http://94.138.209.152:8888`** (HTTPS yok). Alan adı gelince: [§6](#6-alan-adı-gelince).

## 1. Sunucu

| | |
|---|---|
| Sunucu | `ssh hazal` → 94.138.209.152 (Ubuntu 24.04, 2 çekirdek, 5,8 GB RAM). Başka projeler de burada: hazal, ogulcanates, efendioglu… |
| Kod | `/var/www/playce` (GitHub `main`) |
| Süreçler | pm2 `playce-api` (yalnız `127.0.0.1:3030`) ve `playce-worker` (tek kopya, fork) — [`deploy/ecosystem.config.js`](../deploy/ecosystem.config.js) |
| Veritabanı | Postgres 16, rol + veritabanı `playce`; `pg_trgm` ve `unaccent` eklentileri kurulu |
| Sırlar | `/var/www/playce/apps/api/.env` (izin 600). Sunucuda üretildi, repoda ve başka yerde kopyası yok |
| nginx | `/etc/nginx/sites-available/playce` ← [`deploy/nginx/playce.conf`](../deploy/nginx/playce.conf) |
| Yedek | Her gece 03:30, `/var/backups/playce/playce-*.dump`, 14 gün saklanır. Log: `/var/log/playce-backup.log` |
| Loglar | `pm2 logs playce-api` · `pm2 logs playce-worker` (`/root/.pm2/logs/`) |

**Kurallar**
- **Asla `pm2 restart all` / `pm2 stop all`** — diğer projeler de yeniden başlar. Yalnız `playce-api` / `playce-worker`.
- nginx değişince `nginx -t && systemctl reload nginx` (restart değil).
- Neden 8888: `94.138.209.152:80` zaten efendioglu sitesinin `server_name`'i. 8888 güvenlik duvarında açıktı, kural eklenmedi.

## 2. Güncelleme

```bash
ssh hazal 'cd /var/www/playce && bash deploy/deploy.sh'
```

[`deploy/deploy.sh`](../deploy/deploy.sh) şunları yapar: `git pull`, yalnız API bağımlılıkları, build,
`prisma migrate deploy`, `pm2 restart playce-api playce-worker`, sağlık kontrolü.
Temel veri (tür/istasyon) değiştiyse ayrıca `cd apps/api && pnpm db:seed:base`.

## 3. Admin işleri (HTTPS gelene kadar)

Düz HTTP'de `X-Admin-Key` ağda açık gider. Bu yüzden IP adresinden `/v1/admin/*` kapalı (403).
Admin işleri SSH tüneliyle yapılır:

```bash
ssh -N -L 3031:127.0.0.1:3030 hazal
```

Tünel açıkken `http://localhost:3031/docs` (Swagger) adresini kullan. Anahtarı görmek için:
`ssh hazal "grep ^ADMIN_KEY= /var/www/playce/apps/api/.env"`.

## 4. E-posta ile giriş

`SMTP_URL` boş, bu yüzden `POST /v1/auth/otp/*` 503 döner ve kod hiçbir yere yazılmaz. Mobilde giriş ekranı
Faz 4'te geliyor. Sağlayıcı seçilince:
1. `.env`'e `SMTP_URL=smtp://kullanici:sifre@sunucu:587` ve gerekirse `MAIL_FROM` yazılır.
2. Ardından: `pm2 restart playce-api`.

## 5. Yedekten geri yükleme

```bash
ssh hazal
pm2 stop playce-api playce-worker
runuser -u postgres -- pg_restore --clean --if-exists -d playce < /var/backups/playce/playce-YYYYMMDD-HHMM.dump
pm2 start playce-api playce-worker
```

Yedekte arama fonksiyonları ve tetikleyicileri de var (`playce_norm`, `playce_search_text`).
Henüz sunucu dışına kopya alınmıyor (bkz. §7).

## 6. Alan adı gelince

1. DNS'te `api.<alan-adı>` için A kaydı → `94.138.209.152`. `dig +short api.<alan-adı>` bu IP'yi döndürmeli.
2. `deploy/nginx/playce.conf`'u aşağıdakiyle değiştir, commit et, sunucuda `git pull`. Sonra:
   `install -m 644 deploy/nginx/playce.conf /etc/nginx/sites-available/playce && nginx -t && systemctl reload nginx`
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name api.<alan-adı>;
       client_max_body_size 2m;
       location / {
           proxy_pass http://127.0.0.1:3030;
           proxy_http_version 1.1;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Sertifikayı al: `certbot --nginx -d api.<alan-adı> --redirect`. Yenilemeyi sunucudaki `certbot.timer` yapar.
4. HTTPS üzerinde admin uçları açıktır; 8888 bloğu bu dosyayla birlikte kalkar.
5. Mobil uygulamada `EXPO_PUBLIC_API_URL=https://api.<alan-adı>`. iOS, production'da düz HTTP'ye izin vermez.
6. `MAIL_FROM` için alan adının e-posta doğrulaması (SPF/DKIM), seçilen sağlayıcıya göre.

## 7. Açılmayı bekleyenler (kod hazır, anahtar/karar gerekiyor)

Hepsi `/var/www/playce/apps/api/.env`'e yazılır, ardından `pm2 restart playce-api playce-worker`.

| Ne | Değişken | Not |
|---|---|---|
| Etkinlik.io içe aktarma | `ETKINLIKIO_TOKEN` | Yayıncı ağı başvurusu. Önce deneme: `cd apps/api && pnpm ingest etkinlikio --dry-run`. Açılınca worker her gece 04:00'te çeker |
| Ticketmaster (Biletix verisi var mı?) | `TICKETMASTER_API_KEY` | developer.ticketmaster.com'dan ücretsiz anahtar; `pnpm ingest ticketmaster --dry-run` kaç İstanbul müzik etkinliği geldiğini sayar, hiçbir şey yazmaz |
| Hata takibi | `SENTRY_DSN` | **Önce KVKK:** yurt dışı aktarım standart sözleşmesi + 5 iş günü içinde bildirim (03 §8). SDK yalnız hata ve yığın izi gönderir (kullanıcı, başlık, gövde, sorgu kapalı — `src/instrument.ts`) |
| Sunucu dışı yedek | `/etc/default/playce-backup` → `BACKUP_REMOTE="kullanici@sunucu:/yol/"` | Hedefe root'un SSH anahtarıyla şifresiz erişim gerekir; sonraki gece yedeği oraya da `rsync` ile kopyalanır |

İçe aktarma turları: `GET /v1/admin/imports` (ADMIN). Elle tur: `POST /v1/admin/imports/<KAYNAK>/run?dryRun=1`.

## 8. İzleme

`GET http://94.138.209.152:8888/health/deep` → `{ ok, checks, problems }`. Sorun varsa **503**:
- `pushQueueLagSec` > 5 dk (push kuyruğu birikti).
- `lastPlayAgeSec` > 15 dk (worker ya da yoklayıcı durdu).
- `lastStationCheckAgeSec` > 2 saat (sağlık işi çalışmıyor).

Bir uptime servisine (UptimeRobot vb.) bu adres 5 dakikada bir verilir; 503'te e-posta gelir.

## 9. Eksikler

- **HTTPS yok** (alan adı bekleniyor). Mobil uygulama production build'de bu adrese bağlanamaz; şimdilik curl/Swagger ile test.
- **pm2 log döndürme yok** (`pm2-logrotate` sunucu genelinde kurulu değil). Worker dakikada bir satır yazar, günde ~150 KB.
- **Trafik:** yoklayıcı dakikada 30 yayına bağlanıp ilk ICY bloğunu okur (istasyon başına ~16–32 KB). Bu, günde yaklaşık 1 GB gelen trafik demek.

## 10. İlk kurulum (kayıt)

Bir kez çalıştırıldı (28 Eki 2026): `git clone … /var/www/playce && bash deploy/setup-server.sh`.
[`deploy/setup-server.sh`](../deploy/setup-server.sh) idempotent; tekrar çalıştırmak var olanı ezmez. Yaptıkları:
- Postgres rolü, veritabanı ve eklentiler.
- Sırlarla `.env` (DB şifresi, `JWT_SECRET`, 64 karakterlik `ADMIN_KEY`, `NODE_ENV=production`).
- Build, migration ve `seed:base`: 14 tür, 37 istasyon, demo veri yok.
- pm2 süreçleri ve `pm2 save`: açılışta `pm2-root` servisi geri getirir.
- nginx sitesi, `/usr/local/bin/playce-backup` ve `/etc/cron.d/playce-backup`.
