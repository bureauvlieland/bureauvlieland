-- 1) partners: trigger guards restricted columns against partner self-edit
CREATE OR REPLACE FUNCTION public.guard_partner_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM auth.uid()
     AND OLD.auth_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.accommodation_commission_percentage IS DISTINCT FROM OLD.accommodation_commission_percentage
     OR NEW.partner_token IS DISTINCT FROM OLD.partner_token
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.partner_type IS DISTINCT FROM OLD.partner_type
     OR NEW.iban IS DISTINCT FROM OLD.iban
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
  THEN
    RAISE EXCEPTION 'Partners cannot modify restricted fields (commissions, token, role, IBAN, email, reference).'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_partner_self_update_trg ON public.partners;
CREATE TRIGGER guard_partner_self_update_trg
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_partner_self_update();

-- 2) partner_purchase_invoices: trigger blocks status/workflow mutation by partners
CREATE OR REPLACE FUNCTION public.guard_partner_invoice_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.forwarded_to_accounting_at IS DISTINCT FROM OLD.forwarded_to_accounting_at
     OR NEW.forwarded_by IS DISTINCT FROM OLD.forwarded_by
     OR NEW.payment_batch_id IS DISTINCT FROM OLD.payment_batch_id
     OR NEW.bank_line_id IS DISTINCT FROM OLD.bank_line_id
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
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
$$;

DROP TRIGGER IF EXISTS guard_partner_invoice_self_update_trg ON public.partner_purchase_invoices;
CREATE TRIGGER guard_partner_invoice_self_update_trg
  BEFORE UPDATE ON public.partner_purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_partner_invoice_self_update();

-- 3) Tighten anon INSERT policies: only for very recent requests
CREATE OR REPLACE FUNCTION public.program_request_is_recent(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.program_requests
    WHERE id = _id
      AND created_at > now() - interval '1 hour'
  )
$$;

DROP POLICY IF EXISTS "Anyone can create program request history" ON public.program_request_history;
CREATE POLICY "Anon can append history to recent requests only"
ON public.program_request_history
FOR INSERT
TO anon, authenticated
WITH CHECK (public.program_request_is_recent(request_id));

DROP POLICY IF EXISTS "Anyone can create program request items" ON public.program_request_items;
CREATE POLICY "Anon can add items to recent requests only"
ON public.program_request_items
FOR INSERT
TO anon, authenticated
WITH CHECK (public.program_request_is_recent(request_id));