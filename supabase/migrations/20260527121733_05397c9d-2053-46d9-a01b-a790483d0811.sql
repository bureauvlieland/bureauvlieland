
CREATE OR REPLACE FUNCTION public.program_request_exists(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.program_requests WHERE id = _id)
$$;

DROP POLICY IF EXISTS "Anyone can create program request items" ON public.program_request_items;
CREATE POLICY "Anyone can create program request items"
ON public.program_request_items
FOR INSERT
TO public
WITH CHECK (public.program_request_exists(request_id));

DROP POLICY IF EXISTS "Anyone can create program request history" ON public.program_request_history;
CREATE POLICY "Anyone can create program request history"
ON public.program_request_history
FOR INSERT
TO public
WITH CHECK (public.program_request_exists(request_id));
