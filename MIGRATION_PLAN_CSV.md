# AtomSpot CSV-based Migration Plan (no pg_dump)

This plan migrates AtomSpot from the Lovable-managed Supabase project to your
own Supabase project using **migrations + CSV exports + storage copy** only.
No application logic is modified.

---

## 1. Migration coverage audit

The 28 SQL files in `supabase/migrations/` were reviewed. Together they
fully recreate the schema on an empty target project via `supabase db push`:

| Object kind | Coverage | Notes |
|---|---|---|
| **Enums** | ✅ | `app_role`, plus order/payment/return/ticket status enums defined in the initial migration. |
| **Tables (25)** | ✅ | All 25 public tables listed in `<supabase-tables>` are created. |
| **Indexes** | ✅ | 30+ indexes including `pg_trgm` GIN on `products.title`, tsvector GIN on `products.search_tsv`, partial alive indexes, and FK indexes. |
| **Functions** | ✅ | `has_role`, `handle_new_user`, `is_order_owner`, `is_order_seller`, `decrement_stock`, `increment_stock`, `update_updated_at_column`. |
| **Triggers (public)** | ✅ | `*_updated_at` on `profiles, products, orders, banners, support_tickets, payments, return_requests, site_content, product_variants, product_reviews`. |
| **Trigger on `auth.users`** | ✅ | `on_auth_user_created → handle_new_user()` is in the migrations and runs on `supabase db push` against your own project (you own `auth` there). |
| **RLS** | ✅ | `ENABLE ROW LEVEL SECURITY` on every public table. |
| **RLS policies** | ✅ | All 50+ policies referenced in `<supabase-tables>` policy counts are recreated. |
| **Storage buckets** | ✅ | `product-images`, `return-photos`, `support-attachments` (all private). |
| **Storage policies** | ✅ | Bucket-scoped policies on `storage.objects` for each bucket. |
| **Extensions** | ⚠️ Manual | Enable `pg_trgm` in Dashboard → Database → Extensions **before** running `supabase db push` (the migration assumes it exists). |
| **Realtime publication** | ⚠️ Manual | `notifications`, `support_tickets`, `support_ticket_messages` — toggle in Dashboard → Database → Replication after push. `REPLICA IDENTITY FULL` is already in the migrations. |

**Conclusion:** running `supabase link --project-ref <new> && supabase db push`
produces a structurally identical empty database — no schema CSVs needed.

---

## 2. FK-safe import order (CSV)

Parents first, then children. Import in this exact order:

```
1.  profiles                       (FK: auth.users.id → must import auth first)
2.  user_roles                     (FK: auth.users.id)
3.  categories                     (self-referencing parent_id → import twice or NULL parents on pass 1, UPDATE on pass 2)
4.  products                       (FK: profiles.seller_id, categories.id)
5.  product_variants               (FK: products)
6.  banners                        (FK: products? optional)
7.  site_content                   (no FK)
8.  coupons                        (no FK)
9.  addresses                      (FK: auth.users)
10. orders                         (FK: auth.users, addresses)
11. order_items                    (FK: orders, products)
12. payments                       (FK: orders)
13. coupon_redemptions             (FK: coupons, auth.users, orders)
14. reviews                        (FK: products, auth.users)
15. product_reviews                (FK: products, auth.users)
16. return_requests                (FK: orders, auth.users)
17. wishlist                       (FK: auth.users, products)
18. notifications                  (FK: auth.users)
19. support_tickets                (FK: auth.users, orders, profiles[seller])
20. support_ticket_messages        (FK: support_tickets, auth.users)
21. support_ticket_attachments     (FK: support_tickets, support_ticket_messages)
22. contact_messages               (no FK)
```

Categories tip: if `categories.parent_id` is used, run two passes — INSERT
with `parent_id = NULL`, then `UPDATE categories SET parent_id = ...` from
the CSV. Otherwise FK to a not-yet-inserted row fails.

---

## 3. Per-table treatment

| Table | Action | Reason |
|---|---|---|
| `profiles` | **CSV import** | Created by `handle_new_user`, but existing rows need to be carried over. Import AFTER auth.users. |
| `user_roles` | **CSV import** | Trigger only ever assigns `'user'`; admins/sellers must be preserved. |
| `categories` | **CSV import** | Authoring data. |
| `products` | **CSV import** | Catalog data. Drop the `search_tsv` column from the CSV — it's a generated/maintained column; reindex after import if needed. |
| `product_variants` | **CSV import** | |
| `banners` | **CSV import** | |
| `site_content` | **CSV import** | |
| `coupons` | **CSV import** | |
| `addresses` | **CSV import** | |
| `orders` | **CSV import** | |
| `order_items` | **CSV import** | |
| `payments` | **CSV import** | |
| `coupon_redemptions` | **CSV import** | |
| `reviews` | **CSV import** | |
| `product_reviews` | **CSV import** | |
| `return_requests` | **CSV import** | |
| `wishlist` | **CSV import** | |
| `notifications` | **CSV import (optional)** | Skip if you accept losing in-flight notifications; keep for continuity. |
| `support_tickets` | **CSV import** | |
| `support_ticket_messages` | **CSV import** | |
| `support_ticket_attachments` | **CSV import** | Rows only — the binary files live in storage (step 5). |
| `contact_messages` | **CSV import (optional)** | Historical inbox; skip if non-critical. |
| `audit_log` | **SKIP** | Append-only log; not needed in new env. Recreated naturally as users act. |
| `analytics_events` | **SKIP** | Event log; high-volume, low value to replay. |
| `email_log` | **SKIP** | Outbound log; do not replay (would re-trigger nothing, just clutter). |

**Recreated automatically by the schema migration (no CSV):**
all functions, triggers, indexes, RLS policies, enums, storage buckets,
storage policies.

**Rebuilt after import (post-load steps):**
- `ANALYZE` every imported table.
- `REINDEX INDEX products_search_tsv_idx; REINDEX INDEX products_title_trgm_idx;` to refresh trigram/tsvector indexes.
- `SELECT setval(pg_get_serial_sequence('public.<table>', '<col>'), MAX(<col>)) FROM public.<table>;` for any `bigserial` columns (none currently — all PKs are UUID — so safe to skip).

---

## 4. Tables that must NOT be manually imported

- `audit_log` — append-only audit trail; importing distorts history timestamps and actor IDs.
- `analytics_events` — telemetry firehose; high cardinality, no business value post-cutover.
- `email_log` — outbound delivery log; replaying confuses observability.
- `auth.*` tables other than `users` / `identities` — managed by GoTrue; never CSV-imported.
- `storage.objects` — metadata is recreated automatically by `storage_upload`; never CSV this directly.
- `supabase_migrations.schema_migrations` — managed by the CLI.
- Any `pg_*`, `realtime.*`, `vault.*`, `extensions.*` table.

---

## 5. Authentication migration strategy

Because CSV export from the source does **not** include password hashes,
auth requires a hybrid approach:

### 5.1 Users (`auth.users` + `auth.identities`)
- **Export from source** via Dashboard → Authentication → Users → "Download as CSV"
  (or `select id, email, raw_user_meta_data, created_at from auth.users`).
- **Import on target** via Dashboard → Authentication → Users → "Add user → Import users (CSV)".
- The CSV import generates new `auth.users` rows. **CRITICAL:** preserve the original `id` (UUID) values so all FKs in `profiles`, `user_roles`, `orders`, etc. still resolve.

### 5.2 Profiles
- `handle_new_user` will fire for each imported user and seed `profiles` + `user_roles('user')` automatically.
- Then run the `profiles` CSV import with `ON CONFLICT (id) DO UPDATE` to overlay the original `display_name`, `avatar_url`, phone, etc.

### 5.3 Roles
- Import `user_roles.csv` with `ON CONFLICT (user_id, role) DO NOTHING`. This preserves admin/seller grants on top of the default `user` role inserted by the trigger.

### 5.4 OAuth (Google)
- In the new Supabase project: Authentication → Providers → Google → enable.
- Use your own Google Cloud OAuth Client ID/Secret (or the Lovable-managed default while testing).
- Add the new callback URL to Google Cloud Console: `https://<new-ref>.supabase.co/auth/v1/callback`.
- Existing Google users will re-link on first sign-in (Supabase matches by email and writes a new `auth.identities` row).
- App code already uses `lovable.auth.signInWithOAuth("google", …)`. For self-hosted EC2 without the Lovable broker, swap to `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: \`${origin}/auth/callback\` }})` — already documented in `MIGRATE_TO_OWN_SUPABASE.md` §7. **Not part of this plan; do it at cutover.**

### 5.5 Password reset strategy
CSV-based auth import does **not** carry password hashes. Therefore:

1. After cutover, every existing email/password user must use **"Forgot password"** once.
2. Send a one-time broadcast email: "We moved infrastructure; please reset your password using the link on the sign-in page. Your data, orders, and addresses are unchanged."
3. Google-OAuth users are unaffected — they sign in with Google as before.
4. Demo accounts (`admin@demo.com`, `seller@demo.com`, `user@demo.com`) will be recreated by `ensureDemoAccounts` on first call against the new project.

---

## 6. Final Kiro CSV migration checklist

Execute in this order. Each step is idempotent unless noted.

### Phase A — Target project bootstrap
- [ ] Create new Supabase project (Postgres 15.x to match source).
- [ ] Dashboard → Database → Extensions: enable `pg_trgm`.
- [ ] Dashboard → Authentication → Providers: enable Email; enable Google with OAuth credentials.
- [ ] Dashboard → Authentication → URL Configuration: set Site URL + Redirect URLs to EC2 domain + `http://localhost:3000/**`.
- [ ] `supabase link --project-ref <new-ref>`
- [ ] `supabase db push` — applies all 28 migrations → schema, enums, indexes, functions, triggers, RLS, buckets, storage policies all created.
- [ ] Verify: `\dt public.*` lists 25 tables; `\df public.*` lists 7 functions; `select count(*) from pg_policies where schemaname='public'` ≥ 50.

### Phase B — Source CSV export (per table, from Cloud → Database → Tables → Download CSV)
- [ ] Export tables in this list to `./csv/<table>.csv`:
      profiles, user_roles, categories, products, product_variants, banners, site_content,
      coupons, addresses, orders, order_items, payments, coupon_redemptions, reviews,
      product_reviews, return_requests, wishlist, notifications, support_tickets,
      support_ticket_messages, support_ticket_attachments, contact_messages.
- [ ] Skip: audit_log, analytics_events, email_log.
- [ ] Export `auth.users` via Auth → Users → Download CSV → `./csv/auth_users.csv`.

### Phase C — Auth restore
- [ ] Dashboard → Authentication → Users → Import users → upload `auth_users.csv` (preserves UUIDs).
- [ ] Verify: `select count(*) from auth.users` on target == source.
- [ ] Confirm `handle_new_user` populated `profiles` and `user_roles` rows (trigger fires per import).

### Phase D — Data import (FK-safe order from §2)
For each table, in order, run via `psql "$DST_DB"`:
```sql
\copy public.<table> FROM './csv/<table>.csv' WITH (FORMAT csv, HEADER true, NULL '');
```
Special cases:
- [ ] `profiles`: use staging table + `INSERT … ON CONFLICT (id) DO UPDATE` to overlay trigger-inserted rows.
- [ ] `user_roles`: `INSERT … ON CONFLICT (user_id, role) DO NOTHING`.
- [ ] `categories`: two-pass if `parent_id` is used (pass 1 NULL, pass 2 UPDATE).
- [ ] `products`: exclude generated column `search_tsv` from the CSV column list.

### Phase E — Storage migration
- [ ] Run `node scripts/migrate/copy-storage.mjs` with `SRC_URL/SRC_SERVICE_KEY/DST_URL/DST_SERVICE_KEY` env vars set.
- [ ] Verify per-bucket counts match: `select bucket_id, count(*) from storage.objects group by 1`.

### Phase F — Post-import rebuild
- [ ] `ANALYZE;` on the whole database.
- [ ] `REINDEX INDEX public.products_search_tsv_idx;`
- [ ] `REINDEX INDEX public.products_title_trgm_idx;`
- [ ] Dashboard → Database → Replication: enable realtime on `notifications`, `support_tickets`, `support_ticket_messages`.

### Phase G — Validation
- [ ] Run `psql "$DST_DB" -f scripts/migrate/validate.sql` and confirm row-count parity for the imported tables.
- [ ] Walk the §9 checklist in `MIGRATE_TO_OWN_SUPABASE.md` (auth, roles, RLS, orders, payments, support, storage).

### Phase H — Cutover (out of scope for this plan)
- [ ] Update `.env` on EC2 to new project URL + keys.
- [ ] Send "please reset your password" email to all existing email/password users.
- [ ] Keep Lovable Cloud project read-only for 7 days as fallback.

---

**No application code changes are made by this plan.** Code swaps
(`lovable.auth.signInWithOAuth` → `supabase.auth.signInWithOAuth`,
`.env` updates) are tracked separately in `MIGRATE_TO_OWN_SUPABASE.md` §7
and executed only at cutover.
