-- 1. Add commission percentage to accommodation_quote_extras
ALTER TABLE accommodation_quote_extras 
ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 15;

COMMENT ON COLUMN accommodation_quote_extras.commission_percentage IS 
'Commissiepercentage voor deze extra (standaard 15%, aanpasbaar door admin)';

-- 2. Create partner extra presets table for reusable templates
CREATE TABLE partner_extra_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  pricing_type TEXT NOT NULL DEFAULT 'per_person' 
    CHECK (pricing_type IN ('per_person', 'fixed')),
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate DECIMAL(4,2) DEFAULT 9,
  category TEXT CHECK (category IN ('fb', 'facilities', 'transport', 'other')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by partner
CREATE INDEX idx_partner_extra_presets_partner ON partner_extra_presets(partner_id);

-- Enable RLS
ALTER TABLE partner_extra_presets ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own presets
CREATE POLICY "Partners manage own presets" ON partner_extra_presets
  FOR ALL USING (
    partner_id = public.get_partner_id(auth.uid())
  );

-- Admin has full access
CREATE POLICY "Admin full access presets" ON partner_extra_presets
  FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_partner_extra_presets_updated_at
  BEFORE UPDATE ON partner_extra_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();