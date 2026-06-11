ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS snoozed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS snoozed_by uuid NULL,
  ADD COLUMN IF NOT EXISTS snoozed_reason text NULL;

CREATE INDEX IF NOT EXISTS program_requests_snoozed_until_idx
  ON public.program_requests (snoozed_until)
  WHERE snoozed_until IS NOT NULL;