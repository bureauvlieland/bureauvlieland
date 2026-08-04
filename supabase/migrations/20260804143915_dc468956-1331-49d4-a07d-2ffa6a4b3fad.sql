CREATE OR REPLACE FUNCTION public.partner_self_update_sensitive_unchanged(_id text, _bank_iban text, _bic text, _partner_token text, _commission_percentage numeric, _accommodation_commission_percentage numeric, _extras_commission_percentage numeric, _map_api_key text, _kvk_number text, _auth_user_id uuid, _is_active boolean, _email text, _iban text DEFAULT NULL::text, _bank_account_name text DEFAULT NULL::text, _partner_type text DEFAULT NULL::text, _is_public boolean DEFAULT NULL::boolean)
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
        OR p.partner_type::text IS DISTINCT FROM _partner_type
        OR p.is_public IS DISTINCT FROM _is_public
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
    map_api_key, kvk_number, auth_user_id, is_active, email, iban, bank_account_name,
    partner_type::text, is_public
  )
);