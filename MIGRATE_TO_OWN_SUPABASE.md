# Migrate from Lovable Cloud to Your Own Supabase Project

This project's backend currently runs on **Lovable Cloud** (Supabase
infrastructure under Lovable's organization). Lovable Cloud does NOT support
"transfer ownership" to a personal Supabase org — you migrate to a new
project under your own account and re-point the app.

This runbook moves **everything** to a Supabase project you own:

- Database: tables, enums, functions, triggers, RLS policies, sequences, data
- `auth.users` including password hashes (so existing users keep signing in)
- Storage buckets, objects, and storage RLS policies
- Authentication settings (providers, redirect URLs)
- Seed/admin data (already in your data dump)
- Environment variables for self-hosted EC2

---

## 0. Prerequisites (on your laptop)

```bash
# Postgres client (matches Supabase 15.x)
sudo apt-get install -y postgresql-client-15        # Ubuntu/Debian
brew install libpq && brew link --force libpq       # macOS

# Node 20 (for the storage copy script)
node -v   # >= 20
```

You will need two Postgres connection strings and two service role keys.

### Source (current Lovable Cloud project)

- **DB URL**: open Lovable → **Cloud** panel → Database → "Connection string"
  (URI / `postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres`).
  Lovable Cloud does not expose this to the agent — copy it yourself.
- **Service role key**: Lovable → **Cloud** → Settings → API keys → service
  role. Also not exposed to the agent.
- **Project ref**: `rncyjioxckiyscwwalvm` (from `.env`).

### Target (your own Supabase project)

1. Go to <https://supabase.com/dashboard> with your own account.
2. **New project** → pick a region close to your EC2, set a strong DB
   password, wait for provisioning.
3. Grab:
   - `Project URL` (e.g. `https://abcd1234.supabase.co`)
   - `anon` / `publishable` key
   - `service_role` key (keep secret)
   - DB connection string (Settings → Database → Connection string → URI)
4. **Postgres version**: pick 15.x to match source. If the source is on 17.x,
   create the new project on 17.x — dump/restore across major versions
   silently breaks extensions.

Export them locally (do NOT commit):

```bash
export SRC_DB="postgresql://postgres:<src-pw>@db.rncyjioxckiyscwwalvm.supabase.co:5432/postgres"
export DST_DB="postgresql://postgres:<dst-pw>@db.<your-ref>.supabase.co:5432/postgres"
export SRC_URL="https://rncyjioxckiyscwwalvm.supabase.co"
export SRC_SERVICE_KEY="<src service role>"
export DST_URL="https://<your-ref>.supabase.co"
export DST_SERVICE_KEY="<dst service role>"
```

---

## 1. Dump the source database

Run from your laptop. We dump in three layers so each can be inspected /
re-run independently.

```bash
mkdir -p .migration && cd .migration

# 1a. Roles (no-op for managed Supabase but keeps fidelity)
pg_dumpall --roles-only -d "$SRC_DB" > roles.sql || true

# 1b. Auth schema (users + identities + password hashes)
pg_dump "$SRC_DB" \
  --schema=auth \
  --no-owner --no-privileges \
  --data-only \
  --table='auth.users' \
  --table='auth.identities' \
  --table='auth.mfa_factors' \
  --table='auth.mfa_challenges' \
  --table='auth.sessions' \
  --column-inserts \
  > auth_data.sql

# 1c. Public schema + storage policies (structure + data)
pg_dump "$SRC_DB" \
  --schema=public \
  --no-owner --no-privileges \
  > public_full.sql

# 1d. Storage metadata rows (buckets table + objects metadata)
pg_dump "$SRC_DB" \
  --schema=storage \
  --table='storage.buckets' \
  --data-only --no-owner --no-privileges \
  --column-inserts \
  > storage_buckets.sql
```

If `pg_dump` complains about version mismatch, install a client matching
the server (Supabase shows the server version in Settings → Database).

---

## 2. Prepare the target project

Before restoring:

1. In the new Supabase dashboard, **Authentication → Providers**:
   - Enable **Email** (turn off "Confirm email" only if the source had it off).
   - Enable **Google** if used. Paste the same OAuth client ID/secret you
     used on the source (or generate new ones in Google Cloud Console for
     the new redirect URI `https://<your-domain>/auth/callback` and
     `https://<your-ref>.supabase.co/auth/v1/callback`).
2. **Authentication → URL Configuration**:
   - Site URL: your EC2 domain (e.g. `https://shop.example.com`).
   - Redirect URLs: add `https://shop.example.com/**`, `http://localhost:3000/**`.
3. **Database → Extensions**: enable `pg_trgm` (this project uses it for
   search). The dump tries to `CREATE EXTENSION` but enabling it in the
   dashboard avoids permission issues.

---

## 3. Restore into the target

```bash
# 3a. Public schema (tables, enums, functions, triggers, RLS, data)
psql "$DST_DB" -v ON_ERROR_STOP=1 -f public_full.sql

# 3b. Storage buckets (object rows are copied in step 4)
psql "$DST_DB" -v ON_ERROR_STOP=1 -f storage_buckets.sql

# 3c. Auth users
#  - auth.users has a FK on auth.identities; insert users first.
#  - 'instance_id' may differ between projects. The dump uses the source
#    instance_id; if restore complains, run:
#        UPDATE auth.users SET instance_id = '00000000-0000-0000-0000-000000000000';
#        UPDATE auth.identities SET ... same ...;
psql "$DST_DB" -v ON_ERROR_STOP=1 -f auth_data.sql
```

### 3d. Re-create the `auth.users` trigger (CRITICAL)

`handle_new_user` fires on `auth.users` INSERT to seed `public.profiles` +
`public.user_roles`. `--schema=public` does NOT include triggers attached
to `auth.*` tables, so re-bind on the target or new sign-ups silently skip
profile/role creation.

```bash
psql "$DST_DB" -v ON_ERROR_STOP=1 <<'SQL'
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
SQL
```

Expected harmless warnings during restore:

- `extension "pg_trgm" already exists` — fine.
- `role "supabase_admin" does not exist` — fine; we used `--no-owner`.
- `permission denied for schema auth` on `auth.schema_migrations` etc. —
  Supabase locks those tables; user/identity data still restores.

**Sanity counts**:

```bash
psql "$DST_DB" -c "select 'products' t, count(*) from public.products
                   union all select 'orders', count(*) from public.orders
                   union all select 'auth.users', count(*) from auth.users
                   union all select 'user_roles', count(*) from public.user_roles;"
```

---

## 4. Copy storage objects

Buckets exist now but are empty. Run the bundled Node script:

```bash
node scripts/migrate/copy-storage.mjs
```

It reads `$SRC_URL`, `$SRC_SERVICE_KEY`, `$DST_URL`, `$DST_SERVICE_KEY`
from env, lists every object in `product-images`, `return-photos`,
`support-attachments`, downloads from source, uploads to target, and
preserves the path. Re-runnable; skips files that already exist on target.

---

## 5. Point the app at your new project

### Local dev (`.env`)

```env
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your anon/publishable key>
VITE_SUPABASE_PROJECT_ID=<your-ref>

SUPABASE_URL=https://<your-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your anon/publishable key>
SUPABASE_PROJECT_ID=<your-ref>
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
SUPABASE_DB_URL=<your DST_DB>
```

### EC2 production (`/opt/atomspot/.env`)

Use the same values plus everything in `.env.example` (Razorpay, etc.).
Restart PM2: `pm2 reload ecosystem.config.js --update-env`.

### `supabase/config.toml`

Update `project_id = "<your-ref>"` so future `supabase` CLI commands target
your project, not the Lovable one.

---

## 6. Future migrations

`supabase/migrations/*.sql` is your full migration history and travels with
the repo. On the new project:

```bash
supabase link --project-ref <your-ref>
supabase db push    # applies any new migrations
```

You no longer need Lovable Cloud's migration tool — author SQL files
directly and run `supabase db push`.

---

## 7. Final cutover checklist

- [ ] DNS for EC2 domain points at the instance
- [ ] Google OAuth client has new callback URLs whitelisted
- [ ] Razorpay webhook URL updated to `https://<your-domain>/api/public/razorpay-webhook`
- [ ] Smoke test: sign in with an existing email, place a test order, upload a return photo
- [ ] `backup.sh` cron now points at `$DST_DB`
- [ ] Lovable Cloud project disabled or kept read-only for a week as fallback

After 7 days of green metrics on your own Supabase, you can delete the
Lovable Cloud project from the Cloud panel.
