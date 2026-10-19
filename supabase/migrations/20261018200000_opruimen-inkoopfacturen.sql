-- Fase 4 van docs/plan-inkoopfacturen-doorbelasten.md: opruimen.
--
-- 1. bureau_invoices.vat_breakdown: de btw-uitsplitsing van een bureaufactuur
--    staat sinds fase 3 in bureau_invoice_lines; de jsonb-kolom werd nergens
--    meer gelezen.
-- 2. partner_purchase_invoice_ticket_matches: de Doeksen/Isla-route schrijft
--    sinds fase 2b per boeking een orderregel (purchase_invoice_lines, met
--    project, boekingsreferentie en afvaartdatum); de matchtabel werd gevuld
--    maar niet meer gelezen.

ALTER TABLE public.bureau_invoices DROP COLUMN IF EXISTS vat_breakdown;

DROP TABLE IF EXISTS public.partner_purchase_invoice_ticket_matches;
