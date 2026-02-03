-- ============================================
-- RLS POLICY VERBETERINGEN
-- ============================================

-- 1. program_request_items: Beperken tot via request token (request moet bestaan en niet verlopen)
DROP POLICY IF EXISTS "Anyone can create items" ON public.program_request_items;

CREATE POLICY "Items can be created via request token"
ON public.program_request_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.program_requests pr
    WHERE pr.id = request_id
    AND pr.expires_at > now()
  )
  OR is_admin(auth.uid())
);

-- 2. program_request_history: Beperken tot via request token
DROP POLICY IF EXISTS "Anyone can create history" ON public.program_request_history;

CREATE POLICY "History can be created via request token"
ON public.program_request_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.program_requests pr
    WHERE pr.id = request_id
    AND pr.expires_at > now()
  )
  OR is_admin(auth.uid())
);

-- 3. email_log: Alleen admins mogen inserteren (edge functions gebruiken service role)
DROP POLICY IF EXISTS "Anyone can insert email logs" ON public.email_log;

CREATE POLICY "Admins and service role can insert email logs"
ON public.email_log
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR auth.role() = 'service_role'
);

-- 4. admin_activity_log: Alleen admins mogen inserteren
DROP POLICY IF EXISTS "Authenticated users can insert activity log" ON public.admin_activity_log;

CREATE POLICY "Admins can insert activity log"
ON public.admin_activity_log
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
);