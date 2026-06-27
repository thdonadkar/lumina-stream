#!/usr/bin/env bash
# dump-source.sh — pg_dump the Lovable Cloud project into .migration/
# Run on your laptop. Requires: SRC_DB env var set to the source DB URL.
set -Eeuo pipefail
: "${SRC_DB:?SRC_DB env var required (source Postgres URI from Lovable Cloud panel)}"

OUT="${OUT:-.migration}"
mkdir -p "$OUT"
cd "$OUT"

echo "[1/4] roles"
pg_dumpall --roles-only -d "$SRC_DB" > roles.sql || echo "  (skipped — managed Supabase usually blocks this; safe to ignore)"

echo "[2/4] auth data (users, identities, MFA, sessions)"
pg_dump "$SRC_DB" \
  --schema=auth --data-only --no-owner --no-privileges --column-inserts \
  --table='auth.users' --table='auth.identities' \
  --table='auth.mfa_factors' --table='auth.mfa_challenges' --table='auth.sessions' \
  > auth_data.sql

echo "[3/4] public schema (tables + enums + functions + triggers + RLS + data)"
pg_dump "$SRC_DB" --schema=public --no-owner --no-privileges > public_full.sql

echo "[4/4] storage.buckets rows"
pg_dump "$SRC_DB" --schema=storage --table='storage.buckets' \
  --data-only --no-owner --no-privileges --column-inserts > storage_buckets.sql

echo
echo "Done. Files written to $(pwd):"
ls -lh *.sql
