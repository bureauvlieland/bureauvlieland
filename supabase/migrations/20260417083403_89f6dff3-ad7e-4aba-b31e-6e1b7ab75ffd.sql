
-- Inbox table for incoming purchase invoice emails
CREATE TABLE public.purchase_invoice_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  from_email text NOT NULL,
  from_name text,
  subject text,
  body_text text,
  attachment_path text,
  attachment_filename text,
  attachment_size integer,
  scan_result jsonb,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending','scanning','scanned','failed')),
  scan_error text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','processed','discarded')),
  processed_invoice_id uuid REFERENCES public.partner_purchase_invoices(id) ON DELETE SET NULL,
  processed_by uuid,
  processed_at timestamptz,
  notes text
);

CREATE INDEX idx_purchase_invoice_inbox_status ON public.purchase_invoice_inbox(status, created_at DESC);

ALTER TABLE public.purchase_invoice_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inbox"
ON public.purchase_invoice_inbox
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Service role can insert inbox"
ON public.purchase_invoice_inbox
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_purchase_invoice_inbox_updated_at
BEFORE UPDATE ON public.purchase_invoice_inbox
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
