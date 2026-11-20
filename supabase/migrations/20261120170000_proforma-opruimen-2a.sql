-- Database-opruiming na docs/plan-proforma-factuur.md, stap 2a.
--
-- Projecten die vóór de proforma al volledig gefactureerd waren krijgen
-- een proforma met status 'registered', zodat zij niet meer van de
-- klantregels (program_item_billing_lines) afhangen en stap 2b die tabel
-- kan laten vallen. De regels komen uit de bevroren bureau_invoice_lines
-- van de eindfactuur als die het hele project dekken (geen samenvattende
-- regels); anders één samenvattende regel per factuur uit de kop, zodat
-- het proformatotaal gelijk is aan wat is gefactureerd en de
-- voltooiingsstatus niet verschuift. Een geregistreerde proforma is
-- bevroren en schrijft het projecttotaal niet (trigger uit fase 3).
--
-- Verder leest de voltooiingsstatus de klantregels niet meer in haar
-- terugval (alleen gebruikt zonder opgeslagen totaal).

DO $$
DECLARE
  r record;
  v_invoice record;
  v_proforma_id uuid;
  v_has_full boolean;
  v_sort int;
BEGIN
  FOR r IN
    SELECT pr.id, pr.completed_at, pr.created_at
      FROM public.program_requests pr
     WHERE pr.completion_status = 'fully_invoiced'
       AND NOT EXISTS (SELECT 1 FROM public.project_proformas p WHERE p.request_id = pr.id)
       AND EXISTS (SELECT 1 FROM public.bureau_invoices b WHERE b.request_id = pr.id)
  LOOP
    -- De eindfactuur met volledige regels, als die er is.
    SELECT b.* INTO v_invoice
      FROM public.bureau_invoices b
     WHERE b.request_id = r.id
       AND b.invoice_type = 'final'
       AND EXISTS (SELECT 1 FROM public.bureau_invoice_lines l WHERE l.invoice_id = b.id)
       AND NOT EXISTS (SELECT 1 FROM public.bureau_invoice_lines l WHERE l.invoice_id = b.id AND l.kind = 'summary')
     ORDER BY b.invoice_date DESC, b.created_at DESC
     LIMIT 1;
    v_has_full := FOUND;

    -- Eerst als concept: de regels van een geregistreerde proforma zijn
    -- bevroren (trigger uit fase 1), dus de regels gaan erin vóór de status
    -- op 'registered' gaat.
    INSERT INTO public.project_proformas (request_id, status, accepted_at, registered_invoice_id)
    VALUES (r.id, 'concept', COALESCE(r.completed_at, r.created_at, now()), CASE WHEN v_has_full THEN v_invoice.id ELSE NULL END)
    RETURNING id INTO v_proforma_id;

    IF v_has_full THEN
      INSERT INTO public.project_proforma_lines (
        proforma_id, sort_order, kind, section, item_id, description, sub_description,
        quantity, quantity_label, unit_price_excl_vat, unit_suffix, vat_rate,
        amount_excl_vat, vat_amount, amount_incl_vat,
        origin, line_status, line_key, quote_amount_incl_vat, accepted_amount_incl_vat
      )
      SELECT v_proforma_id, l.sort_order, l.kind, l.section, l.item_id, l.description, l.sub_description,
             l.quantity, l.quantity_label, l.unit_price_excl_vat, l.unit_suffix, l.vat_rate,
             l.amount_excl_vat, l.vat_amount, l.amount_incl_vat,
             CASE WHEN l.item_id IS NOT NULL THEN 'quote_item' ELSE 'manual' END, 'active',
             CASE WHEN l.item_id IS NOT NULL AND l.kind <> 'sub' THEN 'item:' || l.item_id::text ELSE NULL END,
             l.amount_incl_vat, l.amount_incl_vat
        FROM public.bureau_invoice_lines l
       WHERE l.invoice_id = v_invoice.id
       ORDER BY l.sort_order;
    ELSE
      v_sort := 0;
      FOR v_invoice IN
        SELECT * FROM public.bureau_invoices b WHERE b.request_id = r.id ORDER BY b.invoice_date, b.created_at
      LOOP
        INSERT INTO public.project_proforma_lines (
          proforma_id, sort_order, kind, section, item_id, description, sub_description,
          quantity, quantity_label, unit_price_excl_vat, unit_suffix, vat_rate,
          amount_excl_vat, vat_amount, amount_incl_vat,
          origin, line_status, line_key
        ) VALUES (
          v_proforma_id, v_sort, 'summary', 'Facturen', NULL,
          CASE v_invoice.invoice_type WHEN 'final' THEN 'Eindfactuur ' WHEN 'credit' THEN 'Creditnota ' ELSE 'Deelfactuur ' END || v_invoice.invoice_number,
          v_invoice.description,
          1, '1',
          CASE WHEN v_invoice.invoice_type = 'credit' THEN -1 ELSE 1 END * v_invoice.amount_excl_vat, '',
          CASE WHEN v_invoice.amount_excl_vat <> 0 THEN ROUND(v_invoice.vat_amount / v_invoice.amount_excl_vat * 100) ELSE 21 END,
          CASE WHEN v_invoice.invoice_type = 'credit' THEN -1 ELSE 1 END * v_invoice.amount_excl_vat,
          CASE WHEN v_invoice.invoice_type = 'credit' THEN -1 ELSE 1 END * v_invoice.vat_amount,
          CASE WHEN v_invoice.invoice_type = 'credit' THEN -1 ELSE 1 END * (v_invoice.amount_excl_vat + v_invoice.vat_amount),
          'manual', 'active', NULL
        );
        v_sort := v_sort + 1;
      END LOOP;
    END IF;

    UPDATE public.project_proformas SET status = 'registered' WHERE id = v_proforma_id;
  END LOOP;
END $$;

-- De terugval van de voltooiingsstatus zonder klantregels.
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
