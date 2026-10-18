-- Fase 3 van docs/plan-inkoopfacturen-doorbelasten.md: één berekening.
--
-- 1. bureau_invoice_lines: de regels van een bureaufactuur zoals ze op het
--    moment van registreren of versturen zijn berekend (src/lib/projectInvoiceSpec.ts).
--    PDF en UBL komen voortaan uit deze regels; zodra de factuur naar de
--    boekhouding is, zijn ze bevroren.
-- 2. program_requests.invoice_spec_total_incl_vat: het projecttotaal zoals de
--    app het berekent. De voltooiingsstatus (openstaand bedrag) leest dat
--    getal en rekent alleen nog zelf als de app het nog nooit schreef.
-- 3. program_request_items.use_actual_costs verdwijnt: klantregels aanwezig
--    = klantregels leidend (besluit 2 in het plan).

-- ---------------------------------------------------------------------------
-- 1. Factuurregels
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bureau_invoice_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.bureau_invoices(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'item',
  section text NOT NULL DEFAULT '',
  item_id uuid REFERENCES public.program_request_items(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  sub_description text,
  quantity numeric NOT NULL DEFAULT 1,
  quantity_label text,
  unit_price_excl_vat numeric NOT NULL DEFAULT 0,
  unit_suffix text NOT NULL DEFAULT '',
  vat_rate numeric NOT NULL DEFAULT 21,
  amount_excl_vat numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  amount_incl_vat numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bureau_invoice_lines IS
  'Regels van een bureaufactuur, bevroren bij registreren/versturen. kind: item, cost, lodging, lodging_extra, fee, revision, summary (per btw-tarief, voor deel- en restantfacturen).';

CREATE INDEX IF NOT EXISTS idx_bureau_invoice_lines_invoice
  ON public.bureau_invoice_lines(invoice_id, sort_order);

ALTER TABLE public.bureau_invoice_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bureau_invoice_lines TO authenticated;
GRANT ALL ON public.bureau_invoice_lines TO service_role;

DROP POLICY IF EXISTS "Admins beheren factuurregels" ON public.bureau_invoice_lines;
CREATE POLICY "Admins beheren factuurregels"
  ON public.bureau_invoice_lines
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Bevroren zodra de factuur naar de boekhouding is.
CREATE OR REPLACE FUNCTION public.guard_bureau_invoice_lines_frozen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  v_forwarded timestamptz;
BEGIN
  SELECT forwarded_to_accounting_at INTO v_forwarded
    FROM public.bureau_invoices WHERE id = v_invoice_id;
  IF v_forwarded IS NOT NULL THEN
    RAISE EXCEPTION 'De regels van een factuur die al naar de boekhouding is, zijn bevroren.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_bureau_invoice_lines_frozen ON public.bureau_invoice_lines;
CREATE TRIGGER trg_bureau_invoice_lines_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON public.bureau_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_bureau_invoice_lines_frozen();

-- ---------------------------------------------------------------------------
-- 2. Opgeslagen projecttotaal
-- ---------------------------------------------------------------------------
ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS invoice_spec_total_incl_vat numeric,
  ADD COLUMN IF NOT EXISTS invoice_spec_updated_at timestamptz;

COMMENT ON COLUMN public.program_requests.invoice_spec_total_incl_vat IS
  'Te factureren totaal incl. btw zoals de app het berekent (projectInvoiceSpec). Geschreven door de beheerschermen; gelezen door recalculate_program_completion_status.';

-- De berekening in één functie, zodat zowel facturen als het opgeslagen
-- totaal de status kunnen bijwerken.
CREATE OR REPLACE FUNCTION public.recalculate_program_completion_for_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_net_invoiced numeric := 0;
  v_grand_total numeric := 0;
  v_outstanding numeric := 0;
  v_current_status text;
  v_current_completed_at timestamptz;
  v_manually_overridden boolean := false;
  v_new_status text;
  v_stored_total numeric;
  v_tourist_tax_pp_per_day numeric := 0;
  v_nature_contribution_pp numeric := 0;
  v_bureau_central_surcharge_pp numeric := 0;
  v_coordination_fee numeric := 0;
  v_number_of_people int := 0;
  v_number_of_days int := 1;
  v_invoicing_mode text;
  v_linked_accommodation_id uuid;
  v_excluded_fees text[] := '{}';
  v_program_total numeric := 0;
  v_extra_costs_total numeric := 0;
  v_accommodation_total numeric := 0;
  v_accommodation_excluded boolean := false;
  v_coord_tiers jsonb;
  v_tier jsonb;
  v_max int;
BEGIN
  IF p_request_id IS NULL THEN RETURN; END IF;

  SELECT completion_status, completed_at, COALESCE(completion_manually_overridden, false),
         COALESCE(number_of_people, 0), COALESCE(jsonb_array_length(selected_dates), 1),
         invoicing_mode, linked_accommodation_id, COALESCE(excluded_fees, '{}'),
         invoice_spec_total_incl_vat
  INTO v_current_status, v_current_completed_at, v_manually_overridden,
       v_number_of_people, v_number_of_days, v_invoicing_mode,
       v_linked_accommodation_id, v_excluded_fees, v_stored_total
  FROM program_requests WHERE id = p_request_id;

  IF NOT FOUND THEN RETURN; END IF;
  IF v_manually_overridden AND v_current_status = 'fully_invoiced' THEN RETURN; END IF;
  IF v_number_of_days < 1 THEN v_number_of_days := 1; END IF;

  SELECT COALESCE(SUM(CASE WHEN invoice_type = 'credit'
    THEN -ABS(COALESCE(amount_incl_vat, 0)) ELSE COALESCE(amount_incl_vat, 0) END), 0)
  INTO v_net_invoiced FROM bureau_invoices WHERE request_id = p_request_id;

  IF v_stored_total IS NOT NULL THEN
    v_grand_total := v_stored_total;
  ELSE
    -- Terugval zolang de app het totaal nog nooit schreef. Zelfde regels als
    -- projectInvoiceSpec: klantregels aanwezig = leidend, anders offerte of
    -- beheerprijs; staffel {maxPeople, fee} (oude vorm min_people/max_people ook).
    SELECT COALESCE((value)::numeric, 0) INTO v_tourist_tax_pp_per_day FROM app_settings WHERE id = 'tourist_tax_pp_per_day';
    SELECT COALESCE((value)::numeric, 0) INTO v_nature_contribution_pp FROM app_settings WHERE id = 'nature_contribution_pp';
    SELECT COALESCE((value)::numeric, 0) INTO v_bureau_central_surcharge_pp FROM app_settings WHERE id = 'bureau_central_surcharge_pp';
    SELECT value INTO v_coord_tiers FROM app_settings WHERE id = 'coordination_fee_tiers';

    IF v_coord_tiers IS NOT NULL AND jsonb_typeof(v_coord_tiers) = 'array' THEN
      FOR v_tier IN SELECT * FROM jsonb_array_elements(v_coord_tiers) LOOP
        v_max := COALESCE((v_tier->>'maxPeople')::int, (v_tier->>'max_people')::int, 999999);
        IF v_number_of_people >= COALESCE((v_tier->>'min_people')::int, 0)
           AND v_number_of_people <= v_max THEN
          v_coordination_fee := COALESCE((v_tier->>'fee')::numeric, 0);
          EXIT;
        END IF;
      END LOOP;
    END IF;

    IF 'coordination_fee' = ANY(v_excluded_fees) THEN v_coordination_fee := 0; END IF;
    IF 'tourist_tax' = ANY(v_excluded_fees) THEN v_tourist_tax_pp_per_day := 0; END IF;
    IF 'nature_contribution' = ANY(v_excluded_fees) THEN v_nature_contribution_pp := 0; END IF;
    IF 'central_surcharge' = ANY(v_excluded_fees) THEN v_bureau_central_surcharge_pp := 0; END IF;
    IF 'accommodation' = ANY(v_excluded_fees) THEN v_accommodation_excluded := true; END IF;

    WITH item_totals AS (
      SELECT i.id, i.day_index,
        CASE
          WHEN EXISTS (SELECT 1 FROM program_item_billing_lines l WHERE l.item_id = i.id)
            THEN (SELECT COALESCE(SUM(amount_incl_vat), 0) FROM program_item_billing_lines WHERE item_id = i.id)
          WHEN i.admin_price_override IS NOT NULL THEN i.admin_price_override
            * CASE WHEN i.price_type IS NULL OR i.price_type IN ('per_person','on_request','per_person_per_day')
                   THEN COALESCE(i.override_people, v_number_of_people) ELSE 1 END
            * CASE WHEN i.price_type = 'per_person_per_day' THEN v_number_of_days ELSE 1 END
          WHEN i.quoted_price IS NOT NULL THEN i.quoted_price
          ELSE 0
        END AS line_total
      FROM program_request_items i
      WHERE i.request_id = p_request_id AND i.status <> 'cancelled'
        AND COALESCE(i.block_type, '') <> 'self_arranged'
    )
    SELECT COALESCE(SUM(CASE WHEN day_index <> -1 THEN line_total ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN day_index = -1 THEN line_total ELSE 0 END), 0)
    INTO v_program_total, v_extra_costs_total FROM item_totals;

    SELECT COALESCE(SUM(q.price_total + COALESCE((SELECT SUM(CASE WHEN e.pricing_type = 'fixed' THEN e.unit_price ELSE e.unit_price * e.quantity END)
      FROM accommodation_quote_extras e WHERE e.quote_id = q.id), 0)), 0)
    INTO v_accommodation_total
    FROM accommodation_quotes q
    WHERE q.status = 'selected' AND q.request_id = v_linked_accommodation_id;
    IF v_accommodation_excluded THEN v_accommodation_total := 0; END IF;

    v_grand_total := v_program_total + v_extra_costs_total + v_coordination_fee
      + (v_tourist_tax_pp_per_day * v_number_of_people * v_number_of_days)
      + (v_nature_contribution_pp * v_number_of_people)
      + (CASE WHEN v_invoicing_mode = 'bureau_central' THEN v_bureau_central_surcharge_pp * v_number_of_people ELSE 0 END)
      + v_accommodation_total;
  END IF;

  v_outstanding := GREATEST(0, v_grand_total - v_net_invoiced);

  IF v_net_invoiced > 0 AND v_outstanding <= 0.005 THEN v_new_status := 'fully_invoiced';
  ELSIF v_net_invoiced > 0 THEN v_new_status := 'partially_invoiced';
  ELSIF v_current_status IN ('partially_invoiced', 'fully_invoiced') THEN v_new_status := 'ready_for_invoice';
  ELSE v_new_status := COALESCE(v_current_status, 'in_progress'); END IF;

  IF v_new_status <> COALESCE(v_current_status, '') THEN
    IF v_new_status = 'fully_invoiced' THEN
      UPDATE program_requests SET completion_status = v_new_status,
        completed_at = COALESCE(v_current_completed_at, now()) WHERE id = p_request_id;
    ELSIF v_current_status = 'fully_invoiced' THEN
      UPDATE program_requests SET completion_status = v_new_status, completed_at = NULL,
        completed_by = NULL WHERE id = p_request_id;
    ELSE
      UPDATE program_requests SET completion_status = v_new_status WHERE id = p_request_id;
    END IF;
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.recalculate_program_completion_for_request(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.recalculate_program_completion_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.recalculate_program_completion_for_request(COALESCE(NEW.request_id, OLD.request_id));
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Schrijft de app een nieuw totaal, dan beweegt de status mee.
CREATE OR REPLACE FUNCTION public.trg_invoice_spec_total_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.invoice_spec_total_incl_vat IS DISTINCT FROM OLD.invoice_spec_total_incl_vat THEN
    PERFORM public.recalculate_program_completion_for_request(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.trg_invoice_spec_total_changed() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_invoice_spec_total_changed ON public.program_requests;
CREATE TRIGGER trg_invoice_spec_total_changed
  AFTER UPDATE OF invoice_spec_total_incl_vat ON public.program_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_invoice_spec_total_changed();

-- ---------------------------------------------------------------------------
-- 3. use_actual_costs weg
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_partner_request_item_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id text;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  v_partner_id := public.get_partner_id(auth.uid());
  IF v_partner_id IS NULL OR NEW.provider_id IS DISTINCT FROM v_partner_id THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.commission_status IS DISTINCT FROM OLD.commission_status
     OR NEW.commission_invoiced_at IS DISTINCT FROM OLD.commission_invoiced_at
     OR NEW.commission_invoice_id IS DISTINCT FROM OLD.commission_invoice_id
     OR NEW.commission_notes IS DISTINCT FROM OLD.commission_notes
     OR COALESCE(NEW.commission_exempt, false) IS DISTINCT FROM COALESCE(OLD.commission_exempt, false)
     OR NEW.commission_exempt_at IS DISTINCT FROM OLD.commission_exempt_at
     OR NEW.commission_exempt_by IS DISTINCT FROM OLD.commission_exempt_by
     OR NEW.commission_exempt_reason IS DISTINCT FROM OLD.commission_exempt_reason
     OR NEW.invoiced_amount IS DISTINCT FROM OLD.invoiced_amount
     OR NEW.invoiced_number IS DISTINCT FROM OLD.invoiced_number
     OR NEW.invoiced_date IS DISTINCT FROM OLD.invoiced_date
     OR NEW.actual_invoiced_excl_vat IS DISTINCT FROM OLD.actual_invoiced_excl_vat
     OR NEW.proforma_commission IS DISTINCT FROM OLD.proforma_commission
     OR NEW.purchase_invoice_id IS DISTINCT FROM OLD.purchase_invoice_id
     OR NEW.purchase_invoice_matched_at IS DISTINCT FROM OLD.purchase_invoice_matched_at
     OR NEW.final_billing_locked_at IS DISTINCT FROM OLD.final_billing_locked_at
     OR NEW.keep_quoted_price IS DISTINCT FROM OLD.keep_quoted_price
     OR NEW.admin_price_override IS DISTINCT FROM OLD.admin_price_override
     OR NEW.admin_price_notes IS DISTINCT FROM OLD.admin_price_notes
     OR NEW.admin_price_override_updated_at IS DISTINCT FROM OLD.admin_price_override_updated_at
     OR NEW.pending_admin_price_override IS DISTINCT FROM OLD.pending_admin_price_override
     OR NEW.pending_admin_price_notes IS DISTINCT FROM OLD.pending_admin_price_notes
     OR NEW.pending_price_type IS DISTINCT FROM OLD.pending_price_type
     OR NEW.pending_override_people IS DISTINCT FROM OLD.pending_override_people
     OR NEW.pending_child_unit_price IS DISTINCT FROM OLD.pending_child_unit_price
     OR NEW.price_type IS DISTINCT FROM OLD.price_type
     OR NEW.override_people IS DISTINCT FROM OLD.override_people
     OR NEW.child_unit_price IS DISTINCT FROM OLD.child_unit_price
     OR COALESCE(NEW.skip_partner_notification, false) IS DISTINCT FROM COALESCE(OLD.skip_partner_notification, false)
     OR NEW.customer_approved_at IS DISTINCT FROM OLD.customer_approved_at
     OR NEW.customer_accepted_at IS DISTINCT FROM OLD.customer_accepted_at
     OR NEW.admin_status_override_reason IS DISTINCT FROM OLD.admin_status_override_reason
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.block_id IS DISTINCT FROM OLD.block_id
  THEN
    RAISE EXCEPTION 'Partners cannot modify commission, billing, pricing-override or audit fields on program request items.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

-- apply_purchase_line_charges zonder de vlag; verder ongewijzigd (fase 2b).
CREATE OR REPLACE FUNCTION public.apply_purchase_line_charges(
  p_request_id uuid,
  p_decisions jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_decision jsonb;
  v_line record;
  v_item record;
  v_action text;
  v_item_id uuid;
  v_cost_key text;
  v_cost_name text;
  v_partner_name text;
  v_vat_rate numeric;
  v_new_cost_ids jsonb := '{}'::jsonb;
  v_touched_items uuid[] := '{}';
  v_touched_invoices uuid[] := '{}';
  v_charged int := 0;
  v_kept int := 0;
  v_skipped int := 0;
  v_reopened int := 0;
  v_new_costs int := 0;
  v_sort int;
  v_inv uuid;
  v_itm uuid;
  v_has_lines boolean;
  v_lines_incl numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen beheerders kunnen doorbelasten.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_decisions IS NULL OR jsonb_typeof(p_decisions) <> 'array' THEN
    RAISE EXCEPTION 'p_decisions moet een array zijn.';
  END IF;

  -- 4a) Nieuwe kostenposten: één per sleutel. Naam en partner uit de eerste
  --     regel met die sleutel; het btw-tarief is dat van de regels (meest
  --     voorkomend), zodat een post zonder bouwsteen een eigen tarief heeft.
  FOR v_cost_key, v_cost_name IN
    SELECT d->>'cost_key', MIN(d->>'cost_name')
      FROM jsonb_array_elements(p_decisions) d
     WHERE d->>'action' = 'new_cost'
     GROUP BY d->>'cost_key'
  LOOP
    IF v_cost_key IS NULL OR v_cost_key = '' THEN
      RAISE EXCEPTION 'Een nieuwe kostenpost heeft een sleutel nodig.';
    END IF;
    IF v_cost_name IS NULL OR btrim(v_cost_name) = '' THEN
      RAISE EXCEPTION 'Een nieuwe kostenpost heeft een naam nodig.';
    END IF;

    SELECT p.name, l.vat_rate
      INTO v_partner_name, v_vat_rate
      FROM jsonb_array_elements(p_decisions) d
      JOIN public.purchase_invoice_lines l ON l.id = (d->>'line_id')::uuid
      JOIN public.partner_purchase_invoices i ON i.id = l.invoice_id
      LEFT JOIN public.partners p ON p.id = i.partner_id
     WHERE d->>'action' = 'new_cost' AND d->>'cost_key' = v_cost_key
       AND COALESCE(l.request_id, i.request_id) = p_request_id
     GROUP BY p.name, l.vat_rate
     ORDER BY COUNT(*) DESC, l.vat_rate DESC
     LIMIT 1;

    INSERT INTO public.program_request_items (
      request_id, block_id, block_name, block_category, block_type,
      provider_id, provider_name, day_index, status, price_type,
      admin_price_override, vat_rate, skip_partner_notification
    ) VALUES (
      p_request_id, NULL, btrim(v_cost_name), 'overig', 'bureau',
      'bureau', COALESCE(v_partner_name, 'Bureau Vlieland'), -1, 'confirmed', 'total',
      0, COALESCE(v_vat_rate, 21), true
    )
    RETURNING id INTO v_item_id;

    v_new_cost_ids := v_new_cost_ids || jsonb_build_object(v_cost_key, v_item_id::text);
    v_new_costs := v_new_costs + 1;
  END LOOP;

  -- 4b) Per regel.
  FOR v_decision IN SELECT * FROM jsonb_array_elements(p_decisions) LOOP
    SELECT l.*, COALESCE(l.request_id, i.request_id) AS line_request_id, i.partner_id
      INTO v_line
      FROM public.purchase_invoice_lines l
      JOIN public.partner_purchase_invoices i ON i.id = l.invoice_id
     WHERE l.id = (v_decision->>'line_id')::uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inkoopregel % bestaat niet.', v_decision->>'line_id';
    END IF;
    IF v_line.line_request_id IS DISTINCT FROM p_request_id THEN
      RAISE EXCEPTION 'Inkoopregel % hoort niet bij dit project.', v_line.id;
    END IF;

    v_action := v_decision->>'action';
    IF v_line.lodging_quote_id IS NOT NULL AND v_action <> 'open' THEN
      RAISE EXCEPTION 'Inkoopregel % is op een logies-offerte toegepast; die bestemming is niet via het werkblad te wijzigen.', v_line.id;
    END IF;
    v_touched_invoices := array_append(v_touched_invoices, v_line.invoice_id);
    IF v_line.item_id IS NOT NULL THEN
      v_touched_items := array_append(v_touched_items, v_line.item_id);
    END IF;

    -- Wat deze regel eerder op de klantfactuur zette, gaat eraf.
    DELETE FROM public.program_item_billing_lines WHERE purchase_invoice_line_id = v_line.id;

    IF v_action = 'skip' THEN
      UPDATE public.purchase_invoice_lines
         SET item_id = NULL,
             charge_status = 'skipped',
             skip_reason = NULLIF(btrim(COALESCE(v_decision->>'skip_reason', '')), ''),
             charged_at = NULL
       WHERE id = v_line.id;
      v_skipped := v_skipped + 1;

    ELSIF v_action = 'open' THEN
      UPDATE public.purchase_invoice_lines
         SET item_id = NULL, charge_status = 'open', skip_reason = NULL, charged_at = NULL
       WHERE id = v_line.id;
      v_reopened := v_reopened + 1;

    ELSIF v_action IN ('item', 'new_cost') THEN
      IF v_action = 'new_cost' THEN
        v_item_id := (v_new_cost_ids->>(v_decision->>'cost_key'))::uuid;
      ELSE
        v_item_id := (v_decision->>'item_id')::uuid;
      END IF;
      IF v_item_id IS NULL THEN
        RAISE EXCEPTION 'Geen onderdeel voor inkoopregel %.', v_line.id;
      END IF;

      SELECT id, request_id, keep_quoted_price INTO v_item
        FROM public.program_request_items WHERE id = v_item_id;
      IF NOT FOUND OR v_item.request_id IS DISTINCT FROM p_request_id THEN
        RAISE EXCEPTION 'Onderdeel % hoort niet bij dit project.', v_item_id;
      END IF;
      v_touched_items := array_append(v_touched_items, v_item_id);

      IF v_item.keep_quoted_price THEN
        UPDATE public.purchase_invoice_lines
           SET item_id = v_item_id, charge_status = 'kept_quote', skip_reason = NULL, charged_at = now()
         WHERE id = v_line.id;
        v_kept := v_kept + 1;
      ELSE
        SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_sort
          FROM public.program_item_billing_lines WHERE item_id = v_item_id;
        INSERT INTO public.program_item_billing_lines (
          item_id, description, quantity, unit_price_excl_vat, vat_rate,
          amount_excl_vat, vat_amount, amount_incl_vat, sort_order,
          source, purchase_invoice_line_id, purchase_invoice_id
        ) VALUES (
          v_item_id,
          left(COALESCE(NULLIF(btrim(v_line.description), ''), 'Regel'), 500),
          COALESCE(NULLIF(v_line.quantity, 0), 1),
          ROUND(v_line.amount_excl_vat / COALESCE(NULLIF(v_line.quantity, 0), 1), 4),
          v_line.vat_rate,
          v_line.amount_excl_vat, v_line.vat_amount, v_line.amount_incl_vat, v_sort,
          'purchase_invoice', v_line.id, v_line.invoice_id
        );
        UPDATE public.purchase_invoice_lines
           SET item_id = v_item_id, charge_status = 'charged', skip_reason = NULL, charged_at = now()
         WHERE id = v_line.id;
        v_charged := v_charged + 1;
      END IF;
    ELSE
      RAISE EXCEPTION 'Onbekende actie % voor inkoopregel %.', v_action, v_line.id;
    END IF;
  END LOOP;

  -- 4c) Per geraakt onderdeel: regels aanwezig = regels leidend (vergrendeling en kostenpostbedrag).
  FOR v_itm IN SELECT DISTINCT unnest(v_touched_items) LOOP
    SELECT EXISTS (SELECT 1 FROM public.program_item_billing_lines WHERE item_id = v_itm),
           COALESCE((SELECT SUM(amount_incl_vat) FROM public.program_item_billing_lines WHERE item_id = v_itm), 0)
      INTO v_has_lines, v_lines_incl;
    IF v_has_lines THEN
      UPDATE public.program_request_items
         SET final_billing_locked_at = COALESCE(final_billing_locked_at, now()),
             -- Een kostenpost zonder bouwsteen toont zijn bedrag ook buiten
             -- de regels om (overige-kostentabel): houd dat gelijk.
             admin_price_override = CASE WHEN day_index = -1 AND block_id IS NULL THEN v_lines_incl ELSE admin_price_override END,
             updated_at = now()
       WHERE id = v_itm;
    ELSE
      UPDATE public.program_request_items
         SET final_billing_locked_at = NULL,
             updated_at = now()
       WHERE id = v_itm;
    END IF;
  END LOOP;

  -- 4d) Verdeling voor de commissie, opnieuw uit de regels. Toeristenbelasting
  --     en andere niet-doorbelaste regels tellen niet mee (huisregel). De
  --     triggers op de allocaties vullen daarna de commissievelden.
  FOR v_inv IN SELECT DISTINCT unnest(v_touched_invoices) LOOP
    IF EXISTS (SELECT 1 FROM public.purchase_invoice_lines WHERE invoice_id = v_inv AND charge_status = 'legacy') THEN
      CONTINUE;
    END IF;
    DELETE FROM public.partner_purchase_invoice_allocations WHERE invoice_id = v_inv;
    INSERT INTO public.partner_purchase_invoice_allocations (
      invoice_id, item_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, sort_order
    )
    SELECT v_inv, l.item_id,
           ROUND(SUM(l.amount_excl_vat), 2), l.vat_rate,
           ROUND(SUM(l.vat_amount), 2), ROUND(SUM(l.amount_incl_vat), 2),
           left(string_agg(l.description, ' + ' ORDER BY l.sort_order), 500),
           row_number() OVER (ORDER BY MIN(l.sort_order)) - 1
      FROM public.purchase_invoice_lines l
     WHERE l.invoice_id = v_inv
       AND l.item_id IS NOT NULL
       AND l.charge_status IN ('charged', 'kept_quote')
     GROUP BY l.item_id, l.vat_rate;
  END LOOP;

  RETURN jsonb_build_object(
    'charged', v_charged,
    'kept', v_kept,
    'skipped', v_skipped,
    'reopened', v_reopened,
    'new_costs', v_new_costs,
    'new_cost_ids', v_new_cost_ids
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_purchase_line_charges(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_purchase_line_charges(uuid, jsonb) TO authenticated;

ALTER TABLE public.program_request_items DROP COLUMN IF EXISTS use_actual_costs;
