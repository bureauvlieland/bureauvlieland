-- Eén schrijfpunt: houd program_request_items synchroon met inkoopfacturen.
CREATE OR REPLACE FUNCTION public.sync_item_invoice_fields(_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number text;
  v_date date;
  v_amount numeric;
  v_partner text;
  v_pct numeric;
  v_file text;
BEGIN
  IF _item_id IS NULL THEN RETURN; END IF;

  -- Meest recente koppeling via allocatie of via de header (item_id).
  SELECT src.invoice_number, src.invoice_date, src.amount_excl_vat, src.partner_id, src.file_path
    INTO v_number, v_date, v_amount, v_partner, v_file
  FROM (
    SELECT i.invoice_number, i.invoice_date, a.amount_excl_vat, i.partner_id, i.file_path, i.created_at
    FROM partner_purchase_invoice_allocations a
    JOIN partner_purchase_invoices i ON i.id = a.invoice_id
    WHERE a.item_id = _item_id
    UNION ALL
    SELECT i.invoice_number, i.invoice_date, i.amount_excl_vat, i.partner_id, i.file_path, i.created_at
    FROM partner_purchase_invoices i
    WHERE i.item_id = _item_id
      AND NOT EXISTS (
        SELECT 1 FROM partner_purchase_invoice_allocations a2 WHERE a2.invoice_id = i.id
      )
  ) src
  ORDER BY src.created_at DESC
  LIMIT 1;

  IF v_number IS NULL THEN
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

CREATE OR REPLACE FUNCTION public.trg_sync_item_from_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.sync_item_invoice_fields(OLD.item_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM public.sync_item_invoice_fields(NEW.item_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_items_from_purchase_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP <> 'INSERT' AND OLD.item_id IS NOT NULL THEN
    PERFORM public.sync_item_invoice_fields(OLD.item_id);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.item_id IS NOT NULL THEN
    PERFORM public.sync_item_invoice_fields(NEW.item_id);
  END IF;

  FOR r IN
    SELECT DISTINCT a.item_id
    FROM partner_purchase_invoice_allocations a
    WHERE a.invoice_id = COALESCE(
      CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END, NULL)
  LOOP
    PERFORM public.sync_item_invoice_fields(r.item_id);
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_item_invoice_from_allocation ON public.partner_purchase_invoice_allocations;
CREATE TRIGGER sync_item_invoice_from_allocation
AFTER INSERT OR UPDATE OR DELETE ON public.partner_purchase_invoice_allocations
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_item_from_allocation();

DROP TRIGGER IF EXISTS sync_items_from_purchase_invoice ON public.partner_purchase_invoices;
CREATE TRIGGER sync_items_from_purchase_invoice
AFTER INSERT OR UPDATE OF invoice_number, invoice_date, amount_excl_vat, item_id, file_path OR DELETE
ON public.partner_purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_items_from_purchase_invoice();

-- Eenmalige backfill over alle bestaande koppelingen.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT item_id FROM partner_purchase_invoice_allocations WHERE item_id IS NOT NULL
    UNION
    SELECT DISTINCT item_id FROM partner_purchase_invoices WHERE item_id IS NOT NULL
  LOOP
    PERFORM public.sync_item_invoice_fields(r.item_id);
  END LOOP;
END $$;