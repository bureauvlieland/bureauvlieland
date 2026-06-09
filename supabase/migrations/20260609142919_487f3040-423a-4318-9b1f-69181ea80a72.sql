ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS attribution jsonb;

ALTER TABLE public.accommodation_requests
  ADD COLUMN IF NOT EXISTS attribution jsonb;

CREATE INDEX IF NOT EXISTS idx_program_requests_attribution_utm_source
  ON public.program_requests ((attribution->>'utm_source'));

CREATE INDEX IF NOT EXISTS idx_program_requests_attribution_entry_path
  ON public.program_requests ((attribution->>'entry_path'));