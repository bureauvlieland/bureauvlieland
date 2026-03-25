

## Plan: Fix "Fout bij versturen offerte" — Redeploy `send-quote-offer`

### Diagnose
De edge function `send-quote-offer` toont alleen "shutdown" logs en geen enkele executie-log. Dit betekent dat de functie crasht bij het opstarten (boot error), voordat het request überhaupt verwerkt kan worden.

**Oorzaak:** De recente wijzigingen aan `_shared/email-templates.ts` (o.a. toevoeging van `buildReplyTo`) zijn wel gedeployed voor andere functies, maar `send-quote-offer` is niet opnieuw gedeployed. Hierdoor faalt de import bij het laden.

### Oplossing
Eén stap: **Redeploy `send-quote-offer`** via `deploy_edge_functions`. Geen codewijzigingen nodig — de broncode is correct, maar de gedeployde versie is verouderd.

### Bestanden
Geen wijzigingen — alleen een deployment actie.

