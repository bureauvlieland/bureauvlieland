ALTER TABLE public.bureau_invoices
  ADD COLUMN IF NOT EXISTS vat_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS completion_manually_overridden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_override_reason text,
  ADD COLUMN IF NOT EXISTS completion_override_outstanding numeric;

CREATE OR REPLACE FUNCTION public.recalculate_program_completion_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request_id uuid;
  v_net_invoiced numeric := 0;
  v_grand_total numeric := 0;
  v_outstanding numeric := 0;
  v_current_status text;
  v_current_completed_at timestamptz;
  v_manually_overridden boolean := false;
  v_new_status text;
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
  v_coord_tiers jsonb;
  v_tier jsonb;
BEGIN
  v_request_id := COALESCE(NEW.request_id, OLD.request_id);
  IF v_request_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT completion_status, completed_at, COALESCE(completion_manually_overridden, false),
         COALESCE(number_of_people, 0), COALESCE(jsonb_array_length(selected_dates), 1),
         invoicing_mode, linked_accommodation_id, COALESCE(excluded_fees, '{}')
  INTO v_current_status, v_current_completed_at, v_manually_overridden,
       v_number_of_people, v_number_of_days, v_invoicing_mode,
       v_linked_accommodation_id, v_excluded_fees
  FROM program_requests WHERE id = v_request_id;

  IF NOT FOUND THEN RETURN COALESCE(NEW, OLD); END IF;
  IF v_manually_overridden AND v_current_status = 'fully_invoiced' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_number_of_days < 1 THEN v_number_of_days := 1; END IF;

  SELECT COALESCE(SUM(CASE WHEN invoice_type = 'credit'
    THEN -ABS(COALESCE(amount_incl_vat, 0)) ELSE COALESCE(amount_incl_vat, 0) END), 0)
  INTO v_net_invoiced FROM bureau_invoices WHERE request_id = v_request_id;

  SELECT COALESCE((value)::numeric, 0) INTO v_tourist_tax_pp_per_day FROM app_settings WHERE id = 'tourist_tax_pp_per_day';
  SELECT COALESCE((value)::numeric, 0) INTO v_nature_contribution_pp FROM app_settings WHERE id = 'nature_contribution_pp';
  SELECT COALESCE((value)::numeric, 0) INTO v_bureau_central_surcharge_pp FROM app_settings WHERE id = 'bureau_central_surcharge_pp';
  SELECT value INTO v_coord_tiers FROM app_settings WHERE id = 'coordination_fee_tiers';

  IF v_coord_tiers IS NOT NULL AND jsonb_typeof(v_coord_tiers) = 'array' THEN
    FOR v_tier IN SELECT * FROM jsonb_array_elements(v_coord_tiers) LOOP
      IF v_number_of_people >= COALESCE((v_tier->>'min_people')::int, 0)
         AND v_number_of_people <= COALESCE((v_tier->>'max_people')::int, 999999) THEN
        v_coordination_fee := COALESCE((v_tier->>'fee')::numeric, 0);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF 'coordination_fee' = ANY(v_excluded_fees) THEN v_coordination_fee := 0; END IF;
  IF 'tourist_tax' = ANY(v_excluded_fees) THEN v_tourist_tax_pp_per_day := 0; END IF;
  IF 'nature_contribution' = ANY(v_excluded_fees) THEN v_nature_contribution_pp := 0; END IF;
  IF 'central_surcharge' = ANY(v_excluded_fees) THEN v_bureau_central_surcharge_pp := 0; END IF;

  WITH item_totals AS (
    SELECT i.id, i.day_index,
      CASE
        WHEN EXISTS (SELECT 1 FROM program_item_billing_lines l WHERE l.item_id = i.id)
          THEN (SELECT COALESCE(SUM(amount_incl_vat), 0) FROM program_item_billing_lines WHERE item_id = i.id)
        WHEN i.quoted_price IS NOT NULL THEN i.quoted_price
        WHEN i.admin_price_override IS NOT NULL THEN i.admin_price_override
          * CASE WHEN i.price_type IS NULL OR i.price_type IN ('per_person','on_request','per_person_per_day')
                 THEN COALESCE(i.override_people, v_number_of_people) ELSE 1 END
          * CASE WHEN i.price_type = 'per_person_per_day' THEN v_number_of_days ELSE 1 END
        ELSE 0
      END AS line_total
    FROM program_request_items i
    WHERE i.request_id = v_request_id AND i.status <> 'cancelled'
  )
  SELECT COALESCE(SUM(CASE WHEN day_index <> -1 THEN line_total ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN day_index = -1 THEN line_total ELSE 0 END), 0)
  INTO v_program_total, v_extra_costs_total FROM item_totals;

  SELECT COALESCE(SUM(q.price_total + COALESCE((SELECT SUM(CASE WHEN e.pricing_type = 'fixed' THEN e.unit_price ELSE e.unit_price * e.quantity END)
    FROM accommodation_quote_extras e WHERE e.quote_id = q.id), 0)), 0)
  INTO v_accommodation_total
  FROM accommodation_quotes q
  WHERE q.status = 'selected' AND q.request_id = v_linked_accommodation_id;

  v_grand_total := v_program_total + v_extra_costs_total + v_coordination_fee
    + (v_tourist_tax_pp_per_day * v_number_of_people * v_number_of_days)
    + (v_nature_contribution_pp * v_number_of_people)
    + (CASE WHEN v_invoicing_mode = 'bureau_central' THEN v_bureau_central_surcharge_pp * v_number_of_people ELSE 0 END)
    + v_accommodation_total;
  v_outstanding := GREATEST(0, v_grand_total - v_net_invoiced);

  IF v_net_invoiced > 0 AND v_outstanding <= 0.005 THEN v_new_status := 'fully_invoiced';
  ELSIF v_net_invoiced > 0 THEN v_new_status := 'partially_invoiced';
  ELSIF v_current_status IN ('partially_invoiced', 'fully_invoiced') THEN v_new_status := 'ready_for_invoice';
  ELSE v_new_status := COALESCE(v_current_status, 'in_progress'); END IF;

  IF v_new_status <> COALESCE(v_current_status, '') THEN
    IF v_new_status = 'fully_invoiced' THEN
      UPDATE program_requests SET completion_status = v_new_status,
        completed_at = COALESCE(v_current_completed_at, now()) WHERE id = v_request_id;
    ELSIF v_current_status = 'fully_invoiced' THEN
      UPDATE program_requests SET completion_status = v_new_status, completed_at = NULL,
        completed_by = NULL WHERE id = v_request_id;
    ELSE
      UPDATE program_requests SET completion_status = v_new_status WHERE id = v_request_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;