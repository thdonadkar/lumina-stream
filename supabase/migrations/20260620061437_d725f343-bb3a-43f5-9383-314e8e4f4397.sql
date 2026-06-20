-- 1. PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_payment_id text,
  provider_order_id text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  method text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_order_id_idx ON public.payments(order_id);
CREATE INDEX payments_provider_order_id_idx ON public.payments(provider_order_id);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_owner_read" ON public.payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.user_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
  OR public.is_order_seller(auth.uid(), payments.order_id)
);
CREATE POLICY "payments_owner_insert" ON public.payments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND o.user_id = auth.uid())
);
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. ATOMIC STOCK HELPERS
CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id uuid, p_qty int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_stock int;
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN RAISE EXCEPTION 'Invalid qty %', p_qty; END IF;
  SELECT stock INTO current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF current_stock IS NULL THEN RAISE EXCEPTION 'Product not found: %', p_product_id; END IF;
  IF current_stock < p_qty THEN RAISE EXCEPTION 'Insufficient stock for % (have %, need %)', p_product_id, current_stock, p_qty; END IF;
  UPDATE public.products SET stock = stock - p_qty, updated_at = now() WHERE id = p_product_id;
END; $$;

CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id uuid, p_qty int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_qty IS NULL OR p_qty < 1 THEN RAISE EXCEPTION 'Invalid qty %', p_qty; END IF;
  UPDATE public.products SET stock = stock + p_qty, updated_at = now() WHERE id = p_product_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid,int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_stock(uuid,int) TO authenticated, service_role;

-- 3. RETURN REQUESTS
CREATE TABLE public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  photos text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX return_requests_order_id_idx ON public.return_requests(order_id);
CREATE INDEX return_requests_user_id_idx ON public.return_requests(user_id);
GRANT SELECT, INSERT, UPDATE ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "returns_owner_read" ON public.return_requests FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.is_order_seller(auth.uid(), order_id)
);
CREATE POLICY "returns_owner_insert" ON public.return_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "returns_admin_update" ON public.return_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_returns_updated_at BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. PRODUCT VARIANTS
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variants_product_id_idx ON public.product_variants(product_id);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_public_read" ON public.product_variants FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.status = 'active')
);
CREATE POLICY "variants_seller_manage" ON public.product_variants FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.seller_id = auth.uid())
  OR public.has_role(auth.uid(),'admin')
);
CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. EMAIL LOG
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  template text NOT NULL,
  subject text,
  status text NOT NULL DEFAULT 'queued',
  related_id uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_log_user_id_idx ON public.email_log(user_id);
CREATE INDEX email_log_related_id_idx ON public.email_log(related_id);
GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_log_self_read" ON public.email_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 6. FULL-TEXT + FUZZY SEARCH on products (no brand/category text columns exist)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title,'') || ' ' ||
      coalesce(tagline,'') || ' ' ||
      coalesce(description,'')
    )
  ) STORED;
CREATE INDEX IF NOT EXISTS products_search_tsv_idx ON public.products USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS products_title_trgm_idx ON public.products USING GIN (title gin_trgm_ops);
