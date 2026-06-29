
-- =============================================================
-- Security hardening: column-level restrictions for partner UPDATEs
-- =============================================================

-- 1) accommodation_quotes: partner mag alleen offerte-velden updaten
CREATE OR REPLACE FUNCTION public.protect_partner_accommodation_quote_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins en service_role: vrij spel
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alleen partners mogen hieronder komen via hun eigen RLS-policy.
  -- Blokkeer wijzigingen op financiële / commissie / bureau-velden.
  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.commission_amount     IS DISTINCT FROM OLD.commission_amount
     OR NEW.commission_status     IS DISTINCT FROM OLD.commission_status
     OR NEW.commission_invoiced_at IS DISTINCT FROM OLD.commission_invoiced_at
     OR NEW.invoiced_amount       IS DISTINCT FROM OLD.invoiced_amount
     OR NEW.invoiced_number       IS DISTINCT FROM OLD.invoiced_number
     OR NEW.invoiced_date         IS DISTINCT FROM OLD.invoiced_date
     OR NEW.invoiced_file_path    IS DISTINCT FROM OLD.invoiced_file_path
     OR NEW.proforma_amount_excl_vat IS DISTINCT FROM OLD.proforma_amount_excl_vat
     OR NEW.proforma_commission   IS DISTINCT FROM OLD.proforma_commission
     OR NEW.proforma_sent_at      IS DISTINCT FROM OLD.proforma_sent_at
     OR NEW.proforma_deadline     IS DISTINCT FROM OLD.proforma_deadline
     OR NEW.actual_invoiced_excl_vat IS DISTINCT FROM OLD.actual_invoiced_excl_vat
     OR NEW.partner_id            IS DISTINCT FROM OLD.partner_id
     OR NEW.request_id            IS DISTINCT FROM OLD.request_id
     OR NEW.selected_at           IS DISTINCT FROM OLD.selected_at
     OR NEW.forwarded_at          IS DISTINCT FROM OLD.forwarded_at
  THEN
    RAISE EXCEPTION 'Partner mag deze administratieve/financiële velden niet wijzigen op accommodation_quotes';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partner_accommodation_quote_fields ON public.accommodation_quotes;
CREATE TRIGGER protect_partner_accommodation_quote_fields
BEFORE UPDATE ON public.accommodation_quotes
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_accommodation_quote_fields();

-- 2) partner_purchase_invoices: partner mag alleen omschrijving / nummer / datum / pdf updaten
CREATE OR REPLACE FUNCTION public.protect_partner_purchase_invoice_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.status                       IS DISTINCT FROM OLD.status
     OR NEW.approved_at               IS DISTINCT FROM OLD.approved_at
     OR NEW.paid_at                   IS DISTINCT FROM OLD.paid_at
     OR NEW.forwarded_to_accounting_at IS DISTINCT FROM OLD.forwarded_to_accounting_at
     OR NEW.forwarded_by              IS DISTINCT FROM OLD.forwarded_by
     OR NEW.payment_batch_id          IS DISTINCT FROM OLD.payment_batch_id
     OR NEW.amount_excl_vat           IS DISTINCT FROM OLD.amount_excl_vat
     OR NEW.amount_incl_vat           IS DISTINCT FROM OLD.amount_incl_vat
     OR NEW.vat_amount                IS DISTINCT FROM OLD.vat_amount
     OR NEW.vat_rate                  IS DISTINCT FROM OLD.vat_rate
     OR NEW.partner_id                IS DISTINCT FROM OLD.partner_id
     OR NEW.request_id                IS DISTINCT FROM OLD.request_id
     OR NEW.item_id                   IS DISTINCT FROM OLD.item_id
     OR NEW.registered_by             IS DISTINCT FROM OLD.registered_by
  THEN
    RAISE EXCEPTION 'Partner mag status / bedragen / koppelingen niet wijzigen op partner_purchase_invoices';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partner_purchase_invoice_fields ON public.partner_purchase_invoices;
CREATE TRIGGER protect_partner_purchase_invoice_fields
BEFORE UPDATE ON public.partner_purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_purchase_invoice_fields();

-- 3) partners: partner mag eigen profielvelden updaten, geen rechten/financiële velden
CREATE OR REPLACE FUNCTION public.protect_partner_self_update_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alleen relevant als de partner zichzelf update via 'Partners can update own data via auth'
  IF NEW.auth_user_id IS NULL OR NEW.auth_user_id <> auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.id                                  IS DISTINCT FROM OLD.id
     OR NEW.auth_user_id                     IS DISTINCT FROM OLD.auth_user_id
     OR NEW.is_active                        IS DISTINCT FROM OLD.is_active
     OR NEW.partner_type                     IS DISTINCT FROM OLD.partner_type
     OR NEW.commission_percentage            IS DISTINCT FROM OLD.commission_percentage
     OR NEW.accommodation_commission_percentage IS DISTINCT FROM OLD.accommodation_commission_percentage
     OR NEW.extras_commission_percentage     IS DISTINCT FROM OLD.extras_commission_percentage
     OR NEW.map_api_key                      IS DISTINCT FROM OLD.map_api_key
     OR NEW.is_public                        IS DISTINCT FROM OLD.is_public
     OR NEW.pays_by_direct_debit             IS DISTINCT FROM OLD.pays_by_direct_debit
     OR NEW.initial_password                 IS DISTINCT FROM OLD.initial_password
     OR NEW.email                            IS DISTINCT FROM OLD.email
  THEN
    RAISE EXCEPTION 'Partner mag rechten/financiële/admin-velden niet wijzigen op eigen partnerrecord';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partner_self_update_fields ON public.partners;
CREATE TRIGGER protect_partner_self_update_fields
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_self_update_fields();

-- =============================================================
-- 4) program_request_items: verwijder anon-insert policy, dwing
--    aanmaak via SECURITY DEFINER RPC af.
-- =============================================================

DROP POLICY IF EXISTS "Anon can add items to recent requests only" ON public.program_request_items;

-- Breid de bestaande RPC uit zodat ook catering / andere anon-flows
-- atomair via één SECURITY DEFINER call lopen (in plaats van losse
-- anon inserts). Backwards compatible — bestaande callers veranderen niet.
CREATE OR REPLACE FUNCTION public.submit_self_service_program_request(
  p_request jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_ref text;
  v_token text;
  v_item jsonb;
  v_count int;
  v_origin text;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'submit geweigerd: minimaal 1 program_request_item vereist'
      USING ERRCODE = 'check_violation';
  END IF;

  v_id := COALESCE((p_request->>'id')::uuid, gen_random_uuid());
  v_token := p_request->>'customer_token';
  IF v_token IS NULL OR length(v_token) < 8 THEN
    RAISE EXCEPTION 'customer_token ontbreekt of ongeldig' USING ERRCODE = 'check_violation';
  END IF;

  v_origin := COALESCE(NULLIF(p_request->>'origin',''), 'self_service');

  INSERT INTO public.program_requests (
    id, customer_token, customer_name, customer_email, customer_phone, customer_company,
    number_of_people, selected_dates, general_notes, dietary_notes, origin, program_description,
    quote_status, attribution,
    catering_location_text, catering_start_time, has_horeca_on_site
  ) VALUES (
    v_id,
    v_token,
    p_request->>'customer_name',
    p_request->>'customer_email',
    p_request->>'customer_phone',
    NULLIF(p_request->>'customer_company',''),
    (p_request->>'number_of_people')::int,
    ARRAY(SELECT jsonb_array_elements_text(p_request->'selected_dates'))::date[],
    NULLIF(p_request->>'general_notes',''),
    NULLIF(p_request->>'dietary_notes',''),
    v_origin,
    COALESCE(NULLIF(p_request->>'program_description',''), 'niet_gespecificeerd'),
    'concept',
    COALESCE(p_request->'attribution', '{}'::jsonb),
    NULLIF(p_request->>'catering_location_text',''),
    NULLIF(p_request->>'catering_start_time','')::time,
    COALESCE((p_request->>'has_horeca_on_site')::boolean, false)
  )
  RETURNING reference_number INTO v_ref;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.program_request_items (
      request_id, block_id, block_name, block_category, provider_name, provider_id,
      provider_email, block_type, price_indication, day_index, preferred_time,
      customer_notes, status, skip_partner_notification, price_type, external_url,
      admin_price_override, location_lat, location_lng, location_address, admin_price_notes
    ) VALUES (
      v_id,
      v_item->>'block_id',
      v_item->>'block_name',
      v_item->>'block_category',
      v_item->>'provider_name',
      v_item->>'provider_id',
      v_item->>'provider_email',
      v_item->>'block_type',
      v_item->>'price_indication',
      COALESCE((v_item->>'day_index')::int, 0),
      v_item->>'preferred_time',
      v_item->>'customer_notes',
      COALESCE(v_item->>'status','pending'),
      COALESCE((v_item->>'skip_partner_notification')::boolean, true),
      COALESCE(v_item->>'price_type','per_person'),
      v_item->>'external_url',
      NULLIF(v_item->>'admin_price_override','')::numeric,
      NULLIF(v_item->>'location_lat','')::numeric,
      NULLIF(v_item->>'location_lng','')::numeric,
      v_item->>'location_address',
      v_item->>'admin_price_notes'
    );
  END LOOP;

  SELECT COUNT(*) INTO v_count FROM public.program_request_items WHERE request_id = v_id;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'submit afgebroken: 0 items na insert' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.program_request_history (request_id, action, actor, actor_name, new_value)
  VALUES (v_id, 'created', 'customer', p_request->>'customer_name',
          jsonb_build_object('items_count', v_count, 'origin', v_origin));

  RETURN jsonb_build_object('id', v_id, 'reference_number', v_ref, 'customer_token', v_token);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) TO anon, authenticated, service_role;
