-- accepted_terms_log: Beperken tot service role (edge functions) en admins
DROP POLICY IF EXISTS "Allow insert via service role" ON public.accepted_terms_log;

CREATE POLICY "Service role and admins can insert terms logs"
ON public.accepted_terms_log
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR auth.role() = 'service_role'
);