
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed' BEFORE 'packed';

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_msg_read" ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets t
            WHERE t.id = ticket_id
              AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );

CREATE POLICY "ticket_msg_insert" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.support_tickets t
            WHERE t.id = ticket_id
              AND (t.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
  );

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx
  ON public.support_ticket_messages(ticket_id, created_at);
