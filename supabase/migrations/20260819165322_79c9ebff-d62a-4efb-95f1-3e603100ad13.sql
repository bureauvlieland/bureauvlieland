-- 1. Ontbrekende WITH CHECK op partner-update policy program_request_items
DROP POLICY IF EXISTS "Partners can update their assigned items via auth" ON public.program_request_items;
CREATE POLICY "Partners can update their assigned items via auth"
ON public.program_request_items
FOR UPDATE
TO authenticated
USING (provider_id = public.get_partner_id(auth.uid()))
WITH CHECK (provider_id = public.get_partner_id(auth.uid()));

-- 2. Uitbreiden guard: prijs-/admin-/commissievrij-velden
CREATE OR REPLACE FUNCTION public.guard_partner_request_item_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 3. Uitbreiden guard accommodation_quotes
CREATE OR REPLACE FUNCTION public.guard_partner_quote_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id text;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  v_partner_id := public.get_partner_id(auth.uid());
  IF v_partner_id IS NULL OR NEW.partner_id IS DISTINCT FROM v_partner_id THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.commission_status IS DISTINCT FROM OLD.commission_status
     OR NEW.commission_invoiced_at IS DISTINCT FROM OLD.commission_invoiced_at
     OR COALESCE(NEW.commission_exempt, false) IS DISTINCT FROM COALESCE(OLD.commission_exempt, false)
     OR NEW.commission_exempt_at IS DISTINCT FROM OLD.commission_exempt_at
     OR NEW.commission_exempt_by IS DISTINCT FROM OLD.commission_exempt_by
     OR NEW.commission_exempt_reason IS DISTINCT FROM OLD.commission_exempt_reason
     OR NEW.invoiced_amount IS DISTINCT FROM OLD.invoiced_amount
     OR NEW.invoiced_number IS DISTINCT FROM OLD.invoiced_number
     OR NEW.invoiced_date IS DISTINCT FROM OLD.invoiced_date
     OR NEW.invoiced_file_path IS DISTINCT FROM OLD.invoiced_file_path
     OR NEW.actual_invoiced_excl_vat IS DISTINCT FROM OLD.actual_invoiced_excl_vat
     OR NEW.proforma_commission IS DISTINCT FROM OLD.proforma_commission
     OR NEW.proforma_amount_excl_vat IS DISTINCT FROM OLD.proforma_amount_excl_vat
     OR NEW.proforma_sent_at IS DISTINCT FROM OLD.proforma_sent_at
     OR NEW.proforma_deadline IS DISTINCT FROM OLD.proforma_deadline
     OR NEW.selected_at IS DISTINCT FROM OLD.selected_at
     OR NEW.forwarded_at IS DISTINCT FROM OLD.forwarded_at
     OR NEW.customer_terms_accepted_at IS DISTINCT FROM OLD.customer_terms_accepted_at
     OR NEW.customer_signature_name IS DISTINCT FROM OLD.customer_signature_name
     OR NEW.customer_terms_ip IS DISTINCT FROM OLD.customer_terms_ip
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
  THEN
    RAISE EXCEPTION 'Partners cannot modify commission, billing, or customer-acceptance fields on accommodation quotes.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Uitbreiden guard partner_purchase_invoices
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