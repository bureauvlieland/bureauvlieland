ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS pays_by_direct_debit boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.partners.pays_by_direct_debit IS 'Partner int zelf via automatische incasso; nooit opnemen in SEPA-betaalbatches (bijv. Rederij Doeksen).';