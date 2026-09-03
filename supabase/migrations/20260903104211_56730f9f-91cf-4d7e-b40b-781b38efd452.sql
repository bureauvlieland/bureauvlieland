CREATE POLICY "Admins can insert unavailability"
ON public.partner_unavailability
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update unavailability"
ON public.partner_unavailability
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete unavailability"
ON public.partner_unavailability
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_unavailability TO authenticated;
GRANT ALL ON public.partner_unavailability TO service_role;

CREATE OR REPLACE VIEW public.partner_unavailability_public
WITH (security_invoker = false) AS
SELECT partner_id, start_date, end_date
FROM public.partner_unavailability
WHERE end_date >= current_date;

GRANT SELECT ON public.partner_unavailability_public TO anon, authenticated;