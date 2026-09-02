CREATE TABLE public.email_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  message_id text,
  recipient_email text,
  event_time timestamptz,
  matched boolean NOT NULL DEFAULT false,
  match_reason text NOT NULL,
  matched_row_count integer NOT NULL DEFAULT 0,
  payload jsonb
);

CREATE INDEX idx_email_webhook_events_received_at ON public.email_webhook_events (received_at DESC);
CREATE INDEX idx_email_webhook_events_matched ON public.email_webhook_events (matched, received_at DESC);
CREATE INDEX idx_email_webhook_events_message_id ON public.email_webhook_events (message_id);

GRANT SELECT ON public.email_webhook_events TO authenticated;
GRANT ALL ON public.email_webhook_events TO service_role;

ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins kunnen webhook-events bekijken"
ON public.email_webhook_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));