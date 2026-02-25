
-- 1) Create security definer function to break circular RLS dependency
CREATE OR REPLACE FUNCTION public.partner_can_view_accommodation_request(_user_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accommodation_quotes aq
    WHERE aq.request_id = _request_id
      AND aq.partner_id = public.get_partner_id(_user_id)
  )
$$;

-- 2) Drop the old recursive policy on accommodation_requests
DROP POLICY IF EXISTS "Partners can view requests with their quotes" ON public.accommodation_requests;

-- 3) Create new policy using the security definer function
CREATE POLICY "Partners can view requests with their quotes"
  ON public.accommodation_requests
  FOR SELECT
  USING (public.partner_can_view_accommodation_request(auth.uid(), id));

-- 4) Update the "Quotes readable via request" policy to also include expired status
DROP POLICY IF EXISTS "Quotes readable via request" ON public.accommodation_quotes;

CREATE POLICY "Quotes readable via request"
  ON public.accommodation_quotes
  FOR SELECT
  USING (
    status = ANY (ARRAY['submitted'::text, 'selected'::text, 'expired'::text])
    AND EXISTS (
      SELECT 1 FROM accommodation_requests ar
      WHERE ar.id = accommodation_quotes.request_id
        AND ar.expires_at > now()
    )
  );
