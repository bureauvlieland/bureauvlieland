-- 1. Datacorruptie herstellen: items die nooit verstuurd zijn maar wel op confirmed/alternative staan
UPDATE public.program_request_items
SET status = 'pending',
    status_updated_at = now(),
    status_note = COALESCE(NULLIF(status_note, ''), 'Status automatisch teruggezet: onderdeel was nog niet naar partner verstuurd.')
WHERE skip_partner_notification = true
  AND status IN ('confirmed', 'alternative')
  AND customer_approved_at IS NULL
  AND (item_quote_status IS NULL OR item_quote_status NOT IN ('bevestigd'));

-- 2. Vangrail-trigger: voorkom dat dit opnieuw gebeurt
CREATE OR REPLACE FUNCTION public.guard_item_status_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Een onderdeel mag alleen 'confirmed' of 'alternative' worden als:
  --   * het al verstuurd is naar een partner (skip_partner_notification = false), OF
  --   * de klant het expliciet heeft goedgekeurd (customer_approved_at IS NOT NULL), OF
  --   * de offertestatus van het item op 'bevestigd' staat (volledig afgerond traject)
  IF NEW.status IN ('confirmed', 'alternative')
     AND COALESCE(NEW.skip_partner_notification, false) = true
     AND NEW.customer_approved_at IS NULL
     AND COALESCE(NEW.item_quote_status, '') <> 'bevestigd'
  THEN
    RAISE EXCEPTION 'Item % kan niet op status "%" worden gezet zolang het nog niet naar de partner is verstuurd (skip_partner_notification=true).',
      NEW.id, NEW.status
      USING HINT = 'Verstuur het onderdeel eerst naar de partner of laat de klant akkoord geven.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_item_status_consistency ON public.program_request_items;
CREATE TRIGGER trg_guard_item_status_consistency
BEFORE INSERT OR UPDATE OF status, skip_partner_notification, customer_approved_at, item_quote_status
ON public.program_request_items
FOR EACH ROW
EXECUTE FUNCTION public.guard_item_status_consistency();