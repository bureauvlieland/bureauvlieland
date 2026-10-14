-- Een partner kan van meerdere rekeningen incasseren of betalen (Rederij
-- Doeksen). partners.iban blijft het ene IBAN voor de SEPA-betaalbatches;
-- extra_ibans zijn de overige rekeningen, alleen gebruikt om bankregels te
-- herkennen (match-bank-lines, zie docs/incasso-inkoopfacturen.md).

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS extra_ibans text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.partners.extra_ibans IS
  'Overige rekeningnummers van de partner, naast iban (batches) en bank_iban (portaal). Alleen voor het herkennen van bankregels; nooit voor betalingen.';
