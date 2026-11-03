-- Lege kostenposten opruimen na doorbelasten.
--
-- Het werkblad Doorbelasten maakt per partner een kostenpost ("overige
-- kosten", day_index -1, zonder bouwsteen) en zet het bedrag van die post
-- gelijk aan de som van de klantregels. Werden de regels daarna via "Wijzig"
-- ergens anders heen gestuurd, of verdween de inkoopfactuur, dan bleef de
-- post staan mét het oude bedrag: een spookpost die de klant alsnog betaalde
-- (BV-2606-0013: "Badhotel Bruin" € 2.691,19 naast de echte € 2.848,16).
--
--  * program_request_items.created_from_purchase_lines: aan voor posten die
--    het werkblad zelf aanmaakte, zodat die weg mogen zodra ze leeg zijn.
--    Een handmatige kostenpost die als bestemming is gebruikt blijft staan,
--    maar gaat op € 0 (het handmatige bedrag was al overschreven).
--  * apply_purchase_line_charges(): ruimt in stap 4c op en meldt
--    'removed_costs'. Verder ongewijzigd.
--
-- Bestaande lege spookposten kennen de vlag niet en blijven staan; die haal
-- je met het prullenbakje bij "Overige kosten" weg.

ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS created_from_purchase_lines boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.program_request_items.created_from_purchase_lines IS
  'Aan: kostenpost die het werkblad Doorbelasten aanmaakte uit inkoopregels. Raakt de post leeg (geen klantregels en geen inkoopregels meer), dan verwijdert apply_purchase_line_charges hem.';

-- Posten waar nu inkoopregels aan hangen zijn door het werkblad beheerd.
UPDATE public.program_request_items i
   SET created_from_purchase_lines = true
 WHERE i.day_index = -1
   AND i.block_id IS NULL
   AND i.provider_id = 'bureau'
   AND EXISTS (
     SELECT 1 FROM public.purchase_invoice_lines l
      WHERE l.item_id = i.id AND l.charge_status IN ('charged', 'kept_quote')
   )
   AND EXISTS (
     SELECT 1 FROM public.program_item_billing_lines b
      WHERE b.item_id = i.id AND b.source = 'purchase_invoice'
   );

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
  v_removed_costs int := 0;
  v_cost record;
  v_lines_ref boolean;
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
      admin_price_override, vat_rate, skip_partner_notification,
      created_from_purchase_lines
    ) VALUES (
      p_request_id, NULL, btrim(v_cost_name), 'overig', 'bureau',
      'bureau', COALESCE(v_partner_name, 'Bureau Vlieland'), -1, 'confirmed', 'total',
      0, COALESCE(v_vat_rate, 21), true,
      true
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
      -- Geen klantregels meer. Een kostenpost zonder bouwsteen toont dan
      -- nog het bedrag van de regels die er net af zijn gehaald (3 november
      -- 2026, Badhotel Bruin: een lege post van € 2.691,19 naast de echte).
      -- Verwijst geen enkele inkoopregel meer naar de post, dan gaat een
      -- door het werkblad aangemaakte post weg en een handmatige op € 0.
      SELECT day_index, block_id, created_from_purchase_lines
        INTO v_cost
        FROM public.program_request_items WHERE id = v_itm;
      SELECT EXISTS (
        SELECT 1 FROM public.purchase_invoice_lines
         WHERE item_id = v_itm AND charge_status IN ('charged', 'kept_quote', 'legacy')
      ) INTO v_lines_ref;
      IF v_cost.day_index = -1 AND v_cost.block_id IS NULL AND NOT v_lines_ref THEN
        IF v_cost.created_from_purchase_lines THEN
          DELETE FROM public.program_request_items WHERE id = v_itm;
          v_removed_costs := v_removed_costs + 1;
        ELSE
          UPDATE public.program_request_items
             SET final_billing_locked_at = NULL,
                 admin_price_override = 0,
                 updated_at = now()
           WHERE id = v_itm;
        END IF;
      ELSE
        UPDATE public.program_request_items
           SET final_billing_locked_at = NULL,
               updated_at = now()
         WHERE id = v_itm;
      END IF;
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
    'removed_costs', v_removed_costs,
    'new_cost_ids', v_new_cost_ids
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_purchase_line_charges(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_purchase_line_charges(uuid, jsonb) TO authenticated;
