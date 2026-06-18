-- 1. Refund tracking on orders
DO $$ BEGIN
  CREATE TYPE public.refund_status AS ENUM ('none','pending','approved','rejected','refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_status public.refund_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS return_reason text;

-- 2. Address default country -> India
ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'IN';

-- 3. Banners (admin homepage)
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  cta_text text,
  cta_link text,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_public_read" ON public.banners
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "banners_admin_write" ON public.banners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER banners_updated BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a couple of default banners
INSERT INTO public.banners (title, subtitle, cta_text, cta_link, position) VALUES
  ('Festive Drop · Up to 40% off', 'Curated objects of computational beauty', 'Shop the edit', '/shop', 1),
  ('Free shipping over ₹2,000', 'Same-day dispatch from Bengaluru', 'Browse new', '/shop', 2)
ON CONFLICT DO NOTHING;