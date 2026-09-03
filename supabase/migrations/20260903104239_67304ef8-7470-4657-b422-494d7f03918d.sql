DROP VIEW IF EXISTS public.partner_unavailability_public;

CREATE OR REPLACE FUNCTION public.get_public_partner_unavailability()
RETURNS TABLE(partner_id text, start_date date, end_date date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pu.partner_id, pu.start_date, pu.end_date
  FROM public.partner_unavailability pu
  WHERE pu.end_date >= current_date
$$;

GRANT EXECUTE ON FUNCTION public.get_public_partner_unavailability() TO anon, authenticated;