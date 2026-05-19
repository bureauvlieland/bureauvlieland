ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS pending_block_name text,
  ADD COLUMN IF NOT EXISTS pending_admin_price_override numeric,
  ADD COLUMN IF NOT EXISTS pending_price_type text,
  ADD COLUMN IF NOT EXISTS pending_admin_price_notes text,
  ADD COLUMN IF NOT EXISTS pending_location_lat numeric,
  ADD COLUMN IF NOT EXISTS pending_location_lng numeric,
  ADD COLUMN IF NOT EXISTS pending_location_address text,
  ADD COLUMN IF NOT EXISTS pending_provider_id text,
  ADD COLUMN IF NOT EXISTS pending_provider_name text,
  ADD COLUMN IF NOT EXISTS pending_provider_email text,
  ADD COLUMN IF NOT EXISTS pending_block_type text;