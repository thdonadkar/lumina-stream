-- validate.sql — run against the target project after restore.
--   psql "$DST_DB" -f scripts/migrate/validate.sql
-- Compare the output against the same query run on $SRC_DB.

\echo '=== Row counts ==='
SELECT 'products' AS t, count(*) FROM public.products
UNION ALL SELECT 'orders',                 count(*) FROM public.orders
UNION ALL SELECT 'order_items',            count(*) FROM public.order_items
UNION ALL SELECT 'profiles',               count(*) FROM public.profiles
UNION ALL SELECT 'user_roles',             count(*) FROM public.user_roles
UNION ALL SELECT 'addresses',              count(*) FROM public.addresses
UNION ALL SELECT 'notifications',          count(*) FROM public.notifications
UNION ALL SELECT 'support_tickets',        count(*) FROM public.support_tickets
UNION ALL SELECT 'support_ticket_messages',count(*) FROM public.support_ticket_messages
UNION ALL SELECT 'payments',               count(*) FROM public.payments
UNION ALL SELECT 'return_requests',        count(*) FROM public.return_requests
UNION ALL SELECT 'product_reviews',        count(*) FROM public.product_reviews
UNION ALL SELECT 'wishlist',               count(*) FROM public.wishlist
UNION ALL SELECT 'categories',             count(*) FROM public.categories
UNION ALL SELECT 'banners',                count(*) FROM public.banners
UNION ALL SELECT 'site_content',           count(*) FROM public.site_content
UNION ALL SELECT 'audit_log',              count(*) FROM public.audit_log
UNION ALL SELECT 'auth.users',             count(*) FROM auth.users
UNION ALL SELECT 'auth.identities',        count(*) FROM auth.identities
ORDER BY 1;

\echo
\echo '=== Roles distribution ==='
SELECT role, count(*) FROM public.user_roles GROUP BY role ORDER BY role;

\echo
\echo '=== Extensions ==='
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_trgm','pgcrypto','uuid-ossp') ORDER BY 1;

\echo
\echo '=== Custom enums ==='
SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = 'public'::regnamespace
GROUP BY 1 ORDER BY 1;

\echo
\echo '=== Functions in public ==='
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('handle_new_user','decrement_stock','increment_stock',
                  'is_order_owner','is_order_seller','has_role',
                  'update_updated_at_column')
ORDER BY proname;
-- expect 7 rows

\echo
\echo '=== Trigger on auth.users (handle_new_user) ==='
SELECT tgname, tgrelid::regclass FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;
-- expect on_auth_user_created

\echo
\echo '=== RLS policies per table ==='
SELECT tablename, count(*) AS policies
FROM pg_policies WHERE schemaname = 'public'
GROUP BY tablename ORDER BY tablename;

\echo
\echo '=== Tables WITHOUT RLS enabled (should be empty!) ==='
SELECT tablename FROM pg_tables t
WHERE schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
      AND c.relrowsecurity = true);

\echo
\echo '=== Storage buckets ==='
SELECT id, name, public FROM storage.buckets ORDER BY id;

\echo
\echo '=== Storage object counts per bucket ==='
SELECT bucket_id, count(*) FROM storage.objects GROUP BY bucket_id ORDER BY 1;

\echo
\echo '=== Orphan order_items (should be 0) ==='
SELECT count(*) AS orphan_items
FROM public.order_items oi
WHERE NOT EXISTS (SELECT 1 FROM public.orders  o WHERE o.id = oi.order_id)
   OR NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id = oi.product_id);

\echo
\echo '=== Users without a role (should be 0) ==='
SELECT count(*) AS users_without_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);

\echo
\echo '=== Admin accounts ==='
SELECT u.email, r.role
FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
WHERE r.role = 'admin'
ORDER BY u.email;

\echo
\echo 'Done. Compare counts above with the same query run on $SRC_DB.'
