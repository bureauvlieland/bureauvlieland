UPDATE program_request_items SET 
  pending_provider_name = 'Andere Naam BV',
  pending_provider_id = NULL,
  pending_provider_email = NULL,
  pending_changed_at = now()
WHERE id = '0b3616dc-c212-4580-84f3-a3070e3c583f';