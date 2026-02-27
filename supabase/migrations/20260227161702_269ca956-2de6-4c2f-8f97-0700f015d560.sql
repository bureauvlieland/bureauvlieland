CREATE POLICY "Partners can view linked program details for selected quotes"
ON program_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM accommodation_requests ar
    JOIN accommodation_quotes aq ON aq.request_id = ar.id
    JOIN partners p ON p.id = aq.partner_id
    WHERE ar.linked_program_id = program_requests.id
    AND p.auth_user_id = auth.uid()
    AND aq.status = 'selected'
  )
);