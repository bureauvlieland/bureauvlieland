-- Werkblad "Doorbelasten" (docs/plan-inkoopfacturen-doorbelasten.md, fase 2).
--
-- Een inkoopfactuur hangt sinds fase 1 als geheel aan een project. Hier
-- krijgen de orderregels van zo'n factuur een bestemming: een programma-
-- onderdeel, een kostenpost (overige kosten) of "niet doorbelasten". Het
-- bevestigen schrijft in één transactie de klantregels
-- (program_item_billing_lines) én de verdeling voor de commissie
-- (partner_purchase_invoice_allocations), zodat de bestaande trigger
-- sync_item_invoice_fields de commissievelden blijft vullen.
--
--  * purchase_invoice_lines: bestemming (item_id) en status per regel.
--  * program_item_billing_lines: herkomst (bron-regel en bron-factuur), met
--    ON DELETE CASCADE zodat een verwijderde inkoopfactuur zijn klantregels
--    meeneemt.
--  * program_request_items.keep_quoted_price: "offerteprijs houden" — de
--    regel telt mee voor de commissie, maar vervangt de offerteprijs niet.
--  * apply_purchase_line_charges(): de ene schrijfactie van het werkblad.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Inkoopregels: bestemming en status
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.purchase_invoice_lines
  ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.program_request_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS charge_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS skip_reason text,
  ADD COLUMN IF NOT EXISTS charged_at timestamptz;

ALTER TABLE public.purchase_invoice_lines
  DROP CONSTRAINT IF EXISTS purchase_invoice_lines_charge_status_check;
ALTER TABLE public.purchase_invoice_lines
  ADD CONSTRAINT purchase_invoice_lines_charge_status_check
  CHECK (charge_status IN ('open', 'charged', 'kept_quote', 'skipped', 'legacy'));

COMMENT ON COLUMN public.purchase_invoice_lines.item_id IS
  'Bestemming van de regel: programma-onderdeel of kostenpost (day_index -1). NULL als open of niet doorbelast.';
COMMENT ON COLUMN public.purchase_invoice_lines.charge_status IS
  'open = nog te verwerken; charged = klantregel aangemaakt; kept_quote = gekoppeld aan onderdeel, offerteprijs blijft; skipped = niet doorbelast (skip_reason); legacy = verwerkt vóór het werkblad.';

CREATE INDEX IF NOT EXISTS purchase_invoice_lines_item_id_idx
  ON public.purchase_invoice_lines(item_id);

-- Regels van facturen die vóór het werkblad al aan onderdelen hingen, zijn
-- toen op de oude manier verdeeld. Die laten we met rust: 'legacy'. Alleen
-- regels van facturen zonder enige koppeling blijven 'open'.
UPDATE public.purchase_invoice_lines l
   SET charge_status = 'legacy'
  FROM public.partner_purchase_invoices i
 WHERE i.id = l.invoice_id
   AND l.charge_status = 'open'
   AND (
     i.item_id IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.partner_purchase_invoice_allocations a WHERE a.invoice_id = i.id)
   );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Klantregels: herkomst
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.program_item_billing_lines
  ADD COLUMN IF NOT EXISTS purchase_invoice_line_id uuid REFERENCES public.purchase_invoice_lines(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS purchase_invoice_id uuid REFERENCES public.partner_purchase_invoices(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.program_item_billing_lines
  DROP CONSTRAINT IF EXISTS program_item_billing_lines_source_check;
ALTER TABLE public.program_item_billing_lines
  ADD CONSTRAINT program_item_billing_lines_source_check
  CHECK (source IN ('manual', 'purchase_invoice'));

CREATE INDEX IF NOT EXISTS program_item_billing_lines_purchase_invoice_line_idx
  ON public.program_item_billing_lines(purchase_invoice_line_id);
CREATE INDEX IF NOT EXISTS program_item_billing_lines_purchase_invoice_idx
  ON public.program_item_billing_lines(purchase_invoice_id);

COMMENT ON COLUMN public.program_item_billing_lines.source IS
  'manual = met de hand ingevoerd in de regeleditor; purchase_invoice = door het werkblad Doorbelasten uit een inkoopregel gemaakt (niet los bewerkbaar).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Offerteprijs houden
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS keep_quoted_price boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.program_request_items.keep_quoted_price IS
  'Aan: inkoopregels die aan dit onderdeel worden gekoppeld tellen mee voor de commissie, maar vervangen de offerteprijs niet (geen klantregels).';

-- Partners mogen de vlag niet aanraken: zelfde guard als de andere
-- facturatievelden.
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
     OR NEW.use_actual_costs IS DISTINCT FROM OLD.use_actual_costs
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) De schrijfactie van het werkblad
-- ─────────────────────────────────────────────────────────────────────────────
-- p_decisions: jsonb-array met per inkoopregel één besluit:
--   { "line_id": uuid,
--     "action": "item" | "new_cost" | "skip" | "open",
--     "item_id": uuid          (bij "item": onderdeel of bestaande kostenpost),
--     "cost_key": text,        (bij "new_cost": regels met dezelfde sleutel
--                               komen op één nieuwe kostenpost),
--     "cost_name": text,       (bij "new_cost": naam van die kostenpost),
--     "skip_reason": text }    (bij "skip")
--
-- Per regel: bestaande klantregels uit die regel weg, nieuwe klantregel erbij
-- (tenzij het onderdeel "offerteprijs houden" heeft), status en bestemming op
-- de regel. Daarna per geraakt onderdeel de vlaggen, en per geraakte factuur
-- de verdeling voor de commissie opnieuw uit de regels. Facturen met
-- 'legacy'-regels houden hun oude verdeling tot alle regels opnieuw zijn
-- verdeeld.
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
       AND i.request_id = p_request_id
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
    SELECT l.*, i.request_id AS invoice_request_id, i.partner_id
      INTO v_line
      FROM public.purchase_invoice_lines l
      JOIN public.partner_purchase_invoices i ON i.id = l.invoice_id
     WHERE l.id = (v_decision->>'line_id')::uuid;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inkoopregel % bestaat niet.', v_decision->>'line_id';
    END IF;
    IF v_line.invoice_request_id IS DISTINCT FROM p_request_id THEN
      RAISE EXCEPTION 'Inkoopregel % hoort niet bij dit project.', v_line.id;
    END IF;

    v_action := v_decision->>'action';
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

  -- 4c) Vlaggen per geraakt onderdeel: regels aanwezig = regels leidend.
  FOR v_itm IN SELECT DISTINCT unnest(v_touched_items) LOOP
    SELECT EXISTS (SELECT 1 FROM public.program_item_billing_lines WHERE item_id = v_itm),
           COALESCE((SELECT SUM(amount_incl_vat) FROM public.program_item_billing_lines WHERE item_id = v_itm), 0)
      INTO v_has_lines, v_lines_incl;
    IF v_has_lines THEN
      UPDATE public.program_request_items
         SET use_actual_costs = true,
             final_billing_locked_at = COALESCE(final_billing_locked_at, now()),
             -- Een kostenpost zonder bouwsteen toont zijn bedrag ook buiten
             -- de regels om (overige-kostentabel): houd dat gelijk.
             admin_price_override = CASE WHEN day_index = -1 AND block_id IS NULL THEN v_lines_incl ELSE admin_price_override END,
             updated_at = now()
       WHERE id = v_itm;
    ELSE
      UPDATE public.program_request_items
         SET use_actual_costs = false,
             final_billing_locked_at = NULL,
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
