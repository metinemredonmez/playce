#!/usr/bin/env bash
# Sunucuda güncelleme (root, /var/www/playce): kodu çek, API'yi derle, migration'ları uygula,
# yalnız Playce süreçlerini yeniden başlat. ASLA `pm2 restart all` (sunucuda başka projeler var).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

git pull --ff-only
pnpm install --frozen-lockfile --filter @playce/api...
pnpm --filter @playce/api build
(cd apps/api && npx prisma migrate deploy)
pm2 restart playce-api playce-worker --update-env
pm2 save

# Açılış birkaç saniye sürer (Prisma, Sentry); 30 sn'ye kadar dene
curl -fsS --retry 15 --retry-connrefused --retry-delay 2 http://127.0.0.1:3030/health && echo " ← API ayakta"
