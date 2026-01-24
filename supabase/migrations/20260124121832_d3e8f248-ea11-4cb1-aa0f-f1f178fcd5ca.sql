-- Create partners table for commission management
CREATE TABLE public.partners (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  kvk_number text,
  address_street text,
  address_postal text,
  address_city text,
  commission_percentage decimal(5,2) NOT NULL DEFAULT 15.00,
  partner_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partners can read their own data via token
CREATE POLICY "Partners can read own data via token"
ON public.partners
FOR SELECT
USING (true);

-- Partners can update their own data via token (for later)
CREATE POLICY "Partners can update own data"
ON public.partners
FOR UPDATE
USING (true);

-- Add partner invoicing columns to program_request_items
ALTER TABLE public.program_request_items
ADD COLUMN executed_at timestamptz,
ADD COLUMN invoiced_amount decimal(10,2),
ADD COLUMN invoiced_number text,
ADD COLUMN invoiced_date date,
ADD COLUMN invoiced_file_path text,
ADD COLUMN commission_percentage decimal(5,2),
ADD COLUMN commission_amount decimal(10,2),
ADD COLUMN commission_status text DEFAULT 'not_applicable' CHECK (commission_status IN ('not_applicable', 'pending', 'invoiced', 'paid')),
ADD COLUMN commission_invoiced_at timestamptz,
ADD COLUMN commission_notes text;

-- Create storage bucket for partner invoice copies
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-invoices', 'partner-invoices', false);

-- Storage policies for partner invoices
CREATE POLICY "Anyone can upload partner invoices"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'partner-invoices');

CREATE POLICY "Anyone can read partner invoices"
ON storage.objects
FOR SELECT
USING (bucket_id = 'partner-invoices');

-- Trigger for partners updated_at
CREATE TRIGGER update_partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial partners from configuratorMockData
INSERT INTO public.partners (id, name, email, commission_percentage) VALUES
  ('bureau', 'Bureau Vlieland', 'info@bureauvlieland.nl', 0),
  ('zuiver', 'Zuiver Traiteur', 'info@zuivertraiteur.nl', 0),
  ('zeehonden', 'Zeehondentochten Vlieland', 'info@zeehondentochten.nl', 15),
  ('adventures', 'Vlieland Adventures', 'info@vlielandadventures.nl', 15),
  ('fietsverhuur', 'Fietsverhuur Vlieland', 'info@fietsverhuur.nl', 0),
  ('rederij', 'Rederij Doeksen', 'info@rfrederijdoeksen.nl', 0)
ON CONFLICT (id) DO NOTHING;