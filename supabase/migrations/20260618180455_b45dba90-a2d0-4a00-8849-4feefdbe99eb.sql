
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS payment_ref text;
