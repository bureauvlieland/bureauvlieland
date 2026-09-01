CREATE TABLE IF NOT EXISTS public.email_webhook_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  authorized boolean NOT NULL,
  reason text NOT NULL,
  event_count integer NOT NULL DEFAULT 0,
  source_ip text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_email_webhook_attempts_received
  ON public.email_webhook_attempts (received_at DESC);

GRANT SELECT ON public.email_webhook_attempts TO authenticated;
GRANT ALL ON public.email_webhook_attempts TO service_role;

ALTER TABLE public.email_webhook_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read webhook attempts" ON public.email_webhook_attempts;
CREATE POLICY "Admins can read webhook attempts"
ON public.email_webhook_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  PERFORM cron.unschedule('email-webhook-heartbeat-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'email-webhook-heartbeat-daily',
  '15 6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://blhspuifehausilnzwio.supabase.co/functions/v1/email-webhook-heartbeat',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsaHNwdWlmZWhhdXNpbG56d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMTM0NDAsImV4cCI6MjA3ODg4OTQ0MH0.shiugYb4lLf9KHksbfLx5bZYgtvfoGPSoWUyl3dONRI"}'::jsonb,
    body := '{"triggeredBy":"cron"}'::jsonb
  );
  $cron$
);