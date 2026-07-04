
-- Admin full access on storage.objects for this bucket
CREATE POLICY "Admins manage project-documents storage"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'project-documents' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'project-documents' AND public.is_admin(auth.uid()));
