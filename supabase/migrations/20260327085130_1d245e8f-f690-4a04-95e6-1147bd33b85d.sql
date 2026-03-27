
-- Create accommodation_quote_history table for version tracking
CREATE TABLE public.accommodation_quote_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.accommodation_quotes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  price_total NUMERIC,
  price_per_person_per_night NUMERIC,
  room_configuration JSONB,
  includes JSONB,
  conditions TEXT,
  description TEXT,
  number_of_guests INTEGER,
  submitted_at TIMESTAMPTZ,
  selected_at TIMESTAMPTZ,
  forwarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accommodation_quote_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can manage quote history"
  ON public.accommodation_quote_history
  FOR ALL
  TO public
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert quote history"
  ON public.accommodation_quote_history
  FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role');
