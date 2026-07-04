
-- 1) Guest details on accommodation_requests
ALTER TABLE public.accommodation_requests
  ADD COLUMN IF NOT EXISTS guest_names text,
  ADD COLUMN IF NOT EXISTS dietary_notes text;

-- 2) Helper function: partner can view a program request
CREATE OR REPLACE FUNCTION public.partner_can_view_program_request(_user_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.program_request_items i
    WHERE i.request_id = _request_id
      AND i.provider_id = public.get_partner_id(_user_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.accommodation_requests ar
    JOIN public.accommodation_quotes aq ON aq.request_id = ar.id
    WHERE ar.linked_program_id = _request_id
      AND aq.partner_id = public.get_partner_id(_user_id)
  );
$$;

-- 3) project_documents table
CREATE TABLE IF NOT EXISTS public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_request_id uuid REFERENCES public.program_requests(id) ON DELETE CASCADE,
  accommodation_request_id uuid REFERENCES public.accommodation_requests(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('project','accommodation')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  label text,
  description text,
  uploaded_by text NOT NULL CHECK (uploaded_by IN ('admin','customer','partner')),
  uploaded_by_user_id uuid,
  uploaded_by_partner_id text,
  uploaded_by_name text,
  is_visible_to_partners boolean NOT NULL DEFAULT true,
  is_visible_to_customer boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_documents_one_scope CHECK (
    (program_request_id IS NOT NULL AND accommodation_request_id IS NULL)
    OR (program_request_id IS NULL AND accommodation_request_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_project_documents_program ON public.project_documents(program_request_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_accommodation ON public.project_documents(accommodation_request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
GRANT ALL ON public.project_documents TO service_role;

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage project_documents"
  ON public.project_documents
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Partners: read visible docs for projects they work on
CREATE POLICY "Partners view relevant project_documents"
  ON public.project_documents
  FOR SELECT
  TO authenticated
  USING (
    is_visible_to_partners = true
    AND public.is_partner(auth.uid())
    AND (
      (program_request_id IS NOT NULL AND public.partner_can_view_program_request(auth.uid(), program_request_id))
      OR (accommodation_request_id IS NOT NULL AND public.partner_can_view_accommodation_request(auth.uid(), accommodation_request_id))
    )
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER trg_project_documents_updated_at
  BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
