-- Add billing details columns to program_requests
ALTER TABLE public.program_requests
ADD COLUMN billing_company_name text,
ADD COLUMN billing_kvk_number text,
ADD COLUMN billing_vat_number text,
ADD COLUMN billing_address_street text,
ADD COLUMN billing_address_postal text,
ADD COLUMN billing_address_city text,
ADD COLUMN billing_contact_name text,
ADD COLUMN billing_contact_email text,
ADD COLUMN billing_reference text,
ADD COLUMN terms_accepted_at timestamp with time zone,
ADD COLUMN terms_version text;