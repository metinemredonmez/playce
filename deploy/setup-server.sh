#!/usr/bin/env bash
# İlk kurulum (bir kez, root, /var/www/playce içinden): Postgres rolü + veritabanı + eklentiler,
# .env (sırlar sunucuda üretilir, hiçbir yere yazdırılmaz), build, migration, temel seed,
# pm2 süreçleri, nginx sitesi ve gece yedeği. Tekrar çalıştırmak güvenli: var olanı ezmez.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
API="$ROOT/apps/api"
ENV_FILE="$API/.env"
psql_su() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -At "$@"; }

echo "== Veritabanı"
DB_PASSWORD=""
if [ "$(psql_su -c "SELECT 1 FROM pg_roles WHERE rolname = 'playce'")" != "1" ]; then
  DB_PASSWORD=$(openssl rand -hex 24)
  psql_su -c "CREATE ROLE playce LOGIN PASSWORD '$DB_PASSWORD'"
  psql_su -c "CREATE DATABASE playce OWNER playce"
fi
# Arama eklentileri (ADR-023); süper kullanıcıyla kurulur, migration'daki IF NOT EXISTS boşa düşer.
psql_su -d playce -c "CREATE EXTENSION IF NOT EXISTS pg_trgm" -c "CREATE EXTENSION IF NOT EXISTS unaccent"

echo "== .env"
if [ ! -f "$ENV_FILE" ]; then
  if [ -z "$DB_PASSWORD" ]; then
    echo "playce rolü zaten var ama .env yok — şifreyi bilemem; .env'i elle oluştur." >&2
    exit 1
  fi
  (
    umask 077
    cat > "$ENV_FILE" <<ENV
NODE_ENV=production
PORT=3030
DATABASE_URL=postgresql://playce:${DB_PASSWORD}@127.0.0.1:5432/playce
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
ADMIN_KEY=$(openssl rand -hex 32)
# Boş: e-posta ile giriş kapalı (503). Sağlayıcı seçilince doldur → pm2 restart playce-api --update-env
SMTP_URL=
MAIL_FROM=Playce <no-reply@playce.app>
APPLE_AUDIENCES=app.playce.mobile
GOOGLE_CLIENT_IDS=
EXPO_ACCESS_TOKEN=
# Etkinlik içe aktarma (gece 04:00) ve hata takibi — boşsa kapalı
ETKINLIKIO_TOKEN=
TICKETMASTER_API_KEY=
SENTRY_DSN=
ENV
  )
fi
chmod 600 "$ENV_FILE"

echo "== Derleme, migration, temel veri"
cd "$ROOT"
pnpm install --frozen-lockfile --filter @playce/api...
pnpm --filter @playce/api build
(cd "$API" && npx prisma migrate deploy && pnpm db:seed:base)

echo "== pm2"
pm2 describe playce-api >/dev/null 2>&1 || pm2 start "$ROOT/deploy/ecosystem.config.js"
pm2 save

echo "== nginx"
install -m 644 "$ROOT/deploy/nginx/playce.conf" /etc/nginx/sites-available/playce
[ -e /etc/nginx/sites-enabled/playce ] || ln -s /etc/nginx/sites-available/playce /etc/nginx/sites-enabled/playce
nginx -t
systemctl reload nginx

echo "== Gece yedeği (03:30)"
install -m 755 "$ROOT/deploy/backup.sh" /usr/local/bin/playce-backup
echo '30 3 * * * root /usr/local/bin/playce-backup >> /var/log/playce-backup.log 2>&1' > /etc/cron.d/playce-backup
chmod 644 /etc/cron.d/playce-backup

echo "Kurulum tamam."
