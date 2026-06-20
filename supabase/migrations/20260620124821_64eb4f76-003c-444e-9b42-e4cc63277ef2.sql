CREATE POLICY "Ticket participants can read attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id::text = split_part(name, '/', 1)
        AND (
          t.user_id = auth.uid()
          OR t.seller_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Ticket participants can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND owner = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id::text = split_part(name, '/', 1)
        AND (
          t.user_id = auth.uid()
          OR t.seller_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

CREATE POLICY "Uploaders or admins can delete support attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  );