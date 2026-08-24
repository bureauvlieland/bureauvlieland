CREATE OR REPLACE FUNCTION public.guard_user_roles_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_admin_count integer;
BEGIN
  -- Service role / server-side jobs (no auth.uid()) keep full control
  IF v_actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Belt-and-braces: only admins may touch role assignments at all
  IF NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Alleen beheerders kunnen rollen wijzigen';
  END IF;

  -- No admin may change their own role assignments (prevents self-escalation)
  IF TG_OP = 'INSERT' AND NEW.user_id = v_actor THEN
    RAISE EXCEPTION 'Je kunt je eigen rollen niet wijzigen';
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.user_id = v_actor THEN
    RAISE EXCEPTION 'Je kunt je eigen rollen niet wijzigen';
  END IF;

  -- Never leave the system without an admin
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.role = 'admin'::app_role
     AND (TG_OP = 'DELETE' OR NEW.role <> 'admin'::app_role) THEN
    SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin'::app_role;
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'De laatste beheerder kan niet worden verwijderd';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;