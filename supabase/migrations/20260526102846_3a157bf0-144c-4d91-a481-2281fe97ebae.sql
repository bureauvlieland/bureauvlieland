
-- Restrict chat_admin_presence read to authenticated users only
DROP POLICY IF EXISTS "Anyone can read admin presence" ON public.chat_admin_presence;
CREATE POLICY "Authenticated users can read admin presence"
ON public.chat_admin_presence
FOR SELECT
TO authenticated
USING (true);

-- Lock down direct INSERTs on program_request_items / program_request_history.
-- All customer-facing flows go through edge functions using the service role,
-- which bypasses RLS. Admins keep direct insert access.
DROP POLICY IF EXISTS "Items can be created via request token" ON public.program_request_items;
CREATE POLICY "Admins can insert program request items"
ON public.program_request_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "History can be created via request token" ON public.program_request_history;
CREATE POLICY "Admins can insert program request history"
ON public.program_request_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));
