-- 1) Extra kolommen op partner_purchase_invoices
ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS amount_mismatch_reason TEXT,
  ADD COLUMN IF NOT EXISTS pdf_total_incl_vat NUMERIC(10,2);

-- 2) Nieuwe tabel purchase_invoice_reconciliation_findings
CREATE TABLE IF NOT EXISTS public.purchase_invoice_reconciliation_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.partner_purchase_invoices(id) ON DELETE CASCADE,
  stored_incl NUMERIC(10,2) NOT NULL,
  pdf_incl_extracted NUMERIC(10,2),
  pdf_incl_candidates JSONB DEFAULT '[]'::jsonb,
  difference NUMERIC(10,2) NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  in_batch_id UUID REFERENCES public.payment_batches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT purchase_invoice_reconciliation_findings_status_check
    CHECK (status IN ('open','resolved','ignored')),
  CONSTRAINT purchase_invoice_reconciliation_findings_severity_check
    CHECK (severity IN ('info','warning','error'))
);

CREATE INDEX IF NOT EXISTS idx_pi_recon_findings_invoice
  ON public.purchase_invoice_reconciliation_findings(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pi_recon_findings_status
  ON public.purchase_invoice_reconciliation_findings(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoice_reconciliation_findings TO authenticated;
GRANT ALL ON public.purchase_invoice_reconciliation_findings TO service_role;

ALTER TABLE public.purchase_invoice_reconciliation_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view findings"
  ON public.purchase_invoice_reconciliation_findings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert findings"
  ON public.purchase_invoice_reconciliation_findings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update findings"
  ON public.purchase_invoice_reconciliation_findings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete findings"
  ON public.purchase_invoice_reconciliation_findings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_pi_recon_findings_updated_at
  ON public.purchase_invoice_reconciliation_findings;
CREATE TRIGGER update_pi_recon_findings_updated_at
  BEFORE UPDATE ON public.purchase_invoice_reconciliation_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();