-- Nieuwe tabel voor quote extras
CREATE TABLE public.accommodation_quote_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.accommodation_quotes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'per_person' 
    CHECK (pricing_type IN ('per_person', 'fixed')),
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate DECIMAL(4,2) DEFAULT 9,
  category TEXT CHECK (category IN ('fb', 'facilities', 'transport', 'other')),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index voor snelle lookups
CREATE INDEX idx_quote_extras_quote_id ON public.accommodation_quote_extras(quote_id);

-- RLS
ALTER TABLE public.accommodation_quote_extras ENABLE ROW LEVEL SECURITY;

-- Partners kunnen extra's beheren via hun quotes
CREATE POLICY "Partners manage own quote extras" ON public.accommodation_quote_extras
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.accommodation_quotes q
      JOIN public.partners p ON p.id = q.partner_id
      WHERE q.id = quote_id
      AND p.auth_user_id = auth.uid()
    )
  );

-- Admin heeft volledige toegang
CREATE POLICY "Admin full access quote extras" ON public.accommodation_quote_extras
  FOR ALL USING (public.is_admin(auth.uid()));

-- Klanten kunnen extras lezen van submitted quotes
CREATE POLICY "Customers read submitted quote extras" ON public.accommodation_quote_extras
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.accommodation_quotes q
      JOIN public.accommodation_requests r ON r.id = q.request_id
      WHERE q.id = quote_id
      AND q.status IN ('submitted', 'selected')
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_accommodation_quote_extras_updated_at
  BEFORE UPDATE ON public.accommodation_quote_extras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();