CREATE OR REPLACE FUNCTION public.is_any_admin_online()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_admin_presence WHERE is_online = true);
$$;

REVOKE ALL ON FUNCTION public.is_any_admin_online() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_any_admin_online() TO authenticated, anon;