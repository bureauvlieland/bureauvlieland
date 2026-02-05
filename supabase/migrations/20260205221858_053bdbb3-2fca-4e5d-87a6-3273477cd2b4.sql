-- Create partner_room_types table for room configuration presets
CREATE TABLE public.partner_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Specifications
  size_sqm INTEGER,
  bed_configuration TEXT,
  max_occupancy INTEGER DEFAULT 2,
  
  -- Facilities as array
  facilities TEXT[] DEFAULT '{}',
  
  -- Photos
  images JSONB DEFAULT '[]',
  
  -- Pricing
  price_per_night NUMERIC(10,2),
  price_includes_vat BOOLEAN DEFAULT true,
  vat_rate NUMERIC(4,2) DEFAULT 9,
  
  -- Meta
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for partner lookup
CREATE INDEX idx_partner_room_types_partner ON public.partner_room_types(partner_id);

-- Enable RLS
ALTER TABLE public.partner_room_types ENABLE ROW LEVEL SECURITY;

-- Partners can manage their own room types
CREATE POLICY "Partners manage own room types" ON public.partner_room_types
  FOR ALL USING (partner_id = public.get_partner_id(auth.uid()));

-- Admins have full access
CREATE POLICY "Admin full access room types" ON public.partner_room_types
  FOR ALL USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_partner_room_types_updated_at
  BEFORE UPDATE ON public.partner_room_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();