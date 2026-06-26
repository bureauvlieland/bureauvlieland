
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
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'self_service submit geweigerd: minimaal 1 program_request_item vereist'
      USING ERRCODE = 'check_violation';
  END IF;

  v_id := COALESCE((p_request->>'id')::uuid, gen_random_uuid());
  v_token := p_request->>'customer_token';
  IF v_token IS NULL OR length(v_token) < 8 THEN
    RAISE EXCEPTION 'customer_token ontbreekt of ongeldig' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.program_requests (
    id, customer_token, customer_name, customer_email, customer_phone, customer_company,
    number_of_people, selected_dates, general_notes, origin, program_description,
    quote_status, attribution
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
    'self_service',
    COALESCE(NULLIF(p_request->>'program_description',''), 'niet_gespecificeerd'),
    'concept',
    COALESCE(p_request->'attribution', '{}'::jsonb)
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
    RAISE EXCEPTION 'self_service submit afgebroken: 0 items na insert' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.program_request_history (request_id, action, actor, actor_name, new_value)
  VALUES (v_id, 'created', 'customer', p_request->>'customer_name', jsonb_build_object('items_count', v_count));

  RETURN jsonb_build_object('id', v_id, 'reference_number', v_ref, 'customer_token', v_token);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) TO anon, authenticated, service_role;
