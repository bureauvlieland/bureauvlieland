-- Berichtencentrum fase 1: één waarheid voor "te beantwoorden".
--
-- De todo "Nieuw antwoord van … op BV-…" (auto_type inbound_email) liep
-- naast answered_at op project_communications en de twee raakten uit de pas.
-- inbound-email maakt deze todo niet meer aan; de Werkbank, de bel en de
-- zijbalk lezen voortaan rechtstreeks de onbeantwoorde berichten. De nog
-- openstaande exemplaren sluiten we hier eenmalig; het bericht zelf blijft
-- open zolang answered_at leeg is.
UPDATE public.admin_todos
SET status = 'done',
    completed_at = COALESCE(completed_at, now()),
    completion_reason = 'berichtencentrum_fase1'
WHERE auto_type = 'inbound_email'
  AND status NOT IN ('done', 'dismissed');
