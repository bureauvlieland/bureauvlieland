CREATE OR REPLACE FUNCTION public.normalize_invoiced_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF NEW.invoiced_number IS NOT NULL THEN
    v_key := lower(regexp_replace(btrim(NEW.invoiced_number), '[\s._]', '', 'g'));
    IF v_key = '' OR v_key IN (
      'nvt','nvt-','nva','na','n/a','geen','geenfactuur','x','xx','xxx','-','--','?','0'
    ) THEN
      NEW.invoiced_number := NULL;
    ELSE
      NEW.invoiced_number := btrim(NEW.invoiced_number);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_invoiced_number_items ON public.program_request_items;
CREATE TRIGGER trg_normalize_invoiced_number_items
BEFORE INSERT OR UPDATE OF invoiced_number ON public.program_request_items
FOR EACH ROW EXECUTE FUNCTION public.normalize_invoiced_number();

DROP TRIGGER IF EXISTS trg_normalize_invoiced_number_quotes ON public.accommodation_quotes;
CREATE TRIGGER trg_normalize_invoiced_number_quotes
BEFORE INSERT OR UPDATE OF invoiced_number ON public.accommodation_quotes
FOR EACH ROW EXECUTE FUNCTION public.normalize_invoiced_number();

-- Eenmalige opschoning van bestaande placeholder-waarden
UPDATE public.program_request_items
SET invoiced_number = NULL
WHERE invoiced_number IS NOT NULL
  AND lower(regexp_replace(btrim(invoiced_number), '[\s._]', '', 'g')) IN (
    '', 'nvt','nvt-','nva','na','n/a','geen','geenfactuur','x','xx','xxx','-','--','?','0'
  );

UPDATE public.accommodation_quotes
SET invoiced_number = NULL
WHERE invoiced_number IS NOT NULL
  AND lower(regexp_replace(btrim(invoiced_number), '[\s._]', '', 'g')) IN (
    '', 'nvt','nvt-','nva','na','n/a','geen','geenfactuur','x','xx','xxx','-','--','?','0'
  );