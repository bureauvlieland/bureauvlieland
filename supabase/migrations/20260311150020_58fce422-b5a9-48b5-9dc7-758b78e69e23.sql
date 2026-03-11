DROP POLICY IF EXISTS "Quotes readable via request" ON accommodation_quotes;

CREATE POLICY "Quotes readable via request"
ON accommodation_quotes
FOR SELECT
TO public
USING (
  (status = ANY (ARRAY['submitted'::text, 'selected'::text, 'expired'::text, 'declined'::text]))
  AND (EXISTS (
    SELECT 1
    FROM accommodation_requests ar
    WHERE ar.id = accommodation_quotes.request_id
      AND ar.expires_at > now()
  ))
);