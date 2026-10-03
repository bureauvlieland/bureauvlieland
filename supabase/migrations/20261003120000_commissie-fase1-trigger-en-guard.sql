-- Commissies fase 1 (docs/plan-commissiefacturen.md):
--  * sync_item_invoice_fields telt álle allocatieregels van de laatste factuur
--    op (een factuur over meerdere btw-tarieven heeft meerdere regels per
--    onderdeel; eerder telde alleen één regel mee);
--  * gefactureerde of betaalde onderdelen worden nooit meer teruggezet naar
--    not_applicable als de inkoopfactuur verdwijnt; er komt een Werkbank-taak;
--  * partners mogen commission_invoiced_at / commission_invoice_id op hun
--    eigen inkoopfacturen niet meer zetten.

CREATE OR REPLACE FUNCTION public.sync_item_invoice_fields(_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_number text;
  v_date date;
  v_amount numeric;
  v_partner text;
  v_pct numeric;
  v_file text;
  v_status text;
  v_request uuid;
  v_name text;
BEGIN
  IF _item_id IS NULL THEN RETURN; END IF;

  -- Meest recente gekoppelde factuur (via allocatie of via de header).
  SELECT src.invoice_id, src.invoice_number, src.invoice_date, src.partner_id, src.file_path
    INTO v_invoice_id, v_number, v_date, v_partner, v_file
  FROM (
    SELECT i.id AS invoice_id, i.invoice_number, i.invoice_date, i.partner_id, i.file_path, i.created_at
    FROM partner_purchase_invoice_allocations a
    JOIN partner_purchase_invoices i ON i.id = a.invoice_id
    WHERE a.item_id = _item_id
    UNION ALL
    SELECT i.id, i.invoice_number, i.invoice_date, i.partner_id, i.file_path, i.created_at
    FROM partner_purchase_invoices i
    WHERE i.item_id = _item_id
      AND NOT EXISTS (
        SELECT 1 FROM partner_purchase_invoice_allocations a2 WHERE a2.invoice_id = i.id
      )
  ) src
  ORDER BY src.created_at DESC
  LIMIT 1;

  IF v_number IS NULL THEN
    SELECT commission_status, request_id, block_name
      INTO v_status, v_request, v_name
    FROM program_request_items WHERE id = _item_id;

    IF v_status IN ('invoiced', 'paid') THEN
      -- Al gefactureerd of betaald: niet terugzetten, wel laten nakijken.
      INSERT INTO admin_todos (
        title, description, priority, status, related_request_id,
        auto_type, auto_entity_id
      )
      SELECT
        'Gefactureerd onderdeel verloor zijn inkoopfactuur: ' || COALESCE(v_name, 'onderdeel'),
        'De inkoopfactuur van dit onderdeel is verwijderd of losgekoppeld, maar de commissie is al ' ||
          CASE WHEN v_status = 'paid' THEN 'betaald' ELSE 'gefactureerd' END ||
          '. De commissiestatus is bewust niet teruggezet. Controleer of de factuur opnieuw gekoppeld moet worden.',
        'normal', 'todo', v_request,
        'commission_invoice_lost', _item_id::text
      WHERE NOT EXISTS (
        SELECT 1 FROM admin_todos t
        WHERE t.auto_type = 'commission_invoice_lost'
          AND t.auto_entity_id = _item_id::text
          AND t.status <> 'done'
      );
      RETURN;
    END IF;

    UPDATE program_request_items
       SET invoiced_amount = NULL,
           invoiced_number = NULL,
           invoiced_date = NULL,
           invoiced_file_path = NULL,
           commission_amount = NULL,
           commission_status = 'not_applicable',
           updated_at = now()
     WHERE id = _item_id
       AND invoiced_number IS NOT NULL;
    RETURN;
  END IF;

  -- Bedrag voor dit onderdeel: som van alle allocatieregels van déze factuur
  -- (meerdere btw-tarieven = meerdere regels); zonder allocaties het headerbedrag.
  SELECT SUM(a.amount_excl_vat) INTO v_amount
  FROM partner_purchase_invoice_allocations a
  WHERE a.invoice_id = v_invoice_id AND a.item_id = _item_id;

  IF v_amount IS NULL THEN
    SELECT i.amount_excl_vat INTO v_amount
    FROM partner_purchase_invoices i WHERE i.id = v_invoice_id;
  END IF;

  SELECT COALESCE(it.commission_percentage, p.commission_percentage, 0)
    INTO v_pct
  FROM program_request_items it
  LEFT JOIN partners p ON p.id = COALESCE(it.provider_id, v_partner)
  WHERE it.id = _item_id;

  v_pct := COALESCE(v_pct, 0);

  UPDATE program_request_items
     SET invoiced_amount = v_amount,
         invoiced_number = v_number,
         invoiced_date = v_date,
         invoiced_file_path = COALESCE(v_file, invoiced_file_path),
         commission_percentage = COALESCE(commission_percentage, v_pct),
         commission_amount = ROUND(COALESCE(v_amount, 0) * v_pct / 100.0, 2),
         commission_status = CASE
           WHEN commission_status IN ('invoiced', 'paid', 'waived') THEN commission_status
           WHEN v_pct > 0 THEN 'pending'
           ELSE 'not_applicable'
         END,
         updated_at = now()
   WHERE id = _item_id;
END;
$$;

-- Herbereken de snapshotbedragen van onderdelen die alleen niet-gefactureerde
-- commissie hebben (invoiced/paid blijven staan zoals op de factuur).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT a.item_id
    FROM partner_purchase_invoice_allocations a
    JOIN program_request_items it ON it.id = a.item_id
    WHERE a.item_id IS NOT NULL
      AND COALESCE(it.commission_status, 'not_applicable') NOT IN ('invoiced', 'paid')
  LOOP
    PERFORM public.sync_item_invoice_fields(r.item_id);
  END LOOP;
END $$;

-- Partner-guard: commissiefactuurkoppeling is admin-only.
CREATE OR REPLACE FUNCTION public.guard_partner_invoice_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id text;
  v_status_changed boolean;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  v_partner_id := public.get_partner_id(auth.uid());
  IF v_partner_id IS NULL OR NEW.partner_id IS DISTINCT FROM v_partner_id THEN
    RETURN NEW;
  END IF;

  v_status_changed := NEW.status IS DISTINCT FROM OLD.status;
  IF v_status_changed
     AND OLD.status = 'pending_email_match'
     AND NEW.status = 'pending'
     AND NEW.file_path IS NOT NULL
  THEN
    v_status_changed := false;
  END IF;

  IF v_status_changed
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.forwarded_to_accounting_at IS DISTINCT FROM OLD.forwarded_to_accounting_at
     OR NEW.forwarded_by IS DISTINCT FROM OLD.forwarded_by
     OR NEW.payment_batch_id IS DISTINCT FROM OLD.payment_batch_id
     OR NEW.bank_line_id IS DISTINCT FROM OLD.bank_line_id
     OR COALESCE(NEW.commission_exempt, false) IS DISTINCT FROM COALESCE(OLD.commission_exempt, false)
     OR NEW.commission_exempt_at IS DISTINCT FROM OLD.commission_exempt_at
     OR NEW.commission_exempt_by IS DISTINCT FROM OLD.commission_exempt_by
     OR NEW.commission_exempt_reason IS DISTINCT FROM OLD.commission_exempt_reason
     OR NEW.commission_invoiced_at IS DISTINCT FROM OLD.commission_invoiced_at
     OR NEW.commission_invoice_id IS DISTINCT FROM OLD.commission_invoice_id
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.registered_by IS DISTINCT FROM OLD.registered_by
     OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number
     OR NEW.amount_excl_vat IS DISTINCT FROM OLD.amount_excl_vat
     OR NEW.amount_incl_vat IS DISTINCT FROM OLD.amount_incl_vat
     OR NEW.vat_rate IS DISTINCT FROM OLD.vat_rate
     OR NEW.vat_amount IS DISTINCT FROM OLD.vat_amount
  THEN
    RAISE EXCEPTION 'Partners cannot modify invoice status, payment metadata, or amounts after submission.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE UPDATE (commission_invoiced_at, commission_invoice_id)
  ON public.partner_purchase_invoices FROM authenticated;
