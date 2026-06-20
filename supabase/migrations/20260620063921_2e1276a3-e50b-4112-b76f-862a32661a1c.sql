CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Idempotent schedule: unschedule by name if it exists, then (re)create.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-notifications') THEN
    PERFORM cron.unschedule('cleanup-old-notifications');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-old-notifications',
  '15 3 * * *',  -- daily at 03:15 UTC
  $$
    DELETE FROM public.notifications
    WHERE is_read = true
      AND created_at < now() - interval '90 days';
  $$
);
