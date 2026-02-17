
-- 1. program_requests: anon SELECT for non-expired programs
CREATE POLICY "Public can view programs via token"
  ON public.program_requests FOR SELECT
  TO anon
  USING (expires_at > now());

-- 2. program_request_items: anon SELECT via active request
CREATE POLICY "Items readable via active request"
  ON public.program_request_items FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM program_requests pr
    WHERE pr.id = program_request_items.request_id
    AND pr.expires_at > now()
  ));

-- 3. program_request_history: anon SELECT via active request
CREATE POLICY "History readable via active request"
  ON public.program_request_history FOR SELECT
  TO anon
  USING (EXISTS (
    SELECT 1 FROM program_requests pr
    WHERE pr.id = program_request_history.request_id
    AND pr.expires_at > now()
  ));

-- 4. accommodation_requests: anon SELECT for non-expired
CREATE POLICY "Accommodation readable via active program"
  ON public.accommodation_requests FOR SELECT
  TO anon
  USING (expires_at > now());
