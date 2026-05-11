-- Fase 5 stap 1: introduce `origin` column on program_requests as eventual replacement
-- for `program_type`. Nullable, no constraint yet. Backfill 1-on-1 from program_type
-- (existing values: self_service, quote, maatwerk_zakelijk, maatwerk_prive).
-- Code keeps reading `program_type` until we refactor in vervolgstappen.

ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS origin text;

UPDATE public.program_requests
SET origin = program_type
WHERE origin IS NULL;

CREATE INDEX IF NOT EXISTS idx_program_requests_origin
  ON public.program_requests(origin);

-- Trigger zorgt dat nieuwe rijen automatisch een origin krijgen zolang code nog
-- alleen program_type schrijft. Mapping is 1-op-1.
CREATE OR REPLACE FUNCTION public.sync_program_origin_from_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.origin IS NULL AND NEW.program_type IS NOT NULL THEN
    NEW.origin := NEW.program_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_program_origin ON public.program_requests;
CREATE TRIGGER trg_sync_program_origin
  BEFORE INSERT OR UPDATE ON public.program_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_program_origin_from_type();