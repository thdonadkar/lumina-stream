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

## 7. Code change: drop the Lovable OAuth broker

`src/routes/auth.tsx` currently calls `lovable.auth.signInWithOAuth(...)`,
which routes through Lovable Cloud's OAuth broker. Self-hosted, that
broker isn't available — replace both call sites with direct Supabase calls:

```ts
// before
const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });

// after
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```

Apply the same change for the Apple button if you keep it (and configure
Apple in your new Supabase project's Auth → Providers). Remove the
`@lovable.dev/cloud-auth-js` dependency and the `src/integrations/lovable/`
folder once both are unused.

---

## 8. Rollback plan

The dump is **read-only against the source** — Lovable Cloud is never
written to. Before cutover:

```bash
cp /opt/atomspot/.env /opt/atomspot/.env.lovable-backup
```

If anything goes wrong:

| Failure point | Action |
|---|---|
| `restore-target.sh` fails midway | Delete the target Supabase project, recreate, re-run dump+restore. Cheaper than untangling a partial restore. |
| Auth restore fails, data restore OK | Users hit "Forgot password" against new project. Roles/orders intact. |
| Storage copy fails partway | Re-run `copy-storage.mjs` — it's idempotent. |
| Discovered post-cutover that something is broken | `cp /opt/atomspot/.env.lovable-backup /opt/atomspot/.env && pm2 reload ecosystem.config.js --update-env`. Back on Lovable Cloud in seconds. Any writes that happened on the new project during the window are lost — **freeze writes (maintenance page) during cutover** to make this a clean rollback. |

---

## 9. Post-migration validation checklist

Run this against the new project BEFORE flipping DNS / EC2 to it. Use a
staging hostname (e.g. `staging.shop.example.com`) or `localhost:3000`
pointed at the new env. Mark each box only after you observe the result.

### 9.1 Database integrity

```bash
psql "$DST_DB" -f scripts/migrate/validate.sql
```

(see `scripts/migrate/validate.sql` — generated alongside this doc).

- [ ] Row counts match source for: `products`, `orders`, `order_items`, `profiles`, `user_roles`, `addresses`, `notifications`, `support_tickets`, `payments`
- [ ] `auth.users` count matches source
- [ ] `select count(*) from public.user_roles where role='admin'` ≥ 1
- [ ] No orphan `order_items` (FK to deleted product/order)
- [ ] All 25 tables listed in `<supabase-tables>` exist on target
- [ ] `pg_trgm` extension enabled (`select * from pg_extension where extname='pg_trgm'`)

### 9.2 Functions & triggers

- [ ] `select has_role('<admin-uuid>'::uuid, 'admin'::app_role)` returns `true`
- [ ] `select * from pg_proc where proname in ('handle_new_user','decrement_stock','increment_stock','is_order_owner','is_order_seller','has_role','update_updated_at_column')` returns 7 rows
- [ ] `on_auth_user_created` trigger exists on `auth.users` (`\dft auth.*`)
- [ ] Sign up a brand-new test email → confirm row appears in `public.profiles` AND `public.user_roles` (proves trigger works end-to-end)

### 9.3 RLS policies

- [ ] `select schemaname, tablename, count(*) from pg_policies where schemaname='public' group by 1,2` matches source (25 tables, total policy count matches)
- [ ] Anonymous user CAN read `products` (active), `categories`, `banners`, `site_content`
- [ ] Anonymous user CANNOT read `orders`, `user_roles`, `addresses`, `notifications`
- [ ] Customer A signed in CANNOT read Customer B's orders
- [ ] Seller CANNOT read orders that don't contain their products

### 9.4 Authentication

- [ ] Existing customer logs in with old password → success
- [ ] Existing seller logs in → lands on `/seller/dashboard`, sees own products
- [ ] Existing admin logs in → lands on `/admin/dashboard`, sees all sections
- [ ] "Forgot password" email arrives, link works, password updates
- [ ] New sign-up via email creates `profiles` + `user_roles` row with role `user`
- [ ] Google OAuth: existing Google-linked user signs in without re-linking
- [ ] Google OAuth: brand-new Google account creates `auth.users` + `auth.identities` row

### 9.5 User roles

- [ ] Admin user can open `/admin/orders`, `/admin/users`, `/admin/products`
- [ ] Seller user can open `/seller/orders` but blocked from `/admin/*`
- [ ] Customer blocked from both `/admin/*` and `/seller/*`
- [ ] Role progression test: promote a test user via admin UI → reload → new role active

### 9.6 Storage

- [ ] Source object count per bucket == target object count
  ```bash
  for b in product-images return-photos support-attachments; do
    echo "=== $b ==="
    psql "$SRC_DB" -c "select count(*) from storage.objects where bucket_id='$b'"
    psql "$DST_DB" -c "select count(*) from storage.objects where bucket_id='$b'"
  done
  ```
- [ ] All 3 buckets exist on target and are **private** (`public=false`)
- [ ] Storage RLS policies copied (re-create from migrations if missing — they live in `supabase/migrations/*.sql`, search for `storage.objects`)
- [ ] Open an existing product page → product image loads (signed URL works)
- [ ] Submit a new return with photo → file appears in `return-photos`
- [ ] Reply to a support ticket with attachment → file appears in `support-attachments`

### 9.7 Orders workflow (smoke)

- [ ] Customer: add to cart → checkout → place order (test mode) → order appears in `/orders/:id`
- [ ] Customer: cancel a pending order → status → `cancelled`
- [ ] Seller: progress order pending → confirmed → packed → shipped → delivered
- [ ] Admin: override status; row inserted into `audit_log` with prev/new/updated_by/timestamp
- [ ] Customer: after delivered, "Request return" submits to `return_requests`
- [ ] Inventory: stock decremented on order, restored on cancel (check `products.stock`)

### 9.8 Products & catalog

- [ ] Public `/shop` lists active products
- [ ] Search bar returns results (proves `pg_trgm` works)
- [ ] Category page filters correctly
- [ ] Seller creates a new product → appears in admin + public catalog
- [ ] Reviews: post a review → appears on product page, average rating updates

### 9.9 Payments (Razorpay)

- [ ] Razorpay keys in new `.env` are the LIVE keys (not Lovable's test keys, if different)
- [ ] Razorpay dashboard → Webhooks: URL points to `https://<your-domain>/api/public/razorpay-webhook`, secret matches `RAZORPAY_WEBHOOK_SECRET` on EC2
- [ ] Test payment in test mode → `payments` row created with status `captured`, order moves to `confirmed`
- [ ] Send a test webhook from Razorpay dashboard → 200 response, row in `payments`
- [ ] Invalid signature webhook → 401 response (proves signature verification works)

### 9.10 Notifications & realtime

- [ ] Realtime is enabled on `notifications` in the new project (Supabase dashboard → Database → Replication → toggle `notifications`)
- [ ] Trigger a notification (e.g. order status update) → bell icon updates without reload
- [ ] Mark as read → row updates, bell badge decrements

### 9.11 Support

- [ ] Customer opens a new ticket → row in `support_tickets`
- [ ] Admin replies → message in `support_ticket_messages`, customer sees it live
- [ ] Attachment upload + download round-trip works

### 9.12 Final cutover

- [ ] Site put into maintenance mode (block writes on Lovable Cloud)
- [ ] Final delta dump+restore of just changed rows since the rehearsal (or just re-run full dump if downtime budget allows)
- [ ] DNS for EC2 domain points at the instance
- [ ] Google OAuth Cloud Console has new callback URLs whitelisted
- [ ] Razorpay webhook URL switched to new domain
- [ ] `backup.sh` cron now points at `$DST_DB`
- [ ] `/opt/atomspot/.env.lovable-backup` kept on EC2 for instant rollback
- [ ] Lovable Cloud project kept read-only for 7 days as fallback

After 7 days of green metrics on your own Supabase, delete the Lovable
Cloud project from the Cloud panel.

