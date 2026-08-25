ALTER TABLE program_request_items DISABLE TRIGGER guard_partner_request_item_self_update;
ALTER TABLE program_request_items DISABLE TRIGGER trg_guard_item_status_consistency;
ALTER TABLE program_request_items DISABLE TRIGGER trg_guard_commission_exempt_items;

-- 1. Parkeerkosten-post: btw-tarief expliciet op 21% (parkeerplaats = hoog tarief)
UPDATE program_request_items
SET vat_rate = 21
WHERE id = '8c38bf4a-96a7-4e10-94cc-ccb23f07d771';

-- 2. Parkeerregel van verzamelfactuur De Bazuin 20260013 alloceren aan de extra kost
INSERT INTO partner_purchase_invoice_allocations (id, invoice_id, item_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, sort_order)
VALUES (
  gen_random_uuid(),
  'cd69da86-d7c9-4178-b266-e66bb54a6150',
  '8c38bf4a-96a7-4e10-94cc-ccb23f07d771',
  231.40,
  21,
  48.60,
  280.00,
  'Parkeren Harlingen (8x) bij watertaxi RMD Trainingen — geboekt als extra kost',
  2
);

ALTER TABLE program_request_items ENABLE TRIGGER guard_partner_request_item_self_update;
ALTER TABLE program_request_items ENABLE TRIGGER trg_guard_item_status_consistency;
ALTER TABLE program_request_items ENABLE TRIGGER trg_guard_commission_exempt_items;