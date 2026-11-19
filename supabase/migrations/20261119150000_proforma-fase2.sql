-- Fase 2 van docs/plan-proforma-factuur.md: doorbelasten op de proforma.
--
-- Eén databasefunctie, apply_proforma_changes, verwerkt in één transactie de
-- besluiten van het werkblad:
--   replace  een offerteregel vervangen door een of meer inkoopregels
--   add      inkoopregels als eigen regel op de proforma (zonder onderdeel)
--   revert   een inkoopregel van de proforma halen (de offerteregel komt terug)
--   hide     een regel verbergen (telt niet mee), met reden
--   unhide   een verborgen regel terugzetten
--   keep     een inkoopregel laten staan: niet op de factuur, met reden
--   reopen   een gelaten inkoopregel weer open zetten
--
-- De inkoopregel krijgt dezelfde charge_status als bij het oude werkblad
-- (charged, skipped, open), zodat de commissiewerklijst niets merkt. De
-- verdeling voor de commissie (partner_purchase_invoice_allocations) wordt per
-- geraakte factuur opnieuw opgebouwd uit de actieve proformaregels met een
-- onderdeel, net als apply_purchase_line_charges dat uit de klantregels deed.

-- ---------------------------------------------------------------------------
-- 1. Verdeling voor de commissie uit de proforma
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_allocations_from_proforma(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_has_proforma_lines boolean;
  v_has_legacy boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.project_proforma_lines pl
      JOIN public.project_proformas p ON p.id = pl.proforma_id
     WHERE pl.purchase_invoice_id = p_invoice_id AND p.status = 'concept'
  ) INTO v_has_proforma_lines;
  SELECT EXISTS (
    SELECT 1 FROM public.purchase_invoice_lines WHERE invoice_id = p_invoice_id AND charge_status = 'legacy'
  ) INTO v_has_legacy;

  -- Een factuur die de proforma nooit raakte en nog een oude verdeling heeft
  -- (partnerportaal, vóór het werkblad) houdt die verdeling.
  IF NOT v_has_proforma_lines AND v_has_legacy THEN
    RETURN;
  END IF;

  DELETE FROM public.partner_purchase_invoice_allocations WHERE invoice_id = p_invoice_id;
  INSERT INTO public.partner_purchase_invoice_allocations (
    invoice_id, item_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, sort_order
  )
  SELECT p_invoice_id, pl.item_id,
         ROUND(SUM(pl.amount_excl_vat), 2), pl.vat_rate,
         ROUND(SUM(pl.vat_amount), 2), ROUND(SUM(pl.amount_incl_vat), 2),
         left(string_agg(pl.description, ' + ' ORDER BY pl.sort_order, pl.created_at), 500),
         row_number() OVER (ORDER BY MIN(pl.sort_order), MIN(pl.created_at)) - 1
    FROM public.project_proforma_lines pl
    JOIN public.project_proformas p ON p.id = pl.proforma_id
   WHERE pl.purchase_invoice_id = p_invoice_id
     AND p.status = 'concept'
     AND pl.line_status = 'active'
     AND pl.item_id IS NOT NULL
   GROUP BY pl.item_id, pl.vat_rate;
END;
$function$;

REVOKE ALL ON FUNCTION public.rebuild_allocations_from_proforma(uuid) FROM public;

-- ---------------------------------------------------------------------------
-- 2. De schrijfactie van het werkblad
-- ---------------------------------------------------------------------------
-- p_changes: jsonb-array met per besluit één object:
--   { "action": "replace", "line_id": <proformaregel>, "purchase_line_ids": [uuid, …] }
--   { "action": "add",     "purchase_line_ids": [uuid, …], "section": text (optioneel) }
--   { "action": "revert",  "line_id": <proformaregel met inkoopbron> }
--   { "action": "hide",    "line_id": <proformaregel>, "reason": text }
--   { "action": "unhide",  "line_id": <proformaregel> }
--   { "action": "keep",    "purchase_line_id": uuid, "reason": text }
--   { "action": "reopen",  "purchase_line_id": uuid }
CREATE OR REPLACE FUNCTION public.apply_proforma_changes(
  p_request_id uuid,
  p_changes jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_proforma_id uuid;
  v_change jsonb;
  v_action text;
  v_line record;
  v_target record;
  v_pl record;
  v_pl_id uuid;
  v_section text;
  v_sort int;
  v_touched_invoices uuid[] := '{}';
  v_inv uuid;
  v_replaced int := 0;
  v_added int := 0;
  v_reverted int := 0;
  v_hidden int := 0;
  v_unhidden int := 0;
  v_kept int := 0;
  v_reopened int := 0;
  v_still_replaced boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen beheerders kunnen de proforma bewerken.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'array' THEN
    RAISE EXCEPTION 'p_changes moet een array zijn.';
  END IF;

  SELECT id INTO v_proforma_id
    FROM public.project_proformas
   WHERE request_id = p_request_id AND status = 'concept';
  IF v_proforma_id IS NULL THEN
    RAISE EXCEPTION 'Dit project heeft geen proforma in concept.';
  END IF;

  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    v_action := v_change->>'action';

    -- ── replace / add: inkoopregels op de proforma zetten ───────────────────
    IF v_action IN ('replace', 'add') THEN
      v_target := NULL;
      IF v_action = 'replace' THEN
        SELECT * INTO v_target FROM public.project_proforma_lines
         WHERE id = (v_change->>'line_id')::uuid AND proforma_id = v_proforma_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Proformaregel % bestaat niet op deze proforma.', v_change->>'line_id';
        END IF;
        IF v_target.origin NOT IN ('quote_item', 'lodging') THEN
          RAISE EXCEPTION 'Alleen een offerte- of logiesregel kan worden vervangen.';
        END IF;
        IF v_target.line_status = 'hidden' THEN
          RAISE EXCEPTION 'Een verborgen regel kan niet worden vervangen; zet hem eerst terug.';
        END IF;
      END IF;

      IF jsonb_typeof(v_change->'purchase_line_ids') <> 'array' OR jsonb_array_length(v_change->'purchase_line_ids') = 0 THEN
        RAISE EXCEPTION 'Kies minstens één inkoopregel.';
      END IF;

      FOR v_pl_id IN SELECT (x)::uuid FROM jsonb_array_elements_text(v_change->'purchase_line_ids') x LOOP
        SELECT l.*, i.partner_id, i.invoice_number, p.name AS partner_name, i.billed_to
          INTO v_pl
          FROM public.purchase_invoice_lines l
          JOIN public.partner_purchase_invoices i ON i.id = l.invoice_id
          LEFT JOIN public.partners p ON p.id = i.partner_id
         WHERE l.id = v_pl_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Inkoopregel % bestaat niet.', v_pl_id;
        END IF;
        IF v_pl.request_id IS DISTINCT FROM p_request_id THEN
          RAISE EXCEPTION 'Inkoopregel % hoort niet bij dit project.', v_pl_id;
        END IF;
        IF COALESCE(v_pl.billed_to, 'bureau') = 'customer' THEN
          RAISE EXCEPTION 'Deze factuur betaalde de gast rechtstreeks; die hoort niet op de klantfactuur.';
        END IF;
        IF EXISTS (
          SELECT 1 FROM public.project_proforma_lines
           WHERE proforma_id = v_proforma_id AND purchase_invoice_line_id = v_pl_id
        ) THEN
          RAISE EXCEPTION 'Inkoopregel "%" staat al op de proforma.', v_pl.description;
        END IF;

        IF v_action = 'replace' THEN
          v_section := v_target.section;
          v_sort := v_target.sort_order;
        ELSE
          v_section := COALESCE(NULLIF(btrim(v_change->>'section'), ''), v_pl.partner_name, 'Overige kosten');
          SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort
            FROM public.project_proforma_lines WHERE proforma_id = v_proforma_id;
        END IF;

        INSERT INTO public.project_proforma_lines (
          proforma_id, sort_order, kind, section, item_id,
          description, sub_description, quantity, quantity_label,
          unit_price_excl_vat, unit_suffix, vat_rate,
          amount_excl_vat, vat_amount, amount_incl_vat,
          origin, line_status, line_key, replaces_line_id,
          purchase_invoice_line_id, purchase_invoice_id,
          quote_amount_incl_vat, accepted_amount_incl_vat
        ) VALUES (
          v_proforma_id, v_sort,
          CASE WHEN v_action = 'replace' THEN 'item' ELSE 'cost' END,
          v_section,
          CASE WHEN v_action = 'replace' THEN v_target.item_id ELSE NULL END,
          left(COALESCE(NULLIF(btrim(v_pl.description), ''), 'Regel'), 500),
          left(concat_ws(' · ', v_pl.partner_name, CASE WHEN v_pl.invoice_number IS NOT NULL THEN 'factuur ' || v_pl.invoice_number END), 500),
          COALESCE(NULLIF(v_pl.quantity, 0), 1),
          CASE WHEN COALESCE(NULLIF(v_pl.quantity, 0), 1) = 1 THEN '1' ELSE trim(trailing '.' from trim(trailing '0' from v_pl.quantity::text)) END,
          ROUND(v_pl.amount_excl_vat / COALESCE(NULLIF(v_pl.quantity, 0), 1), 4),
          '',
          v_pl.vat_rate,
          v_pl.amount_excl_vat, v_pl.vat_amount, v_pl.amount_incl_vat,
          'purchase_line', 'active', NULL,
          CASE WHEN v_action = 'replace' THEN v_target.id ELSE NULL END,
          v_pl.id, v_pl.invoice_id,
          NULL, NULL
        );

        UPDATE public.purchase_invoice_lines
           SET item_id = CASE WHEN v_action = 'replace' THEN v_target.item_id ELSE NULL END,
               charge_status = 'charged',
               skip_reason = NULL,
               charged_at = now()
         WHERE id = v_pl.id;

        v_touched_invoices := array_append(v_touched_invoices, v_pl.invoice_id);
        IF v_action = 'replace' THEN v_replaced := v_replaced + 1; ELSE v_added := v_added + 1; END IF;
      END LOOP;

      IF v_action = 'replace' THEN
        UPDATE public.project_proforma_lines
           SET line_status = 'replaced', hidden_reason = NULL
         WHERE id = v_target.id;
      END IF;

    -- ── revert: inkoopregel van de proforma, offerteregel terug ─────────────
    ELSIF v_action = 'revert' THEN
      SELECT * INTO v_line FROM public.project_proforma_lines
       WHERE id = (v_change->>'line_id')::uuid AND proforma_id = v_proforma_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Proformaregel % bestaat niet op deze proforma.', v_change->>'line_id';
      END IF;
      IF v_line.origin <> 'purchase_line' OR v_line.purchase_invoice_line_id IS NULL THEN
        RAISE EXCEPTION 'Alleen een regel uit een inkoopfactuur kan worden teruggedraaid.';
      END IF;

      DELETE FROM public.project_proforma_lines WHERE id = v_line.id;

      UPDATE public.purchase_invoice_lines
         SET item_id = NULL, charge_status = 'open', skip_reason = NULL, charged_at = NULL
       WHERE id = v_line.purchase_invoice_line_id;

      IF v_line.replaces_line_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM public.project_proforma_lines
           WHERE replaces_line_id = v_line.replaces_line_id AND line_status = 'active'
        ) INTO v_still_replaced;
        IF NOT v_still_replaced THEN
          UPDATE public.project_proforma_lines
             SET line_status = 'active', hidden_reason = NULL
           WHERE id = v_line.replaces_line_id AND line_status = 'replaced';
        END IF;
      END IF;

      v_touched_invoices := array_append(v_touched_invoices, v_line.purchase_invoice_id);
      v_reverted := v_reverted + 1;

    -- ── hide / unhide ───────────────────────────────────────────────────────
    ELSIF v_action = 'hide' THEN
      UPDATE public.project_proforma_lines
         SET line_status = 'hidden',
             hidden_reason = NULLIF(btrim(COALESCE(v_change->>'reason', '')), '')
       WHERE id = (v_change->>'line_id')::uuid AND proforma_id = v_proforma_id AND line_status = 'active'
       RETURNING purchase_invoice_id INTO v_inv;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Alleen een actieve regel kan worden verborgen.';
      END IF;
      IF v_inv IS NOT NULL THEN v_touched_invoices := array_append(v_touched_invoices, v_inv); END IF;
      v_hidden := v_hidden + 1;

    ELSIF v_action = 'unhide' THEN
      UPDATE public.project_proforma_lines
         SET line_status = 'active', hidden_reason = NULL
       WHERE id = (v_change->>'line_id')::uuid AND proforma_id = v_proforma_id AND line_status = 'hidden'
       RETURNING purchase_invoice_id INTO v_inv;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Alleen een verborgen regel kan worden teruggezet.';
      END IF;
      IF v_inv IS NOT NULL THEN v_touched_invoices := array_append(v_touched_invoices, v_inv); END IF;
      v_unhidden := v_unhidden + 1;

    -- ── keep / reopen: inkoopregel laten staan of weer open ─────────────────
    ELSIF v_action IN ('keep', 'reopen') THEN
      SELECT * INTO v_pl FROM public.purchase_invoice_lines WHERE id = (v_change->>'purchase_line_id')::uuid;
      IF NOT FOUND OR v_pl.request_id IS DISTINCT FROM p_request_id THEN
        RAISE EXCEPTION 'Inkoopregel % hoort niet bij dit project.', v_change->>'purchase_line_id';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.project_proforma_lines
         WHERE proforma_id = v_proforma_id AND purchase_invoice_line_id = v_pl.id
      ) THEN
        RAISE EXCEPTION 'Inkoopregel "%" staat op de proforma; draai die eerst terug.', v_pl.description;
      END IF;
      IF v_action = 'keep' THEN
        UPDATE public.purchase_invoice_lines
           SET item_id = NULL, charge_status = 'skipped',
               skip_reason = NULLIF(btrim(COALESCE(v_change->>'reason', '')), ''), charged_at = NULL
         WHERE id = v_pl.id;
        v_kept := v_kept + 1;
      ELSE
        UPDATE public.purchase_invoice_lines
           SET item_id = NULL, charge_status = 'open', skip_reason = NULL, charged_at = NULL
         WHERE id = v_pl.id;
        v_reopened := v_reopened + 1;
      END IF;
      v_touched_invoices := array_append(v_touched_invoices, v_pl.invoice_id);

    ELSE
      RAISE EXCEPTION 'Onbekende actie %.', v_action;
    END IF;
  END LOOP;

  FOR v_inv IN SELECT DISTINCT unnest(v_touched_invoices) LOOP
    PERFORM public.rebuild_allocations_from_proforma(v_inv);
  END LOOP;

  UPDATE public.project_proformas SET updated_at = now() WHERE id = v_proforma_id;

  RETURN jsonb_build_object(
    'replaced', v_replaced,
    'added', v_added,
    'reverted', v_reverted,
    'hidden', v_hidden,
    'unhidden', v_unhidden,
    'kept', v_kept,
    'reopened', v_reopened
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_proforma_changes(uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_proforma_changes(uuid, jsonb) TO authenticated;
