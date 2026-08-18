DROP POLICY IF EXISTS "Partner terms are publicly readable" ON storage.objects;

CREATE POLICY "Partner terms readable by owner or admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'partner-terms'
  AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.get_partner_id(auth.uid())
  )
);