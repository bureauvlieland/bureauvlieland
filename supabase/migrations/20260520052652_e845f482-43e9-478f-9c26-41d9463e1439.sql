UPDATE program_request_items SET 
  block_name = 'Zeehondentocht',
  admin_price_override = 32.50,
  location_address = 'Reddingbootsteiger, Jachthaven',
  provider_name = 'Zeehondentochten Vlieland'
WHERE id = '0b3616dc-c212-4580-84f3-a3070e3c583f';
DELETE FROM program_change_log WHERE item_id = '0b3616dc-c212-4580-84f3-a3070e3c583f' AND new_value::text LIKE '%SMOKE%';