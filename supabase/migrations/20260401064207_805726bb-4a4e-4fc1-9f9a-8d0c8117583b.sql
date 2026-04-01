
-- Create storage bucket for accommodation quote attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('accommodation-quote-attachments', 'accommodation-quote-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Partners can upload files to their own folder
CREATE POLICY "Partners can upload own attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'accommodation-quote-attachments'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);

-- Partners can read their own attachments
CREATE POLICY "Partners can read own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'accommodation-quote-attachments'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);

-- Partners can overwrite/delete their own files
CREATE POLICY "Partners can update own attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'accommodation-quote-attachments'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);

CREATE POLICY "Partners can delete own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'accommodation-quote-attachments'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);

-- Admins can do everything
CREATE POLICY "Admins can manage all quote attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'accommodation-quote-attachments'
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'accommodation-quote-attachments'
  AND public.is_admin(auth.uid())
);

-- Public can read all attachments (bucket is public, so URLs work for customers)
CREATE POLICY "Public can read quote attachments"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'accommodation-quote-attachments'
);

-- Add quote_attachment_path to history table so we track document versions
ALTER TABLE public.accommodation_quote_history 
ADD COLUMN IF NOT EXISTS quote_attachment_path text,
ADD COLUMN IF NOT EXISTS quote_attachment_filename text;
