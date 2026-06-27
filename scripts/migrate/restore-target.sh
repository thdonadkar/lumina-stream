#!/usr/bin/env bash
# restore-target.sh — restore dumps from .migration/ into your new Supabase project.
# Requires: DST_DB env var set to the target Postgres URI.
set -Eeuo pipefail
: "${DST_DB:?DST_DB env var required (target Postgres URI from your Supabase project)}"

IN="${IN:-.migration}"
cd "$IN"

echo "[1/3] public schema"
psql "$DST_DB" -v ON_ERROR_STOP=1 -f public_full.sql

echo "[2/3] storage buckets"
psql "$DST_DB" -v ON_ERROR_STOP=1 -f storage_buckets.sql

echo "[3/3] auth users"
# instance_id may differ between projects; normalize if restore complains.
psql "$DST_DB" -v ON_ERROR_STOP=1 -f auth_data.sql || {
  echo "Auth restore failed. Trying with instance_id normalization..."
  sed -E "s/'[0-9a-f-]{36}'(,\s*'[0-9a-f-]{36}',\s*'authenticated')/'00000000-0000-0000-0000-000000000000'\1/g" \
    auth_data.sql > auth_data.normalized.sql
  psql "$DST_DB" -v ON_ERROR_STOP=1 -f auth_data.normalized.sql
}

echo
echo "Restore complete. Verifying counts:"
psql "$DST_DB" -c "select 'products' as t, count(*) from public.products
                   union all select 'orders', count(*) from public.orders
                   union all select 'auth.users', count(*) from auth.users;"
