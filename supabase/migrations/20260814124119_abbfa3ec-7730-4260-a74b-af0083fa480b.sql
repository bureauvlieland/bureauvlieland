GRANT SELECT ON public.booking_events TO authenticated;

CREATE POLICY "Admins can read booking events"
ON public.booking_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));