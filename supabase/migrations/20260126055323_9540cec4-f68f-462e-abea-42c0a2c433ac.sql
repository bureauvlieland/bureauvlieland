-- Drop all restrictive policies on building_blocks
DROP POLICY IF EXISTS "Published blocks are publicly readable" ON public.building_blocks;
DROP POLICY IF EXISTS "Admins can view all blocks" ON public.building_blocks;
DROP POLICY IF EXISTS "Admins can insert blocks" ON public.building_blocks;
DROP POLICY IF EXISTS "Admins can update blocks" ON public.building_blocks;
DROP POLICY IF EXISTS "Admins can delete blocks" ON public.building_blocks;
DROP POLICY IF EXISTS "Partners can view their own blocks" ON public.building_blocks;

-- Recreate as PERMISSIVE policies (default behavior - OR logic)
CREATE POLICY "Published blocks are publicly readable"
  ON public.building_blocks FOR SELECT
  USING (is_published = true AND is_active = true);

CREATE POLICY "Admins can view all blocks"
  ON public.building_blocks FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert blocks"
  ON public.building_blocks FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update blocks"
  ON public.building_blocks FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete blocks"
  ON public.building_blocks FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Partners can view their own blocks"
  ON public.building_blocks FOR SELECT
  TO authenticated
  USING (provider_id = get_partner_id(auth.uid()));