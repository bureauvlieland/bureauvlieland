-- Een geselecteerde logiesofferte van een geannuleerde aanvraag is een
-- geannuleerde boeking. Tot nu toe bleef zo'n offerte op "selected" staan en
-- verscheen hij bij het hotel onder "Nog te factureren" (LOG-2602-0003,
-- gezien op 22 september 2026). Het partnerdashboard kende de status
-- "cancelled" al, de databasecontrole nog niet.

ALTER TABLE public.accommodation_quotes DROP CONSTRAINT IF EXISTS accommodation_quotes_status_check;
ALTER TABLE public.accommodation_quotes ADD CONSTRAINT accommodation_quotes_status_check
  CHECK (status = ANY (ARRAY['pending','submitted','selected','rejected','expired','declined','withdrawn','cancelled']));

-- Annulering van de aanvraag sluit de geselecteerde offerte, zolang die nog
-- niet gefactureerd is. Een al gefactureerde offerte blijft staan als
-- geschiedenis en voor de commissie. Openstaande offertes (pending,
-- submitted) blijven zoals ze waren: die zet cancel-program-request op
-- "rejected" en het sluiten in admin trekt ze in.
CREATE OR REPLACE FUNCTION public.close_selected_quotes_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.accommodation_quotes
       SET status = 'cancelled',
           updated_at = now()
     WHERE request_id = NEW.id
       AND status = 'selected'
       AND invoiced_number IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_selected_quotes_on_cancel ON public.accommodation_requests;
CREATE TRIGGER trg_close_selected_quotes_on_cancel
  AFTER UPDATE OF status ON public.accommodation_requests
  FOR EACH ROW EXECUTE FUNCTION public.close_selected_quotes_on_cancel();

-- Bestaande gevallen rechtzetten: geselecteerd, niet gefactureerd, aanvraag
-- geannuleerd.
UPDATE public.accommodation_quotes q
   SET status = 'cancelled',
       updated_at = now()
  FROM public.accommodation_requests r
 WHERE r.id = q.request_id
   AND r.status = 'cancelled'
   AND q.status = 'selected'
   AND q.invoiced_number IS NULL;
