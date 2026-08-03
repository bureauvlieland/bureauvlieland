ALTER TABLE public.accommodation_quotes
  ADD COLUMN IF NOT EXISTS board_type text,
  ADD COLUMN IF NOT EXISTS board_notes text;

ALTER TABLE public.accommodation_requests
  ADD COLUMN IF NOT EXISTS board_preference text;