-- Trigger function: sync accommodation completion with linked program
CREATE OR REPLACE FUNCTION public.sync_accommodation_completion_from_program()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when completion_status actually changes
  IF NEW.completion_status IS DISTINCT FROM OLD.completion_status THEN
    -- Program became fully invoiced -> mark linked accommodation as fully_invoiced
    IF NEW.completion_status = 'fully_invoiced' THEN
      UPDATE public.accommodation_requests
      SET completion_status = 'fully_invoiced',
          completed_at = COALESCE(completed_at, now()),
          completed_by = COALESCE(completed_by, NEW.completed_by)
      WHERE linked_program_id = NEW.id
        AND (completion_status IS DISTINCT FROM 'fully_invoiced');

    -- Program reopened (was fully_invoiced, now isn't) -> reopen accommodation too
    ELSIF OLD.completion_status = 'fully_invoiced'
          AND NEW.completion_status <> 'fully_invoiced' THEN
      UPDATE public.accommodation_requests
      SET completion_status = 'in_progress',
          completed_at = NULL,
          completed_by = NULL
      WHERE linked_program_id = NEW.id
        AND completion_status = 'fully_invoiced';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_accommodation_completion ON public.program_requests;

CREATE TRIGGER trg_sync_accommodation_completion
AFTER UPDATE OF completion_status ON public.program_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_accommodation_completion_from_program();