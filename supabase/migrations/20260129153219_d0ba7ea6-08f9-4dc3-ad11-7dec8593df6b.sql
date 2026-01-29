-- Create partner_unavailability table for blocking periods
CREATE TABLE public.partner_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS
ALTER TABLE public.partner_unavailability ENABLE ROW LEVEL SECURITY;

-- Partners can view their own unavailability
CREATE POLICY "Partners can view own unavailability"
ON public.partner_unavailability
FOR SELECT
USING (partner_id = public.get_partner_id(auth.uid()));

-- Partners can insert their own unavailability
CREATE POLICY "Partners can insert own unavailability"
ON public.partner_unavailability
FOR INSERT
WITH CHECK (partner_id = public.get_partner_id(auth.uid()));

-- Partners can update their own unavailability
CREATE POLICY "Partners can update own unavailability"
ON public.partner_unavailability
FOR UPDATE
USING (partner_id = public.get_partner_id(auth.uid()));

-- Partners can delete their own unavailability
CREATE POLICY "Partners can delete own unavailability"
ON public.partner_unavailability
FOR DELETE
USING (partner_id = public.get_partner_id(auth.uid()));

-- Admins can view all unavailability
CREATE POLICY "Admins can view all unavailability"
ON public.partner_unavailability
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Create index for efficient queries
CREATE INDEX idx_partner_unavailability_partner_id ON public.partner_unavailability(partner_id);
CREATE INDEX idx_partner_unavailability_dates ON public.partner_unavailability(start_date, end_date);

-- Add updated_at trigger
CREATE TRIGGER update_partner_unavailability_updated_at
  BEFORE UPDATE ON public.partner_unavailability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();