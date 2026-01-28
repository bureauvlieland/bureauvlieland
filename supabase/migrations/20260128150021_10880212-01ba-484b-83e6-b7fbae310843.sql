-- Add optional fields to partners table for enhanced settings
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS bank_iban text,
ADD COLUMN IF NOT EXISTS bank_account_name text,
ADD COLUMN IF NOT EXISTS booking_contact_name text,
ADD COLUMN IF NOT EXISTS booking_contact_phone text,
ADD COLUMN IF NOT EXISTS availability_notes text;