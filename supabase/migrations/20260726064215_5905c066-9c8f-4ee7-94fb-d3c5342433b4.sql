
CREATE OR REPLACE FUNCTION public.prevent_partner_publish_building_blocks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins and service role bypass this restriction
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For partner-owned rows, block changes to publish/status/active fields
  IF NEW.is_published IS DISTINCT FROM OLD.is_published
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Partners cannot change publish/status fields on building_blocks. Admin approval required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_partner_publish_building_blocks ON public.building_blocks;
CREATE TRIGGER trg_prevent_partner_publish_building_blocks
BEFORE UPDATE ON public.building_blocks
FOR EACH ROW
EXECUTE FUNCTION public.prevent_partner_publish_building_blocks();
