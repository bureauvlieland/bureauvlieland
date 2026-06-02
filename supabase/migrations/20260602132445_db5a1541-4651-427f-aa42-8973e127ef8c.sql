
-- 1) Allow collective invoices (multi-project): request_id may be NULL
ALTER TABLE public.partner_purchase_invoices
  ALTER COLUMN request_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_collective boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_commission_excl_vat numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_commission_vat numeric DEFAULT 0;

-- 2) Match table: links each invoice line to a program_request_items (ticket) row
CREATE TABLE IF NOT EXISTS public.partner_purchase_invoice_ticket_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.partner_purchase_invoices(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.program_request_items(id) ON DELETE SET NULL,
  booking_reference text NOT NULL,
  customer_label text,
  departure_date date,
  route text,
  amount_excl_vat numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  amount_incl_vat numeric NOT NULL DEFAULT 0,
  tourist_tax numeric NOT NULL DEFAULT 0,
  supplier_commission numeric NOT NULL DEFAULT 0,
  match_status text NOT NULL DEFAULT 'unmatched',
  match_confidence numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_purchase_invoice_ticket_matches TO authenticated;
GRANT ALL ON public.partner_purchase_invoice_ticket_matches TO service_role;

ALTER TABLE public.partner_purchase_invoice_ticket_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ticket matches"
  ON public.partner_purchase_invoice_ticket_matches
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pp_inv_matches_invoice ON public.partner_purchase_invoice_ticket_matches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pp_inv_matches_item ON public.partner_purchase_invoice_ticket_matches(item_id);
CREATE INDEX IF NOT EXISTS idx_pp_inv_matches_booking_ref ON public.partner_purchase_invoice_ticket_matches(booking_reference);

-- 3) Optional reverse lookup column on program_request_items
ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS purchase_invoice_id uuid REFERENCES public.partner_purchase_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_invoice_matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_purchase_price numeric;
