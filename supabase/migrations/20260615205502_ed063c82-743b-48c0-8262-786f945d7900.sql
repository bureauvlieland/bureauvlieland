ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS awaiting_customer_for_partner_send boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.program_request_items.awaiting_customer_for_partner_send IS
  'Admin-intentie: dit item wacht expliciet op klantgoedkeuring voordat de partner-aanvraag uitgaat. Bij klantgoedkeuring wordt de partner automatisch geïnformeerd en wordt deze vlag gereset.';

CREATE INDEX IF NOT EXISTS idx_pri_awaiting_customer
  ON public.program_request_items (awaiting_customer_for_partner_send)
  WHERE awaiting_customer_for_partner_send = true;