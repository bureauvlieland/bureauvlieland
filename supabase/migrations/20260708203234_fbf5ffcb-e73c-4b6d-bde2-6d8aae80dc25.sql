
-- Track auto-close reasons so we can filter and audit
ALTER TABLE public.admin_todos ADD COLUMN IF NOT EXISTS completion_reason text;
COMMENT ON COLUMN public.admin_todos.completion_reason IS 'Optional marker for automated closures, e.g. auto_past_execution';

ALTER TABLE public.program_request_items ADD COLUMN IF NOT EXISTS auto_closed_reason text;
COMMENT ON COLUMN public.program_request_items.auto_closed_reason IS 'Optional marker set when the item status is auto-forced (e.g. auto_past_execution)';

ALTER TABLE public.accommodation_quotes ADD COLUMN IF NOT EXISTS auto_closed_reason text;
COMMENT ON COLUMN public.accommodation_quotes.auto_closed_reason IS 'Optional marker set when the quote is auto-expired (e.g. auto_past_execution)';

CREATE INDEX IF NOT EXISTS idx_admin_todos_completion_reason
  ON public.admin_todos(completion_reason) WHERE completion_reason IS NOT NULL;
