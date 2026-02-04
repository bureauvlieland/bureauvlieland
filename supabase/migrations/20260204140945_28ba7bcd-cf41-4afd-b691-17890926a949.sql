-- Drop the overly permissive policy that allows reading history just because the request isn't expired
DROP POLICY IF EXISTS "History is readable via request" ON public.program_request_history;

-- The existing admin policy remains: "Admins can view all history"
-- Customers access history via get-customer-program edge function (service_role) which validates customer_token