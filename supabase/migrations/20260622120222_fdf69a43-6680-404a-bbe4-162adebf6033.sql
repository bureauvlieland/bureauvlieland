CREATE OR REPLACE FUNCTION public.prevent_duplicate_program_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_ref text;
BEGIN
  IF NEW.customer_email IS NULL OR NEW.selected_dates IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT reference_number INTO _existing_ref
  FROM public.program_requests
  WHERE lower(customer_email) = lower(NEW.customer_email)
    AND selected_dates::text = NEW.selected_dates::text
    AND status <> 'cancelled'
    AND created_at > (now() - interval '15 minutes')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _existing_ref IS NOT NULL THEN
    RAISE EXCEPTION 'duplicate_program_request: reference=%', _existing_ref
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_program_request_trigger ON public.program_requests;
CREATE TRIGGER prevent_duplicate_program_request_trigger
  BEFORE INSERT ON public.program_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_program_request();
