
-- 1. Rebuild partners_public view with safe + portal-needed fields
DROP VIEW IF EXISTS public.partners_public;

CREATE VIEW public.partners_public
WITH (security_invoker = true)
AS
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
  location_lng,
  terms_pdf_path,
  uses_default_terms,
  is_public,
  is_active
FROM public.partners
WHERE is_active = true;

GRANT SELECT ON public.partners_public TO anon, authenticated;

-- 2. Drop public-read policies on partners (anon must use view)
DROP POLICY IF EXISTS "Public can view public partners" ON public.partners;
DROP POLICY IF EXISTS "Public can view MAP-linked partners" ON public.partners;
DROP POLICY IF EXISTS "Public can view partners with published blocks" ON public.partners;

-- 3. Drop public-read on accepted_terms_log
DROP POLICY IF EXISTS "Terms logs readable via program request" ON public.accepted_terms_log;
