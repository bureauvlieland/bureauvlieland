
CREATE OR REPLACE FUNCTION public.get_invoicing_mode_for_accommodation(_user_id uuid, _accommodation_request_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.invoicing_mode
  FROM program_requests pr
  JOIN accommodation_requests ar ON ar.linked_program_id = pr.id
  JOIN accommodation_quotes aq ON aq.request_id = ar.id
  JOIN partners p ON p.id = aq.partner_id
  WHERE ar.id = _accommodation_request_id
    AND p.auth_user_id = _user_id
    AND aq.status = 'selected'
  LIMIT 1
$$;
