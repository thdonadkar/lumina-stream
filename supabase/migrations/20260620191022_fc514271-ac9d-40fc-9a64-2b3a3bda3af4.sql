-- Block client-side notification inserts; only server (service role) can create notifications.
DROP POLICY IF EXISTS notif_self ON public.notifications;

CREATE POLICY notif_select_own
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY notif_update_own
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY notif_delete_own
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- No INSERT policy → all client inserts blocked. Server uses service role to bypass RLS.
CREATE POLICY notif_no_client_insert
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (false);