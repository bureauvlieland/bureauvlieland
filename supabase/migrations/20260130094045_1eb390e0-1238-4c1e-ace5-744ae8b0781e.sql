-- Fix: Update the default value for customer_token to use the correct function reference
-- The gen_random_bytes function is available in pgcrypto extension

-- First, ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the default value for accommodation_requests.customer_token
ALTER TABLE public.accommodation_requests 
ALTER COLUMN customer_token SET DEFAULT encode(gen_random_bytes(16), 'hex');