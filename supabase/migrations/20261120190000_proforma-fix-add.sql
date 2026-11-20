-- Herstel in apply_proforma_changes (fase 2): bij "add" (inkoopregel als
-- eigen regel, zonder offerteregel) bleef het record v_target
-- niet-toegewezen en gaf PL/pgSQL "record v_target is not assigned yet" bij
-- het lezen van v_target.item_id. De vervangen regel staat nu in losse
-- velden die bij "add" NULL zijn. Verder ongewijzigd.

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
  v_target_id uuid;
  v_target_item_id uuid;
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
      -- Een record-variabele mag in PL/pgSQL niet gelezen worden zolang hij
      -- niet is toegewezen; daarom losse velden voor de vervangen regel.
      v_target_id := NULL;
      v_target_item_id := NULL;
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
        v_target_id := v_target.id;
        v_target_item_id := v_target.item_id;
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
          v_target_item_id,
          left(COALESCE(NULLIF(btrim(v_pl.description), ''), 'Regel'), 500),
          left(concat_ws(' · ', v_pl.partner_name, CASE WHEN v_pl.invoice_number IS NOT NULL THEN 'factuur ' || v_pl.invoice_number END), 500),
          COALESCE(NULLIF(v_pl.quantity, 0), 1),
          CASE WHEN COALESCE(NULLIF(v_pl.quantity, 0), 1) = 1 THEN '1' ELSE trim(trailing '.' from trim(trailing '0' from v_pl.quantity::text)) END,
          ROUND(v_pl.amount_excl_vat / COALESCE(NULLIF(v_pl.quantity, 0), 1), 4),
          '',
          v_pl.vat_rate,
          v_pl.amount_excl_vat, v_pl.vat_amount, v_pl.amount_incl_vat,
          'purchase_line', 'active', NULL,
          v_target_id,
          v_pl.id, v_pl.invoice_id,
          NULL, NULL
        );

        UPDATE public.purchase_invoice_lines
           SET item_id = v_target_item_id,
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
         WHERE id = v_target_id;
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
