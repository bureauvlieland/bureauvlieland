
-- Remove broad public SELECT on shared_programs and replace with a scoped RPC
DROP POLICY IF EXISTS "Shared programs are publicly readable" ON public.shared_programs;
REVOKE SELECT ON public.shared_programs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_program(_share_code text)
RETURNS TABLE (
  id uuid,
  share_code text,
  cart_items jsonb,
  number_of_people integer,
  selected_date date,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.id, sp.share_code, sp.cart_items, sp.number_of_people,
         sp.selected_date, sp.created_at, sp.expires_at
  FROM public.shared_programs sp
  WHERE sp.share_code = _share_code
    AND sp.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_shared_program(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_shared_program(text) TO anon, authenticated;
