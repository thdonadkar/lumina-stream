
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS last_read_user_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_read_seller_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_read_admin_at timestamptz;

ALTER TABLE public.support_ticket_messages REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_ticket_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_tickets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets';
  END IF;
END $$;
