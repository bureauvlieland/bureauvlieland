
CREATE OR REPLACE FUNCTION public.create_todo_for_new_program_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  customer_label text;
  todo_title text;
  todo_description text;
  date_label text;
  first_date text;
BEGIN
  customer_label := COALESCE(NULLIF(NEW.customer_company, ''), NEW.customer_name);

  IF NEW.selected_dates IS NOT NULL AND jsonb_typeof(NEW.selected_dates) = 'array' AND jsonb_array_length(NEW.selected_dates) > 0 THEN
    first_date := NEW.selected_dates->>0;
    date_label := ' voor ' || first_date;
  ELSE
    date_label := '';
  END IF;

  todo_title := 'Nieuwe programma-aanvraag: ' || COALESCE(customer_label, 'onbekend');
  todo_description := 'Er is een nieuwe programma-aanvraag binnengekomen van '
    || COALESCE(NEW.customer_name, 'onbekend')
    || COALESCE(' (' || NULLIF(NEW.customer_company, '') || ')', '')
    || ' voor ' || COALESCE(NEW.number_of_people, 0)::text || ' personen'
    || date_label
    || COALESCE(' — referentie ' || NEW.reference_number, '')
    || '.';

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_todos
    WHERE auto_type = 'new_program_request'
      AND auto_entity_id = NEW.id::text
      AND status <> 'done'
  ) THEN
    INSERT INTO public.admin_todos (
      title, description, priority, status,
      related_request_id, auto_type, auto_entity_id
    ) VALUES (
      todo_title, todo_description, 'normal', 'todo',
      NEW.id, 'new_program_request', NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_todo_for_new_program_request ON public.program_requests;
CREATE TRIGGER trg_create_todo_for_new_program_request
AFTER INSERT ON public.program_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_todo_for_new_program_request();
