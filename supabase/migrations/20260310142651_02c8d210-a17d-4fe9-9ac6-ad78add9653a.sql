ALTER TABLE public.accommodation_requests ADD COLUMN quotes_declined_count integer NOT NULL DEFAULT 0;

-- Backfill existing data
UPDATE public.accommodation_requests 
SET quotes_declined_count = (
  SELECT count(*) 
  FROM public.accommodation_quotes 
  WHERE request_id = accommodation_requests.id 
    AND status IN ('declined', 'rejected')
);

-- Create trigger to auto-update the count
CREATE OR REPLACE FUNCTION public.update_accommodation_declined_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update count on the request when a quote status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE accommodation_requests
    SET quotes_declined_count = (
      SELECT count(*) FROM accommodation_quotes
      WHERE request_id = NEW.request_id AND status IN ('declined', 'rejected')
    )
    WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_update_declined_count
AFTER UPDATE ON public.accommodation_quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_accommodation_declined_count();