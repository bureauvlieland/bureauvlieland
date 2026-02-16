CREATE POLICY "Admins can upload quote documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'quote-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update quote documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'quote-documents' AND is_admin(auth.uid()));