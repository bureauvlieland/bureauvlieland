-- Add idempotency_key column for dedupe of email sends
ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE INDEX IF NOT EXISTS idx_email_log_idempotency_recent
  ON public.email_log (idempotency_key, sent_at DESC)
  WHERE idempotency_key IS NOT NULL;

-- Extend status check (if any) to allow new statuses; use free text (no CHECK constraint present today)
-- Suppression list: adressen die niet meer gemaild mogen worden
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL,          -- 'bounce' | 'spam' | 'blocked' | 'unsub' | 'manual'
  source TEXT,                    -- 'mailjet-webhook' | 'admin' | ...
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_suppressions_email_lower
  ON public.email_suppressions (lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO authenticated;
GRANT ALL ON public.email_suppressions TO service_role;

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read suppressions"
  ON public.email_suppressions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert suppressions"
  ON public.email_suppressions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update suppressions"
  ON public.email_suppressions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete suppressions"
  ON public.email_suppressions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
