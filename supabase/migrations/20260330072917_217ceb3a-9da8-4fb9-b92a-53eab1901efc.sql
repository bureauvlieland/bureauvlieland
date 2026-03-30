
-- Add new profile columns to partners table
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS about_text text,
  ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_lat numeric,
  ADD COLUMN IF NOT EXISTS location_lng numeric,
  ADD COLUMN IF NOT EXISTS location_description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS highlight_features jsonb DEFAULT '[]'::jsonb;

-- Create public storage bucket for partner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-images', 'partner-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Anyone can read partner images (public bucket)
CREATE POLICY "Public can read partner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-images');

-- RLS: Partners can upload to their own folder
CREATE POLICY "Partners can upload own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'partner-images'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);

-- RLS: Partners can delete their own images
CREATE POLICY "Partners can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'partner-images'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);

-- RLS: Admins can manage all partner images
CREATE POLICY "Admins can manage partner images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'partner-images'
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'partner-images'
  AND public.is_admin(auth.uid())
);
