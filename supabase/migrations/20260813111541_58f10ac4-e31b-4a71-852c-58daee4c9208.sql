CREATE TABLE public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_slug text NOT NULL,
  booking_id bigint,
  payment_id text,
  status text NOT NULL,
  note text
);

GRANT ALL ON public.booking_events TO service_role;

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_booking_events_tenant_created ON public.booking_events (tenant_slug, created_at DESC);
CREATE INDEX idx_booking_events_booking_id ON public.booking_events (booking_id);