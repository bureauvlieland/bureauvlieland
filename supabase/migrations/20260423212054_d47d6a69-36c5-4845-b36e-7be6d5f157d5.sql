-- Add completion tracking columns to program_requests
ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS reopened_reason text;

-- Add completion tracking columns to accommodation_requests
ALTER TABLE public.accommodation_requests
  ADD COLUMN IF NOT EXISTS completion_status text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid,
  ADD COLUMN IF NOT EXISTS reopened_reason text;

-- Validation trigger for accommodation_requests.completion_status
CREATE OR REPLACE FUNCTION public.validate_accommodation_completion_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.completion_status IS NOT NULL
     AND NEW.completion_status NOT IN ('in_progress', 'partially_invoiced', 'ready_for_invoice', 'fully_invoiced') THEN
    RAISE EXCEPTION 'Invalid completion_status: %', NEW.completion_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_accommodation_completion_status_trg ON public.accommodation_requests;
CREATE TRIGGER validate_accommodation_completion_status_trg
  BEFORE INSERT OR UPDATE OF completion_status ON public.accommodation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_accommodation_completion_status();

-- Validation trigger for program_requests.completion_status (defensive — column already exists)
CREATE OR REPLACE FUNCTION public.validate_program_completion_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.completion_status IS NOT NULL
     AND NEW.completion_status NOT IN ('in_progress', 'partially_invoiced', 'ready_for_invoice', 'fully_invoiced') THEN
    RAISE EXCEPTION 'Invalid completion_status: %', NEW.completion_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_program_completion_status_trg ON public.program_requests;
CREATE TRIGGER validate_program_completion_status_trg
  BEFORE INSERT OR UPDATE OF completion_status ON public.program_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_program_completion_status();