-- Drop the overly permissive policy that allows reading items just because the request isn't expired
DROP POLICY IF EXISTS "Items are readable via request" ON public.program_request_items;

-- Create a more secure policy: items are only readable by:
-- 1. Admins
-- 2. Partners who own the item
-- 3. Service role (edge functions) - which validates the customer_token
-- Note: Direct public access is now blocked; customers access via get-customer-program edge function

-- The existing policies already cover admins and partners:
-- - "Admins can view all program request items" 
-- - "Partners can view their assigned items via auth"

-- Also fix the UPDATE policy that's too permissive
DROP POLICY IF EXISTS "Items can be updated" ON public.program_request_items;

-- Create stricter update policy - only via edge functions with proper token validation
-- Partners already have their own update policy: "Partners can update their assigned items via auth"
-- Admins already have: "Admins can update all program request items"

-- Also fix the DELETE policy
DROP POLICY IF EXISTS "Items can be deleted" ON public.program_request_items;

-- Only admins can delete items (customers shouldn't delete items directly)
CREATE POLICY "Admins can delete program request items"
ON public.program_request_items
FOR DELETE
USING (is_admin(auth.uid()));

-- For customer updates (like accepting quotes), use edge functions with service_role
-- The get-customer-program and update-customer-program edge functions already use service_role