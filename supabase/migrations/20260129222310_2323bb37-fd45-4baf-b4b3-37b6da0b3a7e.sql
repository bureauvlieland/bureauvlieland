-- Fase 1: Offerte-modus Database Uitbreidingen

-- 1.1 Nieuwe kolommen op program_requests
ALTER TABLE program_requests
ADD COLUMN program_type text NOT NULL DEFAULT 'self_service',
ADD COLUMN quote_status text,
ADD COLUMN quote_valid_until date,
ADD COLUMN quote_sent_at timestamptz,
ADD COLUMN quote_sent_by uuid,
ADD COLUMN quote_personal_message text,
ADD COLUMN admin_created_by uuid;

-- 1.2 Nieuwe kolommen op program_request_items
ALTER TABLE program_request_items
ADD COLUMN item_quote_status text,
ADD COLUMN admin_price_override numeric,
ADD COLUMN admin_price_notes text,
ADD COLUMN skip_partner_notification boolean DEFAULT false;

-- 1.3 Indexes voor efficiënte filtering
CREATE INDEX idx_program_requests_type ON program_requests(program_type);
CREATE INDEX idx_program_requests_quote_status ON program_requests(quote_status) 
  WHERE program_type = 'quote';
CREATE INDEX idx_program_requests_quote_valid_until ON program_requests(quote_valid_until) 
  WHERE program_type = 'quote' AND quote_status = 'offerte_verstuurd';

-- 1.4 Constraint voor geldige program_type waarden
ALTER TABLE program_requests
ADD CONSTRAINT program_requests_program_type_check 
CHECK (program_type IN ('self_service', 'quote'));

-- 1.5 Constraint voor geldige quote_status waarden
ALTER TABLE program_requests
ADD CONSTRAINT program_requests_quote_status_check 
CHECK (quote_status IS NULL OR quote_status IN (
  'concept', 
  'in_afstemming', 
  'offerte_verstuurd', 
  'akkoord_ontvangen', 
  'definitief_bevestigd', 
  'verlopen', 
  'geannuleerd'
));

-- 1.6 Constraint voor geldige item_quote_status waarden
ALTER TABLE program_request_items
ADD CONSTRAINT program_request_items_quote_status_check 
CHECK (item_quote_status IS NULL OR item_quote_status IN (
  'concept', 
  'in_afstemming', 
  'bevestigd', 
  'optioneel'
));