-- 1) building_blocks: hide internal audit column from anonymous public catalog reads
REVOKE SELECT ON public.building_blocks FROM anon;
GRANT SELECT (
  id, slug, name, description, short_description, category, block_type, provider_id,
  min_people, max_people, duration, price_adult, price_adult_note, price_type,
  price_child, price_child_note, price_child_min_age, price_child_max_age,
  price_pet, price_pet_note, is_from_price, price_display_override, price_extras,
  external_url, image_url, image_asset, is_published, is_active, sort_order,
  tags, seasonal_notes, created_at, updated_at, price_includes_vat, vat_rate,
  status, location_lat, location_lng, location_address, map_activity_type_id,
  catering_type, catering_role, required_with, suggested_addons, scaling_rules
) ON public.building_blocks TO anon;

-- 2) user_roles: block self role changes and last-admin removal
CREATE OR REPLACE FUNCTION public.guard_user_roles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_admin_count integer;
BEGIN
  -- Service role / server-side jobs (no auth.uid()) keep full control
  IF v_actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
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
$$;

DROP TRIGGER IF EXISTS trg_guard_user_roles_changes ON public.user_roles;
CREATE TRIGGER trg_guard_user_roles_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_roles_changes();

-- Defense in depth at policy level as well
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) AND user_id <> auth.uid())
WITH CHECK (public.is_admin(auth.uid()) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) AND user_id <> auth.uid());