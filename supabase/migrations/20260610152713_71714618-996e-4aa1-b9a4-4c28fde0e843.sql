
-- Partners: derde commissiepercentage voor extras (F&B, faciliteiten, transport, overig)
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS extras_commission_percentage numeric NULL;

COMMENT ON COLUMN public.partners.extras_commission_percentage IS
  'Commissie over hotel-extras (F&B, faciliteiten, transport, overig). NULL = fallback naar accommodation_commission_percentage.';

-- Accommodation quotes: snapshot van oorspronkelijke prijs + koppeling naar inkoopfactuur
ALTER TABLE public.accommodation_quotes
  ADD COLUMN IF NOT EXISTS purchase_room_cost_incl_vat numeric NULL,
  ADD COLUMN IF NOT EXISTS purchase_invoice_id uuid NULL;

COMMENT ON COLUMN public.accommodation_quotes.purchase_room_cost_incl_vat IS
  'Oorspronkelijke price_total van de offerte voordat deze door een inkoopfactuur werd overschreven (audit).';
COMMENT ON COLUMN public.accommodation_quotes.purchase_invoice_id IS
  'Inkoopfactuur die deze offerte heeft overschreven (FK partner_purchase_invoices.id).';

-- Accommodation quote extras: herkomst en koppeling naar de inkoopfactuur-bron
ALTER TABLE public.accommodation_quote_extras
  ADD COLUMN IF NOT EXISTS source text NULL,
  ADD COLUMN IF NOT EXISTS source_invoice_id uuid NULL;

COMMENT ON COLUMN public.accommodation_quote_extras.source IS
  'Herkomst van deze extra: partner_quote (offerte van partner) of purchase_invoice (overgenomen uit inkoopfactuur).';
COMMENT ON COLUMN public.accommodation_quote_extras.source_invoice_id IS
  'Inkoopfactuur waaruit deze extra is overgenomen (FK partner_purchase_invoices.id).';
