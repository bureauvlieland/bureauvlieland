CREATE OR REPLACE FUNCTION public.protect_partner_purchase_invoice_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status_changed boolean;
BEGIN
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Toegestane automatische overgang: 'wacht op PDF' -> 'in afwachting'
  -- zodra de PDF gekoppeld is (zie purchase_invoice_release_email_match).
  v_status_changed := NEW.status IS DISTINCT FROM OLD.status;
  IF v_status_changed
     AND OLD.status = 'pending_email_match'
     AND NEW.status = 'pending'
     AND NEW.file_path IS NOT NULL
  THEN
    v_status_changed := false;
  END IF;

  IF v_status_changed
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
$function$;