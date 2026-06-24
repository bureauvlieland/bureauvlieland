UPDATE public.program_request_items
SET customer_accepted_at = NULL,
    customer_approved_at = NULL,
    item_quote_status = 'in_afstemming'
WHERE id = 'c4d51c8b-755d-4c56-9b9a-624859d651a6'
  AND status = 'alternative';