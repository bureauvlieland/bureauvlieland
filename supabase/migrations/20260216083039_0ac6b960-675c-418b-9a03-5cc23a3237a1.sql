
-- Add quote_pdf_path column to program_requests
ALTER TABLE program_requests ADD COLUMN quote_pdf_path text;

-- Create private storage bucket for quote documents
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-documents', 'quote-documents', false);

-- RLS: admins can read quote documents
CREATE POLICY "Admins can read quote documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-documents' AND public.is_admin(auth.uid()));

-- RLS: service role can manage quote documents
CREATE POLICY "Service role can manage quote documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'quote-documents' AND auth.role() = 'service_role');
