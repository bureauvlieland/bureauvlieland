-- Add signature columns to program_requests for digital signature
ALTER TABLE public.program_requests
ADD COLUMN IF NOT EXISTS signature_name text,
ADD COLUMN IF NOT EXISTS signature_ip text,
ADD COLUMN IF NOT EXISTS signature_user_agent text,
ADD COLUMN IF NOT EXISTS signature_id text;

-- Add terms columns to partners for PDF upload
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS terms_pdf_path text,
ADD COLUMN IF NOT EXISTS terms_uploaded_at timestamp with time zone;

-- Create storage bucket for partner terms PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-terms', 'partner-terms', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Partners can upload their own terms
CREATE POLICY "Partners can upload own terms"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'partner-terms' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_partner_id(auth.uid())
);

-- RLS policy: Partners can update their own terms
CREATE POLICY "Partners can update own terms"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'partner-terms'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_partner_id(auth.uid())
);

-- RLS policy: Partners can delete their own terms
CREATE POLICY "Partners can delete own terms"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'partner-terms'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_partner_id(auth.uid())
);

-- RLS policy: Anyone can read partner terms (public bucket)
CREATE POLICY "Partner terms are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-terms');