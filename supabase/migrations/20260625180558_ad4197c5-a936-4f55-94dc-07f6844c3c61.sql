CREATE TABLE public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_content readable by everyone"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "site_content admin insert"
  ON public.site_content FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site_content admin update"
  ON public.site_content FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site_content admin delete"
  ON public.site_content FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_content (key, value) VALUES
  ('hero', '{"title":"Premium products. Minimal experience.","subtitle":"Discover curated essentials at AtomSpot.","cta_text":"Shop now","cta_link":"/shop"}'::jsonb),
  ('about', '{"title":"About AtomSpot","body":"AtomSpot is a premium ecommerce experience focused on clean design and quality products."}'::jsonb),
  ('contact', '{"email":"support@atomspot.com","phone":"+1 555 000 0000","address":"AtomSpot HQ"}'::jsonb),
  ('footer', '{"tagline":"AtomSpot — premium, minimal, modern.","copyright":"© AtomSpot. All rights reserved."}'::jsonb),
  ('faq', '{"items":[{"q":"How do I track my order?","a":"Open Orders in your dashboard to see live status."},{"q":"What is your return policy?","a":"Returns accepted within 7 days of delivery."}]}'::jsonb);
