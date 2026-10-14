-- Inkoopfacturen die de partner zelf incasseert (Rederij Doeksen).
--
-- Het vlagje partners.pays_by_direct_debit bestaat sinds 20260610 en houdt
-- die facturen uit de SEPA-betaalbatches, maar was nergens in de admin te
-- zetten. Nu: schakelaar op de partnerpagina, pill "Incasso" in het
-- inkoopfacturenoverzicht, en de bankmatching herkent een incasso op
-- partner-IBAN + bedrag (bruto, of bruto minus ingehouden commissie bij de
-- verzamelfactuur overtochten). Zie docs/incasso-inkoopfacturen.md.

UPDATE public.partners
   SET pays_by_direct_debit = true
 WHERE pays_by_direct_debit = false
   AND name ILIKE '%doeksen%';

COMMENT ON COLUMN public.partners.pays_by_direct_debit IS
  'Partner int zelf via automatische incasso (bijv. Rederij Doeksen): nooit in SEPA-betaalbatches; inkoopfactuur gaat op betaald via de bankmatching (IBAN + bedrag, zie match-bank-lines).';
