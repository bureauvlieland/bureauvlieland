-- 1. Keep both customer approval timestamps in sync automatically.
CREATE OR REPLACE FUNCTION public.sync_customer_approval_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_approved_at IS NOT NULL AND NEW.customer_accepted_at IS NULL THEN
    NEW.customer_accepted_at := NEW.customer_approved_at;
  ELSIF NEW.customer_accepted_at IS NOT NULL AND NEW.customer_approved_at IS NULL THEN
    NEW.customer_approved_at := NEW.customer_accepted_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_approval_timestamps ON public.program_request_items;
CREATE TRIGGER trg_sync_customer_approval_timestamps
BEFORE INSERT OR UPDATE ON public.program_request_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_approval_timestamps();

-- 2. Backfill existing drift (pure sync of facts already recorded).
UPDATE public.program_request_items
SET customer_accepted_at = customer_approved_at
WHERE customer_approved_at IS NOT NULL AND customer_accepted_at IS NULL;

UPDATE public.program_request_items
SET customer_approved_at = customer_accepted_at
WHERE customer_accepted_at IS NOT NULL AND customer_approved_at IS NULL;