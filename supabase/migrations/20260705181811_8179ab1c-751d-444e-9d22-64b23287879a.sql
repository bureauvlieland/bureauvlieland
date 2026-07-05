REVOKE SELECT (customer_signature_name, customer_terms_ip, customer_terms_accepted_at) ON public.accommodation_quotes FROM authenticated;
REVOKE SELECT (customer_signature_name, customer_terms_ip, customer_terms_accepted_at) ON public.accommodation_quotes FROM anon;

CREATE OR REPLACE FUNCTION public.get_accommodation_quote_terms(_quote_id uuid)
RETURNS TABLE (
  id uuid,
  customer_signature_name text,
  customer_terms_accepted_at timestamptz,
  customer_terms_ip text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT q.id, q.customer_signature_name, q.customer_terms_accepted_at, q.customer_terms_ip
  FROM public.accommodation_quotes q
  WHERE q.id = _quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_accommodation_quote_terms(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_accommodation_quote_terms(uuid) TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can read admin presence" ON public.chat_admin_presence;

CREATE POLICY "Admins can read admin presence"
  ON public.chat_admin_presence
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));