ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS partner_instructions text,
  ADD COLUMN IF NOT EXISTS pending_partner_instructions text;