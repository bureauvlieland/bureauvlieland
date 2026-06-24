CREATE OR REPLACE FUNCTION public.enforce_program_request_has_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origin TEXT;
  v_count INT;
BEGIN
  SELECT origin INTO v_origin FROM public.program_requests WHERE id = NEW.id;
  -- Row mogelijk al verwijderd binnen dezelfde transactie (rollback-delete in client).
  IF v_origin IS NULL THEN
    RETURN NEW;
  END IF;

  -- Alleen self-service aanvragen MOETEN items hebben bij commit.
  -- Quote/maatwerk worden door admin samengesteld en mogen tijdelijk leeg zijn.
  IF v_origin <> 'self_service' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.program_request_items WHERE request_id = NEW.id;
  IF v_count = 0 THEN
    RAISE EXCEPTION
      'self_service program_request % heeft geen program_request_items bij commit — transactie afgebroken om lege aanvraag in admin te voorkomen', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_program_request_has_items_on_commit ON public.program_requests;

CREATE CONSTRAINT TRIGGER enforce_program_request_has_items_on_commit
  AFTER INSERT ON public.program_requests
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_program_request_has_items();

COMMENT ON FUNCTION public.enforce_program_request_has_items() IS
  'Vangnet tegen lege self-service program_requests. Zie src/test/README.md (laag 3) en CheckoutContactForm.tsx.';