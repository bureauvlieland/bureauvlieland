-- Add columns for customer counter-proposals
ALTER TABLE program_request_items 
ADD COLUMN IF NOT EXISTS customer_counter_time text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS customer_counter_note text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS customer_counter_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS confirmed_time text DEFAULT NULL;