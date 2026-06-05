CREATE UNIQUE INDEX IF NOT EXISTS partner_purchase_invoices_partner_invoicenr_norm_idx
  ON public.partner_purchase_invoices (partner_id, upper(regexp_replace(invoice_number, '[\s\-_.]', '', 'g')))
  WHERE invoice_number IS NOT NULL
    AND invoice_number <> ''
    AND created_at > '2026-06-05 23:00:00+00';