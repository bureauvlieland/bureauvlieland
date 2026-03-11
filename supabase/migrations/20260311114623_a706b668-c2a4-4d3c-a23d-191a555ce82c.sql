ALTER TABLE program_requests ALTER COLUMN invoicing_mode SET DEFAULT 'bureau_central';

-- Update existing partner_direct records to bureau_central
UPDATE program_requests SET invoicing_mode = 'bureau_central' WHERE invoicing_mode = 'partner_direct';