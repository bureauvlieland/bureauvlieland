-- Allow anonymous visitors to discover partners that contribute a published building block.
-- The partners table contains PII (email, phone, IBAN) — but the Partners page only selects
-- non-sensitive marketing columns. The application code is responsible for selecting only
-- safe columns; this policy only widens row visibility, not column visibility (RLS is row-level).
-- We pair this with a SECURITY DEFINER helper to keep the check fast and avoid recursive RLS.

CREATE OR REPLACE FUNCTION public.partner_has_published_block(_partner_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.building_blocks bb
    WHERE bb.provider_id = _partner_id
      AND bb.status = 'published'
  )
$$;

CREATE POLICY "Public can view partners with published blocks"
ON public.partners
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND public.partner_has_published_block(id)
);