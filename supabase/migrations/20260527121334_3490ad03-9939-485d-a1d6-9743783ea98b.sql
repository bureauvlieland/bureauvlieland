
-- Grants for program_requests
GRANT INSERT ON public.program_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_requests TO authenticated;
GRANT ALL ON public.program_requests TO service_role;

-- Grants for program_request_items
GRANT INSERT ON public.program_request_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_request_items TO authenticated;
GRANT ALL ON public.program_request_items TO service_role;

-- Grants for program_request_history
GRANT INSERT ON public.program_request_history TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_request_history TO authenticated;
GRANT ALL ON public.program_request_history TO service_role;

-- Allow anonymous customers to insert items for a program request they just created
DROP POLICY IF EXISTS "Anyone can create program request items" ON public.program_request_items;
CREATE POLICY "Anyone can create program request items"
ON public.program_request_items
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.program_requests pr
    WHERE pr.id = program_request_items.request_id
  )
);

-- Allow anonymous customers to log history for a program request they just created
DROP POLICY IF EXISTS "Anyone can create program request history" ON public.program_request_history;
CREATE POLICY "Anyone can create program request history"
ON public.program_request_history
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.program_requests pr
    WHERE pr.id = program_request_history.request_id
  )
);
