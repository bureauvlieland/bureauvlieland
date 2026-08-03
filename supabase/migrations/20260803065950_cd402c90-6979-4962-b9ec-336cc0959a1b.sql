CREATE OR REPLACE FUNCTION public.partner_self_update_sensitive_unchanged(_id text, _bank_iban text, _bic text, _partner_token text, _commission_percentage numeric, _accommodation_commission_percentage numeric, _extras_commission_percentage numeric, _map_api_key text, _kvk_number text, _auth_user_id uuid, _is_active boolean, _email text, _iban text DEFAULT NULL::text, _bank_account_name text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = _id
      AND (
        p.bank_iban IS DISTINCT FROM _bank_iban
        OR p.iban IS DISTINCT FROM _iban
        OR p.bic IS DISTINCT FROM _bic
        OR p.bank_account_name IS DISTINCT FROM _bank_account_name
        OR p.partner_token IS DISTINCT FROM _partner_token
        OR p.commission_percentage IS DISTINCT FROM _commission_percentage
        OR p.accommodation_commission_percentage IS DISTINCT FROM _accommodation_commission_percentage
        OR p.extras_commission_percentage IS DISTINCT FROM _extras_commission_percentage
        OR p.map_api_key IS DISTINCT FROM _map_api_key
        OR p.kvk_number IS DISTINCT FROM _kvk_number
        OR p.auth_user_id IS DISTINCT FROM _auth_user_id
        OR p.is_active IS DISTINCT FROM _is_active
        OR lower(coalesce(p.email, '')) IS DISTINCT FROM lower(coalesce(_email, ''))
      )
  );
$function$;

DROP POLICY IF EXISTS "Partners can update own data via auth" ON public.partners;
CREATE POLICY "Partners can update own data via auth"
ON public.partners
FOR UPDATE
USING (auth_user_id = auth.uid())
WITH CHECK (
  auth_user_id = auth.uid()
  AND public.partner_self_update_sensitive_unchanged(
    id, bank_iban, bic, partner_token, commission_percentage,
    accommodation_commission_percentage, extras_commission_percentage,
    map_api_key, kvk_number, auth_user_id, is_active, email, iban, bank_account_name
  )
);

CREATE OR REPLACE FUNCTION public.guard_partner_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
     OR NEW.bank_iban IS DISTINCT FROM OLD.bank_iban
     OR NEW.bic IS DISTINCT FROM OLD.bic
     OR NEW.bank_account_name IS DISTINCT FROM OLD.bank_account_name
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
     OR NEW.map_api_key IS DISTINCT FROM OLD.map_api_key
     OR NEW.is_public IS DISTINCT FROM OLD.is_public
  THEN
    RAISE EXCEPTION 'Partners cannot modify restricted fields (commissions, token, role, bank details, email, reference, map_api_key, visibility).'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;