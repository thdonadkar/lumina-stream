
-- Add order/seller linkage to support tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS support_tickets_seller_idx ON public.support_tickets(seller_id);
CREATE INDEX IF NOT EXISTS support_tickets_order_idx ON public.support_tickets(order_id);

-- Record explicit sender role on each message
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS sender_role text NOT NULL DEFAULT 'user'
  CHECK (sender_role IN ('user','seller','admin'));

-- Replace policies to grant seller access
DROP POLICY IF EXISTS tick_self ON public.support_tickets;
CREATE POLICY tick_select ON public.support_tickets
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() = seller_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY tick_insert ON public.support_tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tick_update ON public.support_tickets
FOR UPDATE USING (
  auth.uid() = user_id
  OR auth.uid() = seller_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS ticket_msg_read ON public.support_ticket_messages;
DROP POLICY IF EXISTS ticket_msg_insert ON public.support_ticket_messages;

CREATE POLICY ticket_msg_read ON public.support_ticket_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR t.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  )
);
CREATE POLICY ticket_msg_insert ON public.support_ticket_messages
FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR t.seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  )
);
