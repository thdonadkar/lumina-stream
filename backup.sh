#!/usr/bin/env bash
# backup.sh — nightly Postgres + Supabase Storage dump.
# Requires: pg_dump (postgresql-client), and (optionally) awscli/rclone for off-box upload.
# Cron example (as root):  0 2 * * * /opt/atomspot/backup.sh >> /var/log/atomspot/backup.log 2>&1
set -Eeuo pipefail

# Load env (expects SUPABASE_DB_URL)
ENV_FILE="${ENV_FILE:-/opt/atomspot/.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
fi

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/atomspot}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TS="$(date -u +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/atomspot-${TS}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] dumping database → $OUT"
pg_dump --no-owner --no-privileges --format=plain "$SUPABASE_DB_URL" | gzip -9 > "$OUT"

echo "[$(date -u +%FT%TZ)] verifying archive"
gzip -t "$OUT"

echo "[$(date -u +%FT%TZ)] pruning backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -type f -name 'atomspot-*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

# ---- Optional off-box upload (uncomment & configure one) ----
# aws s3 cp  "$OUT" "s3://my-backups-bucket/atomspot/"   --storage-class STANDARD_IA
# rclone copy "$OUT" remote:atomspot-backups/

echo "[$(date -u +%FT%TZ)] backup complete: $(du -h "$OUT" | cut -f1)"
