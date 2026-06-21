
ALTER TABLE public.bureau_invoices ADD COLUMN IF NOT EXISTS pdf_path text;

CREATE POLICY "Admins read bureau-invoice PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'bureau-invoices' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert bureau-invoice PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'bureau-invoices' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update bureau-invoice PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'bureau-invoices' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'bureau-invoices' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete bureau-invoice PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'bureau-invoices' AND public.has_role(auth.uid(), 'admin'));
