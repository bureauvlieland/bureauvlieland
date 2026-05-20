UPDATE program_request_items SET 
  pending_location_address = 'Nieuw adres zonder coords',
  pending_location_lat = NULL,
  pending_location_lng = NULL,
  pending_changed_at = now()
WHERE id = '0b3616dc-c212-4580-84f3-a3070e3c583f';