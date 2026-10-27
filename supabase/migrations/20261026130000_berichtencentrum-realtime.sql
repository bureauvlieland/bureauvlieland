-- Berichtencentrum fase 0: live bijwerken zonder "Vernieuwen"-knop.
--
-- De admin abonneerde zich al op wijzigingen in project_communications
-- (useAdminInbox), maar die tabel zat niet in de realtime-publicatie, dus er
-- kwam nooit een gebeurtenis. email_log komt erbij zodat een verzonden
-- automatische mail direct in het gesprek verschijnt. RLS blijft gelden:
-- alleen admins ontvangen de wijzigingen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_communications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_communications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'email_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_log;
  END IF;
END $$;
