-- Dubbele Werkbank-taken samenvoegen (docs/plan-notificaties.md, fase 3;
-- docs/notificaties-audit-inhoud.md, Deel 3).
--
-- Vier taaksoorten worden niet meer aangemaakt; één bestaande soort neemt het
-- moment over:
--   customer_status_email_due     -> customer_status_update_due (check-pending-items)
--   post_execution_feedback       -> customer_aftersales        (check-pending-items)
--   post_execution_invoice_check  -> commission_missing_invoice (flag-missing-partner-invoices)
--   new_request_received          -> new_program_request        (deze trigger)
--
-- Deze migratie:
--   1. sluit de nog open exemplaren van de vier oude soorten met een
--      herkenbare reden;
--   2. geeft de triggertaak "Nieuwe programma-aanvraag" de actie in de titel
--      ("— programma samenstellen"), zoals de geschrapte functie-taak had;
--   3. herschrijft de tekst van de dagelijkse taak stale_pending_change
--      (Nederlands, met de actie) in scan_stale_pending_changes.

-- 1. Open exemplaren van de samengevoegde soorten sluiten ---------------------
UPDATE public.admin_todos
SET status = 'done',
    completed_at = now(),
    completion_reason = 'samengevoegd_fase3'
WHERE status IN ('todo', 'in_progress')
  AND auto_type IN (
    'customer_status_email_due',
    'post_execution_feedback',
    'post_execution_invoice_check',
    'new_request_received'
  );

-- 2. Trigger: titel met de actie -----------------------------------------------
-- Zelfde definitie als 20261026120000_zelftest-taken-opruimen.sql (zelftest
-- overslaan, dedupe op open taak), alleen de titel is aangevuld.
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

  todo_title := 'Nieuwe programma-aanvraag: ' || COALESCE(customer_label, 'onbekend') || ' — programma samenstellen';
  todo_description := 'Er is een nieuwe programma-aanvraag binnengekomen van '
    || COALESCE(NEW.customer_name, 'onbekend')
    || COALESCE(' (' || NULLIF(NEW.customer_company, '') || ')', '')
    || ' voor ' || COALESCE(NEW.number_of_people, 0)::text || ' personen'
    || date_label
    || COALESCE(' — referentie ' || NEW.reference_number, '')
    || '. Stel het programma samen en stuur het voorstel naar de klant.';

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

-- 3. stale_pending_change: Nederlands en met de actie ---------------------------
-- Zelfde selectie en dedupe als 20260524120334 (dagelijks 07:00 via cron
-- 'scan-stale-pending-changes'); alleen titel en omschrijving zijn anders.
CREATE OR REPLACE FUNCTION public.scan_stale_pending_changes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_item record;
BEGIN
  FOR v_item IN
    SELECT i.id, i.request_id, i.block_name, i.provider_name, i.pending_changed_at
    FROM program_request_items i
    WHERE (i.pending_changed_at IS NOT NULL
           OR i.pending_marked_for_removal = true
           OR i.pending_added = true)
      AND i.pending_changed_at < now() - interval '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM admin_todos t
        WHERE t.auto_type = 'stale_pending_change'
          AND t.auto_entity_id = i.id::text
          AND t.status IN ('todo','in_progress')
      )
  LOOP
    INSERT INTO admin_todos (
      title, description, priority, status,
      related_request_id, auto_type, auto_entity_id
    ) VALUES (
      format('Wijziging aan "%s" al 7 dagen niet gepubliceerd', v_item.block_name),
      format('De wijziging aan "%s" (%s) staat sinds %s klaar maar is nog niet gepubliceerd naar partner en klant. Publiceer de wijziging of maak haar ongedaan op het project.',
             v_item.block_name, COALESCE(v_item.provider_name, 'Bureau Vlieland'),
             to_char(v_item.pending_changed_at, 'DD-MM-YYYY')),
      'normal', 'todo',
      v_item.request_id, 'stale_pending_change', v_item.id::text
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.scan_stale_pending_changes() FROM anon, authenticated;
