-- Fix partner-invoices storage: restrict read access to admins and own partner only

-- Drop the overly permissive read policy
DROP POLICY IF EXISTS "Partner invoices are readable" ON storage.objects;

-- Admins can read all invoices
CREATE POLICY "Admins can read partner invoices"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'partner-invoices'
  AND public.is_admin(auth.uid())
);

-- Partners can read only their own invoices (folder structure: {partner_id}/...)
CREATE POLICY "Partners can read own invoices"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'partner-invoices'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);

-- Drop the overly permissive upload policy
DROP POLICY IF EXISTS "Partner invoice uploads are allowed" ON storage.objects;

-- Admins can upload invoices to any folder
CREATE POLICY "Admins can upload partner invoices"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-invoices'
  AND public.is_admin(auth.uid())
);

-- Partners can upload to their own folder only
CREATE POLICY "Partners can upload own invoices"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-invoices'
  AND (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
);