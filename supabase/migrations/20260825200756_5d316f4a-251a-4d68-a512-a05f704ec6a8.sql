ALTER TABLE program_request_items DISABLE TRIGGER USER;
ALTER TABLE partner_purchase_invoices DISABLE TRIGGER USER;

UPDATE program_request_items i SET vat_rate = b.vat_rate FROM building_blocks b WHERE b.id = i.block_id AND i.vat_rate IS NULL AND b.vat_rate IS NOT NULL;

UPDATE partner_purchase_invoices SET vat_rate = 9, amount_incl_vat = 425 WHERE invoice_number = '2026056' AND partner_id = 'zeehonden';

UPDATE partner_purchase_invoices SET item_id = NULL WHERE invoice_number = '20260013' AND partner_id = 'de-bazuin-watertaxi';

INSERT INTO partner_purchase_invoice_allocations (invoice_id, item_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, sort_order)
SELECT p.id, '0bc9334f-be11-4409-9eda-de123aae72f4', 440.37, 9, 39.63, 480.00, 'Heenreis do 9 apr 07:30 Harlingen–Vlieland (RMD)', 1 FROM partner_purchase_invoices p WHERE p.invoice_number = '20260013' AND p.partner_id = 'de-bazuin-watertaxi';

INSERT INTO partner_purchase_invoice_allocations (invoice_id, item_id, amount_excl_vat, vat_rate, vat_amount, amount_incl_vat, notes, sort_order)
SELECT p.id, 'ce700798-7c95-49b7-bb4c-0c0e94d129c6', 431.19, 9, 38.81, 470.00, 'Terugreis vr 10 apr 15:45 Vlieland–Harlingen (RMD, incl retourkorting)', 2 FROM partner_purchase_invoices p WHERE p.invoice_number = '20260013' AND p.partner_id = 'de-bazuin-watertaxi';

ALTER TABLE program_request_items ENABLE TRIGGER USER;
ALTER TABLE partner_purchase_invoices ENABLE TRIGGER USER;