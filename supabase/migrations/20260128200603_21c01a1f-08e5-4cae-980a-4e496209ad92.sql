-- Add pro forma tracking columns to program_request_items
ALTER TABLE public.program_request_items
ADD COLUMN IF NOT EXISTS proforma_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS proforma_amount_excl_vat NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_commission NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_deadline DATE,
ADD COLUMN IF NOT EXISTS actual_invoiced_excl_vat NUMERIC,
ADD COLUMN IF NOT EXISTS deviation_reason TEXT;

-- Add pro forma tracking columns to accommodation_quotes
ALTER TABLE public.accommodation_quotes
ADD COLUMN IF NOT EXISTS proforma_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS proforma_amount_excl_vat NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_commission NUMERIC,
ADD COLUMN IF NOT EXISTS proforma_deadline DATE,
ADD COLUMN IF NOT EXISTS actual_invoiced_excl_vat NUMERIC,
ADD COLUMN IF NOT EXISTS deviation_reason TEXT;

-- Add new app_setting for proforma deadline days (with proper JSONB value)
INSERT INTO public.app_settings (id, category, label, description, value_type, value)
VALUES (
  'proforma_deadline_days',
  'system',
  'Pro forma deadline dagen',
  'Aantal dagen dat partners hebben om afwijkingen te melden na pro forma notificatie',
  'number',
  '7'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Add comments for clarity
COMMENT ON COLUMN public.program_request_items.proforma_sent_at IS 'Timestamp when pro forma commission notification was sent to partner';
COMMENT ON COLUMN public.program_request_items.proforma_amount_excl_vat IS 'Calculated amount excluding VAT based on quoted_price';
COMMENT ON COLUMN public.program_request_items.proforma_commission IS 'Calculated commission amount based on proforma_amount_excl_vat';
COMMENT ON COLUMN public.program_request_items.proforma_deadline IS 'Deadline for partner to report deviations';
COMMENT ON COLUMN public.program_request_items.actual_invoiced_excl_vat IS 'Actual invoiced amount reported by partner if different from quoted';
COMMENT ON COLUMN public.program_request_items.deviation_reason IS 'Reason for deviation if actual_invoiced_excl_vat differs from proforma';

COMMENT ON COLUMN public.accommodation_quotes.proforma_sent_at IS 'Timestamp when pro forma commission notification was sent to partner';
COMMENT ON COLUMN public.accommodation_quotes.proforma_amount_excl_vat IS 'Calculated amount excluding VAT based on price_total';
COMMENT ON COLUMN public.accommodation_quotes.proforma_commission IS 'Calculated commission amount based on proforma_amount_excl_vat';
COMMENT ON COLUMN public.accommodation_quotes.proforma_deadline IS 'Deadline for partner to report deviations';
COMMENT ON COLUMN public.accommodation_quotes.actual_invoiced_excl_vat IS 'Actual invoiced amount reported by partner if different from quoted';
COMMENT ON COLUMN public.accommodation_quotes.deviation_reason IS 'Reason for deviation if actual_invoiced_excl_vat differs from proforma';