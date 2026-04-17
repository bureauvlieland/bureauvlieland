-- Add final_billing_locked_at to program_request_items
ALTER TABLE public.program_request_items
ADD COLUMN IF NOT EXISTS final_billing_locked_at timestamp with time zone;

-- Create program_item_billing_lines table
CREATE TABLE public.program_item_billing_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.program_request_items(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price_excl_vat numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 21,
  amount_excl_vat numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  amount_incl_vat numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_program_item_billing_lines_item_id ON public.program_item_billing_lines(item_id);

ALTER TABLE public.program_item_billing_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view billing lines"
ON public.program_item_billing_lines
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert billing lines"
ON public.program_item_billing_lines
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update billing lines"
ON public.program_item_billing_lines
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete billing lines"
ON public.program_item_billing_lines
FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_program_item_billing_lines_updated_at
BEFORE UPDATE ON public.program_item_billing_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();