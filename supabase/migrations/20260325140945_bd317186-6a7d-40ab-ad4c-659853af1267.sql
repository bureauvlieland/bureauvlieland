UPDATE program_request_items pri
SET provider_name = p.name, provider_email = COALESCE(p.contact_email, p.email)
FROM partners p
WHERE pri.provider_id = p.id
AND pri.provider_name = 'Bureau Vlieland'
AND pri.provider_id != 'bureau'
AND pri.provider_id != '';