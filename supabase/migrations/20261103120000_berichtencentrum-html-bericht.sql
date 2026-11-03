-- Berichtencentrum: de opgemaakte versie van een inkomende mail bewaren.
--
-- inbound-email sloeg alleen de platte tekst op (content, ingekort en zonder
-- aangehaalde eerdere mails). Het Berichtencentrum toonde daardoor een
-- aaneengeregen lap tekst. Voortaan bewaren we ook de HTML, zodat een bericht
-- in een venster te lezen is zoals de afzender hem opmaakte. Bestaande
-- berichten hebben geen HTML; daarvoor blijft de tekst.
ALTER TABLE public.project_communications
  ADD COLUMN IF NOT EXISTS html_body text;

COMMENT ON COLUMN public.project_communications.html_body IS
  'Opgemaakte inhoud van een inkomende e-mail (max. 100.000 tekens); null voor berichten van voor november 2026 en voor handmatige notities.';
