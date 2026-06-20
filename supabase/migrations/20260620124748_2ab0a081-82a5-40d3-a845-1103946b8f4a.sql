CREATE TABLE public.support_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.support_ticket_attachments TO authenticated;
GRANT ALL ON public.support_ticket_attachments TO service_role;

ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read attachments"
  ON public.support_ticket_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.seller_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Participants can attach files"
  ON public.support_ticket_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.user_id = auth.uid()
          OR t.seller_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Uploaders or admins can delete"
  ON public.support_ticket_attachments FOR DELETE
  TO authenticated
  USING (uploader_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_support_attachments_ticket ON public.support_ticket_attachments(ticket_id, created_at DESC);
CREATE INDEX idx_support_attachments_message ON public.support_ticket_attachments(message_id);