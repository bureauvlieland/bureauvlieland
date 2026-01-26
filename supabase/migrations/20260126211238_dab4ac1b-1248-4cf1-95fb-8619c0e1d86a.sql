-- Add customer_accepted_at field to program_request_items
-- This tracks when the customer explicitly accepted the partner's proposal (price/time/details)
ALTER TABLE public.program_request_items 
ADD COLUMN customer_accepted_at TIMESTAMPTZ NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.program_request_items.customer_accepted_at IS 'Timestamp when customer accepted the partner proposal (price, time, details). Separate from terms_accepted_at which is program-wide.';