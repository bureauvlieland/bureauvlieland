-- Allocations table: split one purchase invoice across multiple program items
CREATE TABLE public.partner_purchase_invoice_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.partner_purchase_invoices(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.program_request_items(id) ON DELETE CASCADE,
  amount_excl_vat numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 21,
  vat_amount numeric NOT NULL DEFAULT 0,
  amount_incl_vat numeric NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, item_id)
);

CREATE INDEX idx_ppia_invoice_id ON public.partner_purchase_invoice_allocations(invoice_id);
CREATE INDEX idx_ppia_item_id ON public.partner_purchase_invoice_allocations(item_id);

ALTER TABLE public.partner_purchase_invoice_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage allocations"
ON public.partner_purchase_invoice_allocations
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Partners can view allocations of own invoices"
ON public.partner_purchase_invoice_allocations
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.partner_purchase_invoices ppi
  WHERE ppi.id = partner_purchase_invoice_allocations.invoice_id
    AND ppi.partner_id = get_partner_id(auth.uid())
));

CREATE TRIGGER update_ppia_updated_at
BEFORE UPDATE ON public.partner_purchase_invoice_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
