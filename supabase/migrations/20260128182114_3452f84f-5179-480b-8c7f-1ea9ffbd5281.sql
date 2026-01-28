-- Create app_settings table for configurable business rules
CREATE TABLE public.app_settings (
  id text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  value_type text NOT NULL DEFAULT 'text',
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Admins can view and update settings
CREATE POLICY "Admins can view all settings"
  ON public.app_settings FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update settings"
  ON public.app_settings FOR UPDATE
  USING (is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER set_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (id, category, label, description, value_type, value) VALUES
  ('coordination_fee_tiers', 'pricing', 'Coördinatiefee Staffel', 
   'Fee tiers gebaseerd op groepsgrootte', 'json',
   '[{"maxPeople": 10, "fee": 50}, {"maxPeople": 25, "fee": 100}, {"maxPeople": 100, "fee": 250}, {"maxPeople": 150, "fee": 350}, {"maxPeople": 999999, "fee": 500}]'::jsonb),
  
  ('default_vat_rate', 'vat', 'Standaard BTW Tarief', 
   'Standaard BTW percentage voor activiteiten', 'number', '21'::jsonb),
  
  ('accommodation_vat_rate', 'vat', 'BTW Tarief Logies', 
   'BTW percentage voor logies', 'number', '9'::jsonb),
  
  ('default_partner_commission', 'commission', 'Standaard Partner Commissie', 
   'Commissie percentage voor activiteiten partners', 'number', '15'::jsonb),
  
  ('default_accommodation_commission', 'commission', 'Standaard Logies Commissie', 
   'Commissie percentage voor logies partners', 'number', '10'::jsonb),
  
  ('request_expiry_days', 'system', 'Geldigheidsduur Aanvragen', 
   'Aantal dagen dat een aanvraag geldig blijft', 'number', '90'::jsonb);