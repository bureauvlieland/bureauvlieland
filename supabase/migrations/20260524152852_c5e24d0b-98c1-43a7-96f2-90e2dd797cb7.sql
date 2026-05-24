
-- C5: Lock down anon SELECT access on customer/portal tables.
-- All anon portal reads now go through edge functions (service role).

DROP POLICY IF EXISTS "Public can view programs via token" ON public.program_requests;
DROP POLICY IF EXISTS "Items readable via active request" ON public.program_request_items;
DROP POLICY IF EXISTS "History readable via active request" ON public.program_request_history;
DROP POLICY IF EXISTS "Billing lines readable via active request" ON public.program_item_billing_lines;
DROP POLICY IF EXISTS "Accommodation readable via active program" ON public.accommodation_requests;
DROP POLICY IF EXISTS "Quotes readable via request" ON public.accommodation_quotes;
DROP POLICY IF EXISTS "Customers read submitted quote extras" ON public.accommodation_quote_extras;
