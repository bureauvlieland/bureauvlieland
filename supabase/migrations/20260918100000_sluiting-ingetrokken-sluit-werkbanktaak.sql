-- Wizard-vervolg (18 september 2026): trekt een aanbieder een sluiting in
-- (verwijderen) of kort hij die in, dan sluiten we de werkbanktaken
-- "Beschikbaarheidsconflict" die door die sluiting zijn ontstaan. Alleen
-- taken die nog niemand heeft opgepakt (status 'todo', niet toegewezen) en
-- alleen als de dag van het onderdeel niet meer in een sluiting van dezelfde
-- aanbieder valt. Het programma van de klant wijzigt niet.
-- Zie docs/plan-wizard-situatie-en-beschikbaarheid.md, "Vervolg".

-- De dag waarop een programmaonderdeel staat: de voorgestelde datum, anders
-- de dag uit de aanvraag (zelfde regels als create_todos_for_partner_closure).
-- NULL als de aanvraag vrije-tekst-datums heeft ("7 juli").
CREATE OR REPLACE FUNCTION public.program_request_item_date(p_item_id uuid)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item record;
  v_date date;
BEGIN
  SELECT i.day_index, i.proposed_date, r.selected_dates
    INTO v_item
    FROM public.program_request_items i
    JOIN public.program_requests r ON r.id = i.request_id
   WHERE i.id = p_item_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_item.proposed_date IS NOT NULL THEN
    RETURN v_item.proposed_date::date;
  END IF;
  IF v_item.selected_dates IS NULL
     OR jsonb_typeof(v_item.selected_dates) <> 'array'
     OR jsonb_array_length(v_item.selected_dates) = 0 THEN
    RETURN NULL;
  END IF;
  BEGIN
    IF v_item.selected_dates->>COALESCE(v_item.day_index, 0) IS NOT NULL THEN
      v_date := (v_item.selected_dates->>COALESCE(v_item.day_index, 0))::date;
    ELSE
      v_date := (v_item.selected_dates->>0)::date + COALESCE(v_item.day_index, 0);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_date := NULL;
  END;
  RETURN v_date;
END;
$$;

REVOKE ALL ON FUNCTION public.program_request_item_date(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.close_todos_for_withdrawn_partner_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_name text;
  v_todo record;
  v_item_id uuid;
  v_date date;
  v_still_closed boolean;
BEGIN
  -- Een periode die gelijk blijft of groeit, maakt geen taak overbodig.
  IF TG_OP = 'UPDATE'
     AND NEW.start_date <= OLD.start_date
     AND NEW.end_date >= OLD.end_date THEN
    RETURN NULL;
  END IF;

  SELECT name INTO v_partner_name FROM public.partners WHERE id = OLD.partner_id;

  FOR v_todo IN
    SELECT id, auto_entity_id
      FROM public.admin_todos
     WHERE auto_type = 'availability_conflict'
       AND related_partner_id = OLD.partner_id
       AND status = 'todo'
       AND assigned_to IS NULL
  LOOP
    BEGIN
      v_item_id := v_todo.auto_entity_id::uuid;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;

    v_date := public.program_request_item_date(v_item_id);
    CONTINUE WHEN v_date IS NULL;
    -- Alleen taken over een dag die in de ingetrokken of ingekorte periode lag.
    CONTINUE WHEN v_date < OLD.start_date OR v_date > OLD.end_date;

    -- Valt de dag nog in een (andere of ingekorte) sluiting van deze
    -- aanbieder? Dan blijft de taak staan.
    SELECT EXISTS (
      SELECT 1
        FROM public.partner_unavailability u
       WHERE u.partner_id = OLD.partner_id
         AND u.start_date <= v_date
         AND u.end_date >= v_date
    ) INTO v_still_closed;
    CONTINUE WHEN v_still_closed;

    UPDATE public.admin_todos
       SET status = 'done',
           completed_at = now(),
           updated_at = now(),
           completion_reason = COALESCE(v_partner_name, OLD.partner_id::text)
             || ' heeft de sluiting van ' || to_char(OLD.start_date, 'DD-MM-YYYY')
             || ' t/m ' || to_char(OLD.end_date, 'DD-MM-YYYY')
             || CASE WHEN TG_OP = 'DELETE' THEN ' ingetrokken' ELSE ' ingekort' END
             || '; het onderdeel op ' || to_char(v_date, 'DD-MM-YYYY')
             || ' valt niet meer in een gesloten periode. Automatisch gesloten.'
     WHERE id = v_todo.id;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.close_todos_for_withdrawn_partner_closure() FROM PUBLIC;

-- Bij een wijziging vuurt eerst trg_partner_closure_check_requests (nieuwe
-- taken voor de nieuwe periode) en daarna deze trigger (alfabetische
-- volgorde), zodat een verschoven periode klopt: taken voor dagen die nog
-- gesloten zijn blijven, de rest sluit.
DROP TRIGGER IF EXISTS trg_partner_closure_withdrawn_close_todos ON public.partner_unavailability;
CREATE TRIGGER trg_partner_closure_withdrawn_close_todos
  AFTER DELETE OR UPDATE OF start_date, end_date ON public.partner_unavailability
  FOR EACH ROW
  EXECUTE FUNCTION public.close_todos_for_withdrawn_partner_closure();
