ALTER TABLE public.project_communications
  ADD COLUMN IF NOT EXISTS answered_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS answered_by uuid;

CREATE INDEX IF NOT EXISTS idx_project_communications_unanswered
  ON public.project_communications (communication_date DESC)
  WHERE direction = 'inbound' AND answered_at IS NULL;