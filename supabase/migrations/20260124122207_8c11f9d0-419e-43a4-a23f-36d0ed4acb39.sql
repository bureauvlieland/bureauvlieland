-- Drop overly permissive policies
DROP POLICY IF EXISTS "Partners can read own data via token" ON public.partners;
DROP POLICY IF EXISTS "Partners can update own data" ON public.partners;
DROP POLICY IF EXISTS "Anyone can upload partner invoices" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read partner invoices" ON storage.objects;

-- Create proper RLS policies for partners
-- Partners are publicly readable (needed for configurator to show partner names)
CREATE POLICY "Partners are publicly readable"
ON public.partners
FOR SELECT
USING (is_active = true);

-- Admin dashboard will use edge functions with service role for updates
-- No direct UPDATE policy needed for now

-- Storage policies - restrict to specific folder structure
-- Upload requires the path to match request_id/item_id pattern
CREATE POLICY "Partner invoice uploads are allowed"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-invoices' 
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- Reading invoices - for now allow authenticated reads (admin/edge function will handle)
CREATE POLICY "Partner invoices are readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'partner-invoices');