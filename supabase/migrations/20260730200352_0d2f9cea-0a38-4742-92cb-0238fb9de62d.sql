ALTER TABLE public.commission_invoice_lines
  ADD COLUMN IF NOT EXISTS purchase_invoice_id uuid REFERENCES public.partner_purchase_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_basis text;

ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS commission_invoiced_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_invoice_id uuid REFERENCES public.commission_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commission_invoice_lines_purchase_invoice
  ON public.commission_invoice_lines (purchase_invoice_id)
  WHERE purchase_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ppi_commission_invoiced_at
  ON public.partner_purchase_invoices (commission_invoiced_at)
  WHERE commission_invoiced_at IS NOT NULL;