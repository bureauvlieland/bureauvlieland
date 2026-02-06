
-- Tighten the accommodation quotes "readable via request" policy
-- to only show submitted or selected quotes (not pending/draft ones)
-- and exclude quotes that expose internal commission data unnecessarily
DROP POLICY IF EXISTS "Quotes readable via request" ON accommodation_quotes;

CREATE POLICY "Quotes readable via request"
ON accommodation_quotes
FOR SELECT
USING (
  status IN ('submitted', 'selected')
  AND EXISTS (
    SELECT 1
    FROM accommodation_requests ar
    WHERE ar.id = accommodation_quotes.request_id
      AND ar.expires_at > now()
  )
);
