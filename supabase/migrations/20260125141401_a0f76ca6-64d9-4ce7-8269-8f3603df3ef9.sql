-- Create enums for building blocks
CREATE TYPE building_block_category AS ENUM ('activiteiten', 'catering', 'vervoer');
CREATE TYPE building_block_type AS ENUM ('bureau', 'partner', 'self_arranged');
CREATE TYPE building_block_price_type AS ENUM ('per_person', 'total', 'per_hour', 'per_day', 'on_request');

-- Create building_blocks table
CREATE TABLE public.building_blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  
  -- Categorization
  category building_block_category NOT NULL,
  block_type building_block_type NOT NULL DEFAULT 'partner',
  
  -- Partner link
  provider_id TEXT REFERENCES public.partners(id) ON DELETE SET NULL,
  
  -- Capacity
  min_people INTEGER,
  max_people INTEGER,
  duration TEXT,
  
  -- Pricing - Adult
  price_adult NUMERIC(10,2),
  price_adult_note TEXT,
  price_type building_block_price_type DEFAULT 'per_person',
  
  -- Pricing - Child
  price_child NUMERIC(10,2),
  price_child_note TEXT,
  price_child_min_age INTEGER DEFAULT 4,
  price_child_max_age INTEGER DEFAULT 12,
  
  -- Pricing - Pet
  price_pet NUMERIC(10,2),
  price_pet_note TEXT,
  
  -- Pricing - Display options
  is_from_price BOOLEAN DEFAULT false,
  price_display_override TEXT,
  price_extras JSONB DEFAULT '{}',
  
  -- Self-arranged specific
  external_url TEXT,
  
  -- Images
  image_url TEXT,
  image_asset TEXT,
  
  -- Publication status
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Extra metadata
  tags TEXT[],
  seasonal_notes TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.building_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Published blocks are publicly readable"
  ON public.building_blocks FOR SELECT
  USING (is_published = true AND is_active = true);

CREATE POLICY "Admins can view all blocks"
  ON public.building_blocks FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert blocks"
  ON public.building_blocks FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update blocks"
  ON public.building_blocks FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete blocks"
  ON public.building_blocks FOR DELETE
  USING (is_admin(auth.uid()));

CREATE POLICY "Partners can view their own blocks"
  ON public.building_blocks FOR SELECT
  USING (provider_id = get_partner_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_building_blocks_updated_at
  BEFORE UPDATE ON public.building_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for building block images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('building-block-images', 'building-block-images', true);

-- Storage policies
CREATE POLICY "Building block images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'building-block-images');

CREATE POLICY "Admins can upload building block images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'building-block-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update building block images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'building-block-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete building block images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'building-block-images' AND is_admin(auth.uid()));