-- BTW velden toevoegen aan building_blocks
ALTER TABLE building_blocks 
ADD COLUMN IF NOT EXISTS price_includes_vat boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 21;

-- Nieuwe tabel: bureau_invoices voor Bureau Vlieland facturen aan klanten
CREATE TABLE public.bureau_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES program_requests(id) ON DELETE CASCADE,
  
  -- Factuurgegevens
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  amount_excl_vat numeric NOT NULL,
  vat_amount numeric NOT NULL,
  amount_incl_vat numeric GENERATED ALWAYS AS (amount_excl_vat + vat_amount) STORED,
  
  -- Type: 'partial' (deelfactuur), 'final' (eindfactuur), 'credit' (creditnota)
  invoice_type text NOT NULL DEFAULT 'partial',
  description text,
  
  -- Audit
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS voor bureau_invoices
ALTER TABLE public.bureau_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bureau invoices"
  ON public.bureau_invoices FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert bureau invoices"
  ON public.bureau_invoices FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update bureau invoices"
  ON public.bureau_invoices FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete bureau invoices"
  ON public.bureau_invoices FOR DELETE
  USING (is_admin(auth.uid()));

-- Workflow status op program_requests
ALTER TABLE program_requests 
ADD COLUMN IF NOT EXISTS completion_status text DEFAULT 'in_progress';

-- Trigger voor updated_at op bureau_invoices
CREATE TRIGGER update_bureau_invoices_updated_at
  BEFORE UPDATE ON public.bureau_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();