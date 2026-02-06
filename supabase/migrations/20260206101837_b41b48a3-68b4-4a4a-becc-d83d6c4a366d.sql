-- 1. Voeg invoicing_mode toe aan program_requests
ALTER TABLE program_requests 
ADD COLUMN invoicing_mode TEXT NOT NULL DEFAULT 'partner_direct';

-- 2. Maak partner_purchase_invoices tabel
CREATE TABLE partner_purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES program_requests(id) ON DELETE CASCADE,
  item_id UUID REFERENCES program_request_items(id) ON DELETE SET NULL,
  partner_id TEXT NOT NULL REFERENCES partners(id),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  amount_excl_vat NUMERIC NOT NULL,
  vat_rate NUMERIC NOT NULL DEFAULT 21,
  vat_amount NUMERIC NOT NULL,
  amount_incl_vat NUMERIC NOT NULL,
  description TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  registered_by TEXT NOT NULL DEFAULT 'partner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  forwarded_to_accounting_at TIMESTAMPTZ,
  forwarded_by UUID,
  
  CONSTRAINT valid_purchase_invoice_status CHECK (status IN ('pending', 'forwarded', 'paid'))
);

-- 3. RLS policies voor partner_purchase_invoices
ALTER TABLE partner_purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all purchase invoices"
ON partner_purchase_invoices FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Partners can view their purchase invoices"
ON partner_purchase_invoices FOR SELECT
USING (partner_id = get_partner_id(auth.uid()));

CREATE POLICY "Partners can insert their purchase invoices"
ON partner_purchase_invoices FOR INSERT
WITH CHECK (partner_id = get_partner_id(auth.uid()));

CREATE POLICY "Partners can update their purchase invoices"
ON partner_purchase_invoices FOR UPDATE
USING (partner_id = get_partner_id(auth.uid()));

-- 4. Indexes voor performance
CREATE INDEX idx_purchase_invoices_request ON partner_purchase_invoices(request_id);
CREATE INDEX idx_purchase_invoices_partner ON partner_purchase_invoices(partner_id);
CREATE INDEX idx_purchase_invoices_status ON partner_purchase_invoices(status);

-- 5. Updated_at trigger
CREATE TRIGGER update_purchase_invoices_updated_at
  BEFORE UPDATE ON partner_purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Bureau settings toevoegen
INSERT INTO app_settings (id, category, label, description, value, value_type)
VALUES 
  ('snelstart_email', 'integration', 'Snelstart Email', 
   'E-mailadres voor doorsturen inkoopfacturen naar boekhouding', '"bureauvlieland@boekhouding.nl"', 'text'),
  ('bureau_kvk_number', 'bureau', 'KvK-nummer', 
   'KvK-nummer Bureau Vlieland', '""', 'text'),
  ('bureau_vat_number', 'bureau', 'BTW-nummer', 
   'BTW-nummer Bureau Vlieland', '""', 'text'),
  ('bureau_address', 'bureau', 'Adres', 
   'Volledig adres Bureau Vlieland', '""', 'text'),
  ('bureau_admin_email', 'bureau', 'Administratie email',
   'Email voor facturatie zaken', '"administratie@bureauvlieland.nl"', 'text')
ON CONFLICT (id) DO NOTHING;