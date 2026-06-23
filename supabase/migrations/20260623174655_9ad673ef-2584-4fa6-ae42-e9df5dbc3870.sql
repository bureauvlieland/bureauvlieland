CREATE TABLE public.sales_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  attachment_path TEXT,
  attachment_filename TEXT,
  attachment_size INTEGER,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB,
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','scanning','scanned','failed')),
  scan_result JSONB,
  scan_error TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','processed','discarded')),
  processed_request_id UUID REFERENCES public.program_requests(id) ON DELETE SET NULL,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_sales_inbox_status ON public.sales_inbox(status);
CREATE INDEX idx_sales_inbox_created_at ON public.sales_inbox(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_inbox TO authenticated;
GRANT ALL ON public.sales_inbox TO service_role;

ALTER TABLE public.sales_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sales inbox"
  ON public.sales_inbox FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sales inbox"
  ON public.sales_inbox FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sales inbox"
  ON public.sales_inbox FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sales inbox"
  ON public.sales_inbox FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sales_inbox_updated_at
  BEFORE UPDATE ON public.sales_inbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();