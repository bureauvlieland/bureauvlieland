-- Auto-todo: nieuwe logies-aanvraag binnengekomen
-- Maakt automatisch een admin_todo aan zodra er een nieuwe accommodation_request wordt aangemaakt,
-- ongeacht of dit via de publieke form, admin of een edge-functie gebeurt.

CREATE OR REPLACE FUNCTION public.create_todo_for_new_accommodation_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_label text;
  todo_title text;
  todo_description text;
BEGIN
  -- Bouw een leesbaar label op (bedrijf valt terug op klantnaam)
  customer_label := COALESCE(NULLIF(NEW.customer_company, ''), NEW.customer_name);

  todo_title := 'Nieuwe logies-aanvraag: ' || customer_label || ' — offertes uitzetten';

  todo_description := 'Er is een nieuwe logies-aanvraag binnengekomen van '
    || NEW.customer_name
    || COALESCE(' (' || NULLIF(NEW.customer_company, '') || ')', '')
    || ' voor ' || NEW.number_of_guests::text || ' gasten'
    || ' van ' || to_char(NEW.arrival_date, 'DD-MM-YYYY')
    || ' t/m ' || to_char(NEW.departure_date, 'DD-MM-YYYY') || '.';

  -- Voorkom dubbele todo's voor dezelfde aanvraag
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_todos
    WHERE auto_type = 'new_accommodation_request'
      AND auto_entity_id = NEW.id::text
      AND status <> 'done'
  ) THEN
    INSERT INTO public.admin_todos (
      title,
      description,
      priority,
      status,
      related_request_id,
      auto_type,
      auto_entity_id
    ) VALUES (
      todo_title,
      todo_description,
      'normal',
      'todo',
      NEW.linked_program_id, -- mag NULL zijn; auto_entity_id verwijst naar de logies-aanvraag
      'new_accommodation_request',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_todo_for_new_accommodation_request ON public.accommodation_requests;

CREATE TRIGGER trg_create_todo_for_new_accommodation_request
AFTER INSERT ON public.accommodation_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_todo_for_new_accommodation_request();