-- Fix program_requests RLS: Remove overly permissive policies that allow public SELECT/UPDATE
-- Access should only be through edge functions that validate customer_token

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Program requests are readable by token" ON public.program_requests;

-- Drop the overly permissive UPDATE policy  
DROP POLICY IF EXISTS "Program requests can be updated by token" ON public.program_requests;

-- The existing admin policies remain:
-- "Admins can view all program requests" 
-- "Admins can update all program requests"
-- Customers access their data via get-customer-program edge function (service_role) which validates customer_token

-- Fix accommodation_requests RLS: Same issue - overly permissive policies
DROP POLICY IF EXISTS "Accommodation requests readable by token" ON public.accommodation_requests;
DROP POLICY IF EXISTS "Accommodation requests updatable by token" ON public.accommodation_requests;

-- The existing admin policies remain:
-- "Admins can view all accommodation requests"
-- "Admins can update all accommodation requests"
-- Customers access their data via edge functions (service_role) which validate customer_token