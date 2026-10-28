#!/usr/bin/env bash
# Playce veritabanı gece yedeği → /var/backups/playce, 14 gün saklanır.
# Kurulum: /usr/local/bin/playce-backup + /etc/cron.d/playce-backup (03:30). Geri yükleme: docs/09-yayin.md.
# Sunucu dışı kopya (isteğe bağlı): /etc/default/playce-backup içinde BACKUP_REMOTE="kullanici@sunucu:/yol/"
# → yedek rsync ile oraya da kopyalanır (SSH anahtarı önceden kurulmuş olmalı).
set -euo pipefail
DIR=/var/backups/playce
KEEP_DAYS=14

install -d -m 700 "$DIR"
FILE="$DIR/playce-$(date +%Y%m%d-%H%M).dump"
runuser -u postgres -- pg_dump --format=custom playce > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"
find "$DIR" -name 'playce-*.dump' -mtime +"$KEEP_DAYS" -delete
echo "yedek: $FILE ($(du -h "$FILE" | cut -f1))"

BACKUP_REMOTE=""
[ -f /etc/default/playce-backup ] && . /etc/default/playce-backup
if [ -n "$BACKUP_REMOTE" ]; then
  rsync -a --timeout=120 -e "ssh -o BatchMode=yes" "$FILE" "$BACKUP_REMOTE"
  echo "sunucu dışı kopya: $BACKUP_REMOTE"
fi
