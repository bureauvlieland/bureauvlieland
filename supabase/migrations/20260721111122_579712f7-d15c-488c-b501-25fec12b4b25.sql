ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS partner_dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_dismissed_reason text;

ALTER TABLE public.program_request_items
  DROP CONSTRAINT IF EXISTS program_request_items_partner_dismissed_reason_len;
ALTER TABLE public.program_request_items
  ADD CONSTRAINT program_request_items_partner_dismissed_reason_len
    CHECK (partner_dismissed_reason IS NULL OR char_length(partner_dismissed_reason) <= 500);