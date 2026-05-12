
ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS booking_reference text,
  ADD COLUMN IF NOT EXISTS booking_document_path text,
  ADD COLUMN IF NOT EXISTS booking_group_id uuid,
  ADD COLUMN IF NOT EXISTS ticket_last_emailed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_program_request_items_booking_group
  ON public.program_request_items(booking_group_id)
  WHERE booking_group_id IS NOT NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-documents', 'ticket-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read ticket documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ticket-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can upload ticket documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update ticket documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ticket-documents' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete ticket documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-documents' AND public.is_admin(auth.uid()));
