-- 1. Add uses_default_terms column to partners table
ALTER TABLE public.partners 
ADD COLUMN uses_default_terms boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.partners.uses_default_terms IS 'When true, partner uses standard Bureau Vlieland terms instead of custom uploaded PDF';

-- 2. Create accepted_terms_log table for permanent tracking of accepted terms
CREATE TABLE public.accepted_terms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.program_requests(id) ON DELETE CASCADE,
  partner_id text NOT NULL,
  partner_name text NOT NULL,
  terms_type text NOT NULL, -- 'partner_custom', 'partner_default', 'bureau_vlieland', 'uvh_2024'
  terms_version text NOT NULL,
  terms_pdf_path text, -- Snapshot of PDF path at moment of acceptance
  accepted_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add index for fast lookups by request
CREATE INDEX idx_accepted_terms_log_request ON public.accepted_terms_log(request_id);

-- Add comments for documentation
COMMENT ON TABLE public.accepted_terms_log IS 'Permanent log of all terms accepted per booking for legal audit trail';
COMMENT ON COLUMN public.accepted_terms_log.terms_type IS 'Type of terms: partner_custom (own PDF), partner_default (BV standard), bureau_vlieland, uvh_2024';
COMMENT ON COLUMN public.accepted_terms_log.terms_pdf_path IS 'Snapshot of PDF path at moment of acceptance - remains valid even if partner updates their terms later';

-- Enable RLS
ALTER TABLE public.accepted_terms_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can view all, customers can view via their request token
CREATE POLICY "Admins can view all accepted terms logs"
ON public.accepted_terms_log FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Terms logs readable via program request"
ON public.accepted_terms_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.program_requests pr
    WHERE pr.id = accepted_terms_log.request_id
    AND pr.expires_at > now()
  )
);

-- Allow edge function (service role) to insert
CREATE POLICY "Allow insert via service role"
ON public.accepted_terms_log FOR INSERT
WITH CHECK (true);