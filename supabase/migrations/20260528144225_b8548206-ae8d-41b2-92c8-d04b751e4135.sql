
-- Bank statement uploads (CAMT.053)
CREATE TABLE public.bank_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  file_name text,
  iban text,
  account_name text,
  statement_date date,
  opening_balance numeric,
  closing_balance numeric,
  currency text DEFAULT 'EUR',
  line_count int DEFAULT 0,
  matched_count int DEFAULT 0,
  raw_message_id text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statements TO authenticated;
GRANT ALL ON public.bank_statements TO service_role;

ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bank_statements"
  ON public.bank_statements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER bank_statements_set_updated_at
  BEFORE UPDATE ON public.bank_statements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Individual transaction lines
CREATE TABLE public.bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  booking_date date,
  value_date date,
  amount numeric NOT NULL, -- negative = outgoing
  currency text DEFAULT 'EUR',
  direction text NOT NULL CHECK (direction IN ('in','out')),
  counterparty_name text,
  counterparty_iban text,
  description text,
  end_to_end_id text,
  remittance_info text,
  status text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched','suggested','ambiguous','confirmed','ignored')),
  matched_invoice_type text CHECK (matched_invoice_type IN ('sales','purchase','batch')),
  matched_invoice_id uuid,
  confidence numeric,
  suggestions jsonb DEFAULT '[]'::jsonb,
  confirmed_by uuid,
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_lines_statement ON public.bank_statement_lines(statement_id);
CREATE INDEX idx_bank_lines_status ON public.bank_statement_lines(status);
CREATE INDEX idx_bank_lines_matched ON public.bank_statement_lines(matched_invoice_type, matched_invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_lines TO authenticated;
GRANT ALL ON public.bank_statement_lines TO service_role;

ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bank_statement_lines"
  ON public.bank_statement_lines FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER bank_statement_lines_set_updated_at
  BEFORE UPDATE ON public.bank_statement_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link columns on existing invoice tables
ALTER TABLE public.bureau_invoices ADD COLUMN IF NOT EXISTS bank_line_id uuid REFERENCES public.bank_statement_lines(id) ON DELETE SET NULL;
ALTER TABLE public.partner_purchase_invoices ADD COLUMN IF NOT EXISTS bank_line_id uuid REFERENCES public.bank_statement_lines(id) ON DELETE SET NULL;
ALTER TABLE public.payment_batches ADD COLUMN IF NOT EXISTS bank_line_id uuid REFERENCES public.bank_statement_lines(id) ON DELETE SET NULL;

-- Private storage bucket for the raw CAMT XML files
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-statements', 'bank-statements', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read bank-statements"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bank-statements' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins upload bank-statements"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bank-statements' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete bank-statements"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bank-statements' AND public.is_admin(auth.uid()));
