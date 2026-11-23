-- Projecttotaal ook uit een geregistreerde proforma.
--
-- Fase 3 (20261120120000) schreef program_requests.invoice_spec_total_incl_vat
-- alleen zolang de proforma in concept stond. Na registreren liet de database
-- het totaal staan, maar de facturatiepagina las dan geen proforma meer en
-- schreef de oude berekening over het programma terug: die telt vervangen en
-- weggelaten offerteregels mee. Zo kwam bij BV-2606-0013 en BV-2608-0002 een
-- "restant" tevoorschijn dat op de eindfactuur niet bestaat, en sprong de
-- voltooiingsstatus terug naar gedeeltelijk gefactureerd.
--
-- Voortaan: bestaat er een proforma (concept gaat voor, anders de nieuwste
-- geregistreerde), dan is haar som van actieve regels het projecttotaal.
-- De app schrijft bij zo'n project niets meer.

CREATE OR REPLACE FUNCTION public.sync_invoice_spec_total_from_proforma(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proforma_id uuid;
  v_total numeric;
BEGIN
  SELECT p.id
    INTO v_proforma_id
    FROM public.project_proformas p
   WHERE p.request_id = p_request_id
     AND p.status IN ('concept', 'registered')
   ORDER BY (p.status = 'concept') DESC, p.created_at DESC
   LIMIT 1;

  -- Zonder proforma laat de database het totaal staan; dan schrijft de app.
  IF v_proforma_id IS NULL THEN
    RETURN;
  END IF;

  SELECT ROUND(COALESCE(SUM(pl.amount_incl_vat), 0), 2)
    INTO v_total
    FROM public.project_proforma_lines pl
   WHERE pl.proforma_id = v_proforma_id
     AND pl.line_status = 'active'
     AND pl.kind <> 'item_group';

  UPDATE public.program_requests
     SET invoice_spec_total_incl_vat = v_total,
         invoice_spec_updated_at = now()
   WHERE id = p_request_id
     AND invoice_spec_total_incl_vat IS DISTINCT FROM v_total;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_invoice_spec_total_from_proforma(uuid) FROM public, anon, authenticated;

-- Correctie: elk project met een proforma krijgt het proformatotaal terug.
-- De bestaande trigger op invoice_spec_total_incl_vat herrekent daarna de
-- voltooiingsstatus (gedeeltelijk gefactureerd wordt weer afgerond waar de
-- eindfactuur het hele bedrag dekt).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT request_id FROM public.project_proformas WHERE status IN ('concept', 'registered') LOOP
    PERFORM public.sync_invoice_spec_total_from_proforma(r.request_id);
  END LOOP;
END $$;
