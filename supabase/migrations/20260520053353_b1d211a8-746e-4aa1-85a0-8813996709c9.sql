UPDATE program_request_items SET 
  location_address = 'Reddingbootsteiger, Jachthaven',
  location_lat = 53.296215,
  location_lng = 5.0905
WHERE id = '0b3616dc-c212-4580-84f3-a3070e3c583f';
DELETE FROM program_change_log WHERE item_id = '0b3616dc-c212-4580-84f3-a3070e3c583f';