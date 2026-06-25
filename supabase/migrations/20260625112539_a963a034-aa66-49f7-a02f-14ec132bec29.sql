
-- 1. archived_at kolommen
ALTER TABLE public.program_requests ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.accommodation_requests ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.project_communications ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_program_requests_archived_at ON public.program_requests(archived_at);
CREATE INDEX IF NOT EXISTS idx_accommodation_requests_archived_at ON public.accommodation_requests(archived_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_archived_at ON public.chat_conversations(archived_at);
CREATE INDEX IF NOT EXISTS idx_project_communications_archived_at ON public.project_communications(archived_at);

-- 2. Auto-archive trigger op program_requests
CREATE OR REPLACE FUNCTION public.maintain_program_request_archived_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_terminal boolean;
  v_was_terminal boolean;
BEGIN
  v_is_terminal := (NEW.completion_status = 'fully_invoiced')
    OR (NEW.status IN ('cancelled', 'deleted'));
  IF TG_OP = 'INSERT' THEN
    IF v_is_terminal AND NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
    END IF;
    RETURN NEW;
  END IF;

  v_was_terminal := (OLD.completion_status = 'fully_invoiced')
    OR (OLD.status IN ('cancelled', 'deleted'));

  IF v_is_terminal AND NOT v_was_terminal THEN
    NEW.archived_at := now();
  ELSIF NOT v_is_terminal AND v_was_terminal THEN
    NEW.archived_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_program_requests_archived_at ON public.program_requests;
CREATE TRIGGER trg_program_requests_archived_at
BEFORE INSERT OR UPDATE OF completion_status, status
ON public.program_requests
FOR EACH ROW
EXECUTE FUNCTION public.maintain_program_request_archived_at();

-- 3. Auto-archive trigger op accommodation_requests
CREATE OR REPLACE FUNCTION public.maintain_accommodation_request_archived_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_terminal boolean;
  v_was_terminal boolean;
BEGIN
  v_is_terminal := (NEW.completion_status = 'fully_invoiced')
    OR (NEW.status IN ('cancelled', 'rejected'));
  IF TG_OP = 'INSERT' THEN
    IF v_is_terminal AND NEW.archived_at IS NULL THEN
      NEW.archived_at := now();
    END IF;
    RETURN NEW;
  END IF;

  v_was_terminal := (OLD.completion_status = 'fully_invoiced')
    OR (OLD.status IN ('cancelled', 'rejected'));

  IF v_is_terminal AND NOT v_was_terminal THEN
    NEW.archived_at := now();
  ELSIF NOT v_is_terminal AND v_was_terminal THEN
    NEW.archived_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accommodation_requests_archived_at ON public.accommodation_requests;
CREATE TRIGGER trg_accommodation_requests_archived_at
BEFORE INSERT OR UPDATE OF completion_status, status
ON public.accommodation_requests
FOR EACH ROW
EXECUTE FUNCTION public.maintain_accommodation_request_archived_at();

-- 4. Reset archief bij nieuwe inkomende e-mail
CREATE OR REPLACE FUNCTION public.reset_project_archive_on_inbound_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction <> 'inbound' THEN
    RETURN NEW;
  END IF;
  IF NEW.request_id IS NOT NULL THEN
    UPDATE public.program_requests
       SET archived_at = NULL
     WHERE id = NEW.request_id AND archived_at IS NOT NULL;
  END IF;
  IF NEW.accommodation_id IS NOT NULL THEN
    UPDATE public.accommodation_requests
       SET archived_at = NULL
     WHERE id = NEW.accommodation_id AND archived_at IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_project_archive_on_email ON public.project_communications;
CREATE TRIGGER trg_reset_project_archive_on_email
AFTER INSERT ON public.project_communications
FOR EACH ROW
EXECUTE FUNCTION public.reset_project_archive_on_inbound_email();

-- 5. Reset archief bij nieuw chat-bericht van klant/partner/bezoeker
CREATE OR REPLACE FUNCTION public.reset_project_archive_on_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_accommodation_request_id uuid;
BEGIN
  IF NEW.sender_type = 'admin' THEN
    RETURN NEW;
  END IF;

  SELECT request_id, accommodation_request_id
    INTO v_request_id, v_accommodation_request_id
    FROM public.chat_conversations
   WHERE id = NEW.conversation_id;

  IF v_request_id IS NOT NULL THEN
    UPDATE public.program_requests
       SET archived_at = NULL
     WHERE id = v_request_id AND archived_at IS NOT NULL;
  END IF;
  IF v_accommodation_request_id IS NOT NULL THEN
    UPDATE public.accommodation_requests
       SET archived_at = NULL
     WHERE id = v_accommodation_request_id AND archived_at IS NOT NULL;
  END IF;

  -- Heft ook handmatig conversation-archief op zodra er weer iets binnenkomt
  UPDATE public.chat_conversations
     SET archived_at = NULL
   WHERE id = NEW.conversation_id AND archived_at IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_project_archive_on_chat ON public.chat_messages;
CREATE TRIGGER trg_reset_project_archive_on_chat
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.reset_project_archive_on_chat_message();

-- 6. Backfill archived_at voor bestaande terminale dossiers
UPDATE public.program_requests
   SET archived_at = COALESCE(completed_at, updated_at, created_at)
 WHERE archived_at IS NULL
   AND (completion_status = 'fully_invoiced' OR status IN ('cancelled','deleted'));

UPDATE public.accommodation_requests
   SET archived_at = COALESCE(completed_at, updated_at, created_at)
 WHERE archived_at IS NULL
   AND (completion_status = 'fully_invoiced' OR status IN ('cancelled','rejected'));
