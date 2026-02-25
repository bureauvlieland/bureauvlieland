-- Allow partners to read accommodation requests that have quotes assigned to them
CREATE POLICY "Partners can view requests with their quotes"
  ON public.accommodation_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.accommodation_quotes aq
      WHERE aq.request_id = accommodation_requests.id
        AND aq.partner_id = public.get_partner_id(auth.uid())
    )
  );