-- Automatische mails (email_log) kunnen nu ook gearchiveerd worden, zodat
-- gesprekken die alleen uit automatische mails bestaan uit het
-- Berichtencentrum kunnen verdwijnen.
ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE POLICY "Admins can archive email logs"
  ON public.email_log FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
