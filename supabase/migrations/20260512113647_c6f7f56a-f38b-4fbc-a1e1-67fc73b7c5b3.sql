
ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS guest_names text,
  ADD COLUMN IF NOT EXISTS dietary_notes text,
  ADD COLUMN IF NOT EXISTS guest_details_updated_at timestamptz;

ALTER TABLE public.accommodation_requests
  ADD COLUMN IF NOT EXISTS room_assignment text,
  ADD COLUMN IF NOT EXISTS guest_details_updated_at timestamptz;
