-- Wizard fase 4: sluit een partner (zelf, in het portaal) of admin een periode
-- nadat er al aanvragen lopen, dan krijgt elke geraakte aanvraag een
-- werkbanktaak. Het programma van de klant wijzigt niet vanzelf; dat blijft
-- een beslissing van het bureau. Zie docs/plan-wizard-situatie-en-beschikbaarheid.md.
--
-- Dezelfde taaksoort (auto_type 'availability_conflict', auto_entity_id =
-- item-id) als de bestaande controle in de admin (conflictChecker.ts), zodat
-- er nooit twee taken voor hetzelfde onderdeel ontstaan.

CREATE OR REPLACE FUNCTION public.create_todos_for_partner_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_name text;
  v_item record;
  v_activity_date date;
  v_title text;
  v_description text;
BEGIN
  SELECT name INTO v_partner_name FROM public.partners WHERE id = NEW.partner_id;

  FOR v_item IN
    SELECT
      i.id,
      i.block_name,
      i.day_index,
      i.proposed_date,
      r.id AS request_id,
      r.reference_number,
      r.selected_dates,
      COALESCE(NULLIF(r.customer_company, ''), r.customer_name) AS customer_label
    FROM public.program_request_items i
    JOIN public.program_requests r ON r.id = i.request_id
    WHERE i.provider_id = NEW.partner_id
      AND COALESCE(i.status, '') NOT IN ('cancelled', 'declined', 'unavailable')
      AND r.cancelled_at IS NULL
      AND r.completed_at IS NULL
      AND r.archived_at IS NULL
  LOOP
    -- Datum van het onderdeel: voorgestelde datum, anders de dag uit de aanvraag.
    v_activity_date := NULL;
    IF v_item.proposed_date IS NOT NULL THEN
      v_activity_date := v_item.proposed_date;
    ELSIF v_item.selected_dates IS NOT NULL
      AND jsonb_typeof(v_item.selected_dates) = 'array'
      AND jsonb_array_length(v_item.selected_dates) > 0 THEN
      BEGIN
        IF v_item.selected_dates->>COALESCE(v_item.day_index, 0) IS NOT NULL THEN
          v_activity_date := (v_item.selected_dates->>COALESCE(v_item.day_index, 0))::date;
        ELSE
          v_activity_date := (v_item.selected_dates->>0)::date + COALESCE(v_item.day_index, 0);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- selected_dates kan vrije tekst bevatten ("7 juli"); dan geen datum bekend.
        v_activity_date := NULL;
      END;
    END IF;

    CONTINUE WHEN v_activity_date IS NULL;
    CONTINUE WHEN v_activity_date < CURRENT_DATE;
    CONTINUE WHEN v_activity_date < NEW.start_date OR v_activity_date > NEW.end_date;

    IF EXISTS (
      SELECT 1 FROM public.admin_todos
      WHERE auto_type = 'availability_conflict'
        AND auto_entity_id = v_item.id::text
        AND status <> 'done'
    ) THEN
      CONTINUE;
    END IF;

    v_title := 'Beschikbaarheidsconflict: ' || COALESCE(v_partner_name, NEW.partner_id)
      || ' niet beschikbaar voor "' || COALESCE(v_item.block_name, 'onderdeel') || '"';
    v_description := COALESCE(v_partner_name, NEW.partner_id)
      || ' heeft een sluiting doorgegeven van ' || to_char(NEW.start_date, 'DD-MM-YYYY')
      || ' t/m ' || to_char(NEW.end_date, 'DD-MM-YYYY')
      || COALESCE(' (' || NULLIF(NEW.reason, '') || ')', '')
      || '. Dat raakt "' || COALESCE(v_item.block_name, 'onderdeel') || '" op '
      || to_char(v_activity_date, 'DD-MM-YYYY')
      || ' in de aanvraag van ' || COALESCE(v_item.customer_label, 'onbekend')
      || COALESCE(' (' || v_item.reference_number || ')', '')
      || '. Het programma van de klant is niet gewijzigd: overleg een alternatief.';

    INSERT INTO public.admin_todos (
      title, description, priority, status,
      related_request_id, related_partner_id, auto_type, auto_entity_id
    ) VALUES (
      v_title, v_description, 'high', 'todo',
      v_item.request_id, NEW.partner_id, 'availability_conflict', v_item.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_todos_for_partner_closure() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_partner_closure_check_requests ON public.partner_unavailability;
CREATE TRIGGER trg_partner_closure_check_requests
  AFTER INSERT OR UPDATE OF start_date, end_date ON public.partner_unavailability
  FOR EACH ROW
  EXECUTE FUNCTION public.create_todos_for_partner_closure();
