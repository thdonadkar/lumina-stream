
-- 1. Indexes (skip ones already present)
CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_id_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS products_seller_status_idx ON public.products(seller_id, status);
CREATE INDEX IF NOT EXISTS products_category_active_created_idx
  ON public.products(category_id, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS reviews_product_created_idx ON public.reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS support_tickets_user_status_idx
  ON public.support_tickets(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx
  ON public.support_ticket_messages(ticket_id, created_at);

-- 2. CHECK constraints (use DO blocks for IF NOT EXISTS semantics)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_nonneg') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_stock_nonneg CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_subtotal_nonneg') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_subtotal_nonneg CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_nonneg') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_total_nonneg CHECK (total >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_discount_nonneg') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_discount_nonneg CHECK (discount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'coupons_value_nonneg') THEN
    ALTER TABLE public.coupons ADD CONSTRAINT coupons_value_nonneg CHECK (value >= 0);
  END IF;
END $$;

-- 3. Soft-delete columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS products_alive_idx ON public.products(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS categories_alive_idx ON public.categories(id) WHERE deleted_at IS NULL;

-- 4. Idempotent new-user handler (profiles uses display_name, avatar_url)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5. Tighten support_tickets visibility — sellers only see tickets attached to
--    orders that contain one of their own products (or where seller_id was set
--    explicitly to them).
DROP POLICY IF EXISTS "tick_select" ON public.support_tickets;
CREATE POLICY "tick_select" ON public.support_tickets FOR SELECT USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'seller'::app_role)
    AND (
      seller_id = auth.uid()
      OR (order_id IS NOT NULL AND public.is_order_seller(auth.uid(), order_id))
    )
  )
);

DROP POLICY IF EXISTS "tick_update" ON public.support_tickets;
CREATE POLICY "tick_update" ON public.support_tickets FOR UPDATE USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    public.has_role(auth.uid(), 'seller'::app_role)
    AND (
      seller_id = auth.uid()
      OR (order_id IS NOT NULL AND public.is_order_seller(auth.uid(), order_id))
    )
  )
);

-- 6. audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_admin_read" ON public.audit_log;
CREATE POLICY "audit_admin_read" ON public.audit_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS audit_log_action_created_idx ON public.audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log(actor_id, created_at DESC);

-- 7. analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id text,
  session_id text,
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.analytics_events_id_seq TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "analytics_insert_any" ON public.analytics_events;
CREATE POLICY "analytics_insert_any" ON public.analytics_events FOR INSERT
  WITH CHECK (
    -- if user_id is provided it must match the caller (when signed in)
    (user_id IS NULL OR user_id = auth.uid())
  );
DROP POLICY IF EXISTS "analytics_admin_read" ON public.analytics_events;
CREATE POLICY "analytics_admin_read" ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS analytics_events_name_created_idx
  ON public.analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx
  ON public.analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- 8. Coupon redemption uniqueness (prevents same user redeeming same coupon twice)
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_unique_per_user
  ON public.coupon_redemptions(coupon_id, user_id);
