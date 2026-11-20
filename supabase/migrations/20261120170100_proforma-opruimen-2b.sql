-- Database-opruiming na docs/plan-proforma-factuur.md, stap 2b.
--
-- Poort: zijn er nog klantregels op een project zonder proforma, dan stopt
-- deze migratie met een melding die de projecten noemt. Projecten met
-- akkoord krijgen een proforma via "Proforma's aanmaken" op de
-- facturatiepagina (dat zet de klantregels over); draai de workflow
-- "Deploy Supabase" daarna opnieuw. Projecten zonder akkoord met
-- klantregels zijn een uitzondering die met de hand bekeken moet worden.
DO $$
DECLARE
  v_count int;
  v_refs text;
BEGIN
  SELECT COUNT(*), string_agg(DISTINCT COALESCE(pr.reference_number, pr.id::text), ', ')
    INTO v_count, v_refs
    FROM public.program_item_billing_lines l
    JOIN public.program_request_items i ON i.id = l.item_id
    JOIN public.program_requests pr ON pr.id = i.request_id
   WHERE NOT EXISTS (SELECT 1 FROM public.project_proformas p WHERE p.request_id = pr.id);
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Opruiming stap 2b gestopt: % klantregel(s) op projecten zonder proforma (%). Maak eerst proforma''s aan via de facturatiepagina en draai de deploy opnieuw.', v_count, v_refs;
  END IF;
END $$;

DROP TABLE IF EXISTS public.program_item_billing_lines;
