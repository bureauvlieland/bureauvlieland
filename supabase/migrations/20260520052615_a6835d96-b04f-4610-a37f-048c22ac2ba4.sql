UPDATE program_request_items SET 
  pending_block_name = 'Zeehondentocht (SMOKE TEST)',
  pending_admin_price_override = 33.50,
  pending_price_type = 'per_person',
  pending_location_address = 'TEST adres Reddingbootsteiger',
  pending_provider_name = 'Zeehondentochten Vlieland (SMOKE)',
  pending_changed_at = now()
WHERE id = '0b3616dc-c212-4580-84f3-a3070e3c583f';