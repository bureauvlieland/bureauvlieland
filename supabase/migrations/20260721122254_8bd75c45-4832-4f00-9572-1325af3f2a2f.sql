-- 1) Refund tracking kolommen
ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS refund_pending_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_reason text;

-- 2) Data-fix voor bekende duplicaat T-261008
SET LOCAL session_replication_role = replica;
UPDATE public.partner_purchase_invoices
   SET refund_pending_at = now(),
       refund_reason = 'Dubbele registratie T-261008 — betaald via BATCH-2607-0001, terug te vorderen bij Zuiver Traiteur',
       paid_at = coalesce(paid_at, now())
 WHERE id = 'f07d8390-2f26-4a58-8c79-8d2494692b2f'
   AND refund_pending_at IS NULL;
SET LOCAL session_replication_role = origin;

-- 3) Generated column met genormaliseerd factuurnummer
ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS invoice_number_normalized text
  GENERATED ALWAYS AS (
    upper(regexp_replace(coalesce(invoice_number, ''), '[\s\-_.]', '', 'g'))
  ) STORED;

-- 4) Unieke index — partner + factuurnummer + bedrag incl. BTW.
--    Bedrag meenemen zodat legitieme herhaalfacturen (voorschot + eindfactuur onder
--    hetzelfde referentienummer) mogelijk blijven; identieke duplicaten worden geblokkeerd.
CREATE UNIQUE INDEX IF NOT EXISTS ppi_partner_invnr_amount_unique
  ON public.partner_purchase_invoices (partner_id, invoice_number_normalized, amount_incl_vat)
  WHERE invoice_number IS NOT NULL
    AND invoice_number_normalized <> ''
    AND refund_pending_at IS NULL;