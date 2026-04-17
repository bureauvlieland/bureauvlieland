ALTER TABLE public.bureau_invoices
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS forwarded_to_accounting_at timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_by uuid;

COMMENT ON COLUMN public.bureau_invoices.status IS 'pending | forwarded | paid';