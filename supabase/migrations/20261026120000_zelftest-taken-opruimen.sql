-- Zelftest-taken uit de Werkbank-inbox houden.
--
-- De dagelijkse kritieke zelftest (critical-selftest) schiet een echte
-- programma-aanvraag in en verwijdert die daarna weer. Twee bijwerkingen
-- vervuilden de Werkbank:
--
--   1. De insert-trigger maakte voor die aanvraag een taak "Nieuwe
--      programma-aanvraag: ZELFTEST — niet verwerken". Bij het verwijderen
--      van de aanvraag zet de FK related_request_id op NULL, waardoor de taak
--      als "losse taak" bleef hangen; reconcile-admin-todos herkende hem niet
--      meer als taak van een verwijderd project. Eén wees per zelftestrun.
--   2. De faal-taak "Kritieke zelftest faalt" kreeg per dag een nieuwe
--      sleutel (selftest-<datum>), dus elke dag een nieuwe high-prio taak
--      zolang dezelfde fout bleef bestaan.
--
-- Deze migratie:
--   - laat de trigger zelftest-aanvragen overslaan;
--   - sluit bestaande wezen van verwijderde projecten (de edge function
--     reconcile-admin-todos doet dit voortaan ook zelf);
--   - voegt de openstaande faal-taken samen tot één taak met de vaste sleutel
--     'critical-selftest' die critical-selftest voortaan bijwerkt en bij
--     herstel afrondt.

-- 1. Trigger: geen Werkbank-taak voor de zelftest-aanvraag -----------------
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
  -- Dagelijkse zelftest: aanvraag wordt direct weer verwijderd, geen taak.
  IF NEW.customer_email = 'selftest@bureauvlieland.nl' THEN
    RETURN NEW;
  END IF;

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

-- 2. Wezen van verwijderde projecten sluiten --------------------------------
-- Zelfde lijst als REQUEST_BOUND_AUTO_TYPES in
-- supabase/functions/_shared/todoRequestLink.ts: types waarvan
-- auto_entity_id het program_requests.id is.
UPDATE public.admin_todos t
SET status = 'done',
    completed_at = now(),
    completion_reason = 'project_deleted'
WHERE t.status IN ('todo', 'in_progress')
  AND t.related_request_id IS NULL
  AND t.auto_type IN (
    'request_no_response',
    'quote_pending_customer',
    'new_request_received',
    'new_program_request',
    'new_accommodation_request',
    'all_partners_responded',
    'customer_inputs_missing',
    'customer_date_change_partner_notify',
    'customer_cancellation',
    'send_items_to_partners',
    'invoicing_ready'
  )
  AND t.auto_entity_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.program_requests r WHERE r.id = t.auto_entity_id::uuid
  );

-- 3. Faal-taken van de zelftest samenvoegen tot één -------------------------
WITH newest AS (
  SELECT id
  FROM public.admin_todos
  WHERE auto_type = 'critical_selftest_failure'
    AND status IN ('todo', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1
)
UPDATE public.admin_todos t
SET status = 'done',
    completed_at = now(),
    completion_reason = 'Samengevoegd met nieuwere zelftest-taak'
WHERE t.auto_type = 'critical_selftest_failure'
  AND t.status IN ('todo', 'in_progress')
  AND t.id NOT IN (SELECT id FROM newest);

UPDATE public.admin_todos
SET auto_entity_id = 'critical-selftest'
WHERE auto_type = 'critical_selftest_failure'
  AND status IN ('todo', 'in_progress');
