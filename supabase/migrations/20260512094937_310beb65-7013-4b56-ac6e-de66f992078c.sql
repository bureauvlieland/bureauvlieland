-- 1) DATA REPAIR: restore one-way orphans (accommodation → program, but program lacks back-link)
-- Only when no other program already claims that accommodation (unique constraint).
UPDATE public.program_requests pr
SET linked_accommodation_id = ar.id
FROM public.accommodation_requests ar
WHERE ar.linked_program_id = pr.id
  AND pr.linked_accommodation_id IS DISTINCT FROM ar.id
  AND NOT EXISTS (
    SELECT 1 FROM public.program_requests pr2
    WHERE pr2.linked_accommodation_id = ar.id
      AND pr2.id <> pr.id
  );

-- 2) BIDIRECTIONAL SYNC TRIGGERS
-- Keeps program_requests.linked_accommodation_id and accommodation_requests.linked_program_id
-- in sync so the project↔logies relationship cannot silently drift.

-- Trigger function fired from accommodation_requests
CREATE OR REPLACE FUNCTION public.sync_accommodation_program_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Forward link: when accommodation gets/changes linked_program_id, ensure that program
  -- points back to this accommodation (only if it isn't already, to avoid recursion).
  IF NEW.linked_program_id IS NOT NULL THEN
    UPDATE public.program_requests
    SET linked_accommodation_id = NEW.id
    WHERE id = NEW.linked_program_id
      AND linked_accommodation_id IS DISTINCT FROM NEW.id;
  END IF;

  -- Cleared link on UPDATE: clear program back-link if it pointed here.
  IF TG_OP = 'UPDATE'
     AND OLD.linked_program_id IS NOT NULL
     AND NEW.linked_program_id IS NULL THEN
    UPDATE public.program_requests
    SET linked_accommodation_id = NULL
    WHERE id = OLD.linked_program_id
      AND linked_accommodation_id = NEW.id;
  END IF;

  -- Re-pointed to a different program on UPDATE: also clear the old program back-link.
  IF TG_OP = 'UPDATE'
     AND OLD.linked_program_id IS NOT NULL
     AND NEW.linked_program_id IS NOT NULL
     AND OLD.linked_program_id <> NEW.linked_program_id THEN
    UPDATE public.program_requests
    SET linked_accommodation_id = NULL
    WHERE id = OLD.linked_program_id
      AND linked_accommodation_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_accommodation_program_link ON public.accommodation_requests;
CREATE TRIGGER trg_sync_accommodation_program_link
AFTER INSERT OR UPDATE OF linked_program_id
ON public.accommodation_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_accommodation_program_link();

-- Trigger function fired from program_requests
CREATE OR REPLACE FUNCTION public.sync_program_accommodation_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.linked_accommodation_id IS NOT NULL THEN
    UPDATE public.accommodation_requests
    SET linked_program_id = NEW.id
    WHERE id = NEW.linked_accommodation_id
      AND linked_program_id IS DISTINCT FROM NEW.id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.linked_accommodation_id IS NOT NULL
     AND NEW.linked_accommodation_id IS NULL THEN
    UPDATE public.accommodation_requests
    SET linked_program_id = NULL
    WHERE id = OLD.linked_accommodation_id
      AND linked_program_id = NEW.id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.linked_accommodation_id IS NOT NULL
     AND NEW.linked_accommodation_id IS NOT NULL
     AND OLD.linked_accommodation_id <> NEW.linked_accommodation_id THEN
    UPDATE public.accommodation_requests
    SET linked_program_id = NULL
    WHERE id = OLD.linked_accommodation_id
      AND linked_program_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_program_accommodation_link ON public.program_requests;
CREATE TRIGGER trg_sync_program_accommodation_link
AFTER INSERT OR UPDATE OF linked_accommodation_id
ON public.program_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_program_accommodation_link();