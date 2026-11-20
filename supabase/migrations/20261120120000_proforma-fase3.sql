-- Fase 3 van docs/plan-proforma-factuur.md: alles leest de proforma.
--
-- Het projecttotaal (program_requests.invoice_spec_total_incl_vat) komt bij
-- een project met een proforma in concept uit de actieve proformaregels, en
-- wel in de database zelf: elke wijziging aan de regels of aan de kop
-- schrijft het totaal, en de bestaande trigger trg_invoice_spec_total_changed
-- herrekent daarna de voltooiingsstatus. Zo klopt "openstaand" ook als geen
-- beheerscherm open staat (werkblad, facturatiepagina en klantportaal lezen
-- hetzelfde getal).

CREATE OR REPLACE FUNCTION public.sync_invoice_spec_total_from_proforma(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total numeric;
BEGIN
  SELECT ROUND(COALESCE(SUM(pl.amount_incl_vat), 0), 2)
    INTO v_total
    FROM public.project_proformas p
    JOIN public.project_proforma_lines pl ON pl.proforma_id = p.id
   WHERE p.request_id = p_request_id
     AND p.status = 'concept'
     AND pl.line_status = 'active'
     AND pl.kind <> 'item_group';

  -- Zonder concept (nog geen proforma, of al geregistreerd) laat de app het
  -- totaal staan zoals het was; alleen een concept schrijft.
  IF NOT EXISTS (SELECT 1 FROM public.project_proformas WHERE request_id = p_request_id AND status = 'concept') THEN
    RETURN;
  END IF;

  UPDATE public.program_requests
     SET invoice_spec_total_incl_vat = v_total,
         invoice_spec_updated_at = now()
   WHERE id = p_request_id
     AND invoice_spec_total_incl_vat IS DISTINCT FROM v_total;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_invoice_spec_total_from_proforma(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_proforma_lines_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request_id uuid;
BEGIN
  SELECT request_id INTO v_request_id
    FROM public.project_proformas
   WHERE id = COALESCE(NEW.proforma_id, OLD.proforma_id);
  IF v_request_id IS NOT NULL THEN
    PERFORM public.sync_invoice_spec_total_from_proforma(v_request_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_proforma_lines_total() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proforma_lines_total ON public.project_proforma_lines;
CREATE TRIGGER trg_proforma_lines_total
  AFTER INSERT OR UPDATE OR DELETE ON public.project_proforma_lines
  FOR EACH ROW EXECUTE FUNCTION public.trg_proforma_lines_total();

CREATE OR REPLACE FUNCTION public.trg_proforma_header_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.sync_invoice_spec_total_from_proforma(COALESCE(NEW.request_id, OLD.request_id));
  RETURN COALESCE(NEW, OLD);
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_proforma_header_total() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_proforma_header_total ON public.project_proformas;
CREATE TRIGGER trg_proforma_header_total
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.project_proformas
  FOR EACH ROW EXECUTE FUNCTION public.trg_proforma_header_total();

-- Bestaande concepten: het totaal nu alvast gelijk zetten.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT request_id FROM public.project_proformas WHERE status = 'concept' LOOP
    PERFORM public.sync_invoice_spec_total_from_proforma(r.request_id);
  END LOOP;
END $$;
