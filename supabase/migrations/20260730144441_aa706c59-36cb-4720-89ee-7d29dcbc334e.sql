ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS commission_basis text NOT NULL DEFAULT 'purchase',
  ADD COLUMN IF NOT EXISTS commission_basis_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'program_request_items_commission_basis_check'
  ) THEN
    ALTER TABLE public.program_request_items
      ADD CONSTRAINT program_request_items_commission_basis_check
      CHECK (commission_basis IN ('purchase', 'sales'));
  END IF;
END $$;

ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS commission_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_exempt_reason text;

CREATE INDEX IF NOT EXISTS idx_ppi_partner_invoice_number
  ON public.partner_purchase_invoices (partner_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_pri_commission_basis
  ON public.program_request_items (commission_basis)
  WHERE commission_basis = 'sales';