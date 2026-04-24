-- ============ Tables ============

CREATE TABLE public.commission_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  partner_id text NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  recipient_name text NOT NULL,
  recipient_email text,
  recipient_address_street text,
  recipient_address_postal text,
  recipient_address_city text,
  recipient_kvk_number text,
  amount_excl_vat numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 21,
  vat_amount numeric NOT NULL DEFAULT 0,
  amount_incl_vat numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft | sent | forwarded | paid
  notes text,
  pdf_path text,
  sent_at timestamptz,
  sent_by uuid,
  forwarded_to_accounting_at timestamptz,
  forwarded_by uuid,
  paid_at timestamptz,
  paid_by uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_invoices_partner ON public.commission_invoices(partner_id);
CREATE INDEX idx_commission_invoices_status ON public.commission_invoices(status);
CREATE INDEX idx_commission_invoices_invoice_date ON public.commission_invoices(invoice_date DESC);

CREATE TABLE public.commission_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.commission_invoices(id) ON DELETE CASCADE,
  item_id uuid, -- ref to program_request_items
  quote_id uuid, -- ref to accommodation_quotes
  item_type text NOT NULL, -- 'activity' | 'accommodation'
  block_name text NOT NULL,
  customer_label text,
  event_date date,
  reference_number text, -- BV-/LOG- reference
  invoiced_amount_excl_vat numeric NOT NULL DEFAULT 0,
  commission_percentage numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_invoice_lines_invoice ON public.commission_invoice_lines(invoice_id);
CREATE INDEX idx_commission_invoice_lines_item ON public.commission_invoice_lines(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX idx_commission_invoice_lines_quote ON public.commission_invoice_lines(quote_id) WHERE quote_id IS NOT NULL;

-- ============ Triggers ============

-- Auto-generate invoice number BVC-YYMM-XXXX
CREATE OR REPLACE FUNCTION public.generate_commission_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  year_month text;
  next_seq int;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number <> '' THEN
    RETURN NEW;
  END IF;

  year_month := to_char(COALESCE(NEW.invoice_date, CURRENT_DATE), 'YYMM');

  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(SUBSTRING(invoice_number FROM 'BVC-' || year_month || '-(\d{4})'), '')
        AS integer
      )
    ), 0
  ) + 1 INTO next_seq
  FROM public.commission_invoices
  WHERE invoice_number LIKE 'BVC-' || year_month || '-%';

  NEW.invoice_number := 'BVC-' || year_month || '-' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_commission_invoices_number
BEFORE INSERT ON public.commission_invoices
FOR EACH ROW
EXECUTE FUNCTION public.generate_commission_invoice_number();

CREATE TRIGGER trg_commission_invoices_updated_at
BEFORE UPDATE ON public.commission_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============

ALTER TABLE public.commission_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view commission invoices"
ON public.commission_invoices FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert commission invoices"
ON public.commission_invoices FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update commission invoices"
ON public.commission_invoices FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete commission invoices"
ON public.commission_invoices FOR DELETE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view commission invoice lines"
ON public.commission_invoice_lines FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert commission invoice lines"
ON public.commission_invoice_lines FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update commission invoice lines"
ON public.commission_invoice_lines FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete commission invoice lines"
ON public.commission_invoice_lines FOR DELETE
USING (is_admin(auth.uid()));

-- ============ Storage bucket ============

INSERT INTO storage.buckets (id, name, public)
VALUES ('commission-invoices', 'commission-invoices', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read commission invoice files"
ON storage.objects FOR SELECT
USING (bucket_id = 'commission-invoices' AND is_admin(auth.uid()));

CREATE POLICY "Admins can upload commission invoice files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'commission-invoices' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update commission invoice files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'commission-invoices' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete commission invoice files"
ON storage.objects FOR DELETE
USING (bucket_id = 'commission-invoices' AND is_admin(auth.uid()));