-- Pending change columns on program_request_items
ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS pending_preferred_time time without time zone,
  ADD COLUMN IF NOT EXISTS pending_day_index integer,
  ADD COLUMN IF NOT EXISTS pending_customer_notes text,
  ADD COLUMN IF NOT EXISTS pending_override_people integer,
  ADD COLUMN IF NOT EXISTS pending_marked_for_removal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_added boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_changed_by uuid,
  ADD COLUMN IF NOT EXISTS pending_baseline jsonb;

-- last_published_at on program_requests
ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS last_published_at timestamptz;

-- Change log table
CREATE TABLE IF NOT EXISTS public.program_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  item_id uuid,
  field text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  published_at timestamptz,
  notified_emails text[] NOT NULL DEFAULT '{}',
  admin_note text
);

CREATE INDEX IF NOT EXISTS idx_program_change_log_request ON public.program_change_log(request_id);
CREATE INDEX IF NOT EXISTS idx_program_change_log_published ON public.program_change_log(published_at);

ALTER TABLE public.program_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage change log" ON public.program_change_log;
CREATE POLICY "Admins manage change log"
ON public.program_change_log
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Service role inserts change log" ON public.program_change_log;
CREATE POLICY "Service role inserts change log"
ON public.program_change_log
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Helper index to quickly find items with pending changes
CREATE INDEX IF NOT EXISTS idx_program_request_items_pending
  ON public.program_request_items(request_id)
  WHERE pending_changed_at IS NOT NULL OR pending_marked_for_removal = true OR pending_added = true;