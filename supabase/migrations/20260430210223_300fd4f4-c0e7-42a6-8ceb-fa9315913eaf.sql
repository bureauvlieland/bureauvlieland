-- 1. Add is_public flag (privacy-by-default for new rows)
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 2. Backfill: existing active partners are public by default (per user request)
UPDATE public.partners
SET is_public = true
WHERE is_active = true;

-- 3. Add RLS policy so anon/authenticated can read public+active rows on the base table
--    (needed because the view runs with security_invoker = on)
DROP POLICY IF EXISTS "Public can view public partners" ON public.partners;
CREATE POLICY "Public can view public partners"
ON public.partners
FOR SELECT
TO anon, authenticated
USING (is_active = true AND is_public = true);

-- 4. Drop existing view if any, then recreate with security_invoker
DROP VIEW IF EXISTS public.partners_public;

CREATE VIEW public.partners_public
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  partner_type,
  accommodation_types,
  accommodation_description,
  map_tenant_slug,
  image_url,
  gallery_images,
  about_text,
  highlight_features,
  website_url,
  location_description,
  location_lat,
  location_lng
FROM public.partners
WHERE is_active = true
  AND is_public = true;

-- 5. Grant SELECT on the view to anon and authenticated.
--    Note: column-level grants on the base table are intentionally NOT tightened here,
--    because RLS already restricts anon to (is_active AND is_public) rows. If stricter
--    column-level isolation is desired later, we can add REVOKE/GRANT per column.
GRANT SELECT ON public.partners_public TO anon, authenticated;

COMMENT ON VIEW public.partners_public IS
  'Public-safe partner directory. Whitelisted marketing fields only. Use this for any anon-facing partner lists.';