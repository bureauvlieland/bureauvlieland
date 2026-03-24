

## Plan: Partner-notificatie bij gastenaantal-wijziging + communicatielog compleet maken

### Probleem 1: Geen e-mail naar partner bij wijziging gastenaantal
De `updateGuestsMutation` in `AdminAccommodationDetail.tsx` reset offertes naar "pending" en logt een history-event, maar stuurt **geen e-mail** naar de geselecteerde partners. Partners weten dus niet dat ze opnieuw moeten offreren.

### Probleem 2: Communicatielog op logiespagina mist programma-gerelateerde mails
De `ProjectCommunicationsCard` op de logies-detailpagina krijgt alleen `accommodationId` mee, niet `requestId`. Mails die in `email_log` zijn gelogd met alleen `related_request_id` (bv. klantbevestigingen, programma-emails) verschijnen daardoor niet in het communicatiedossier van de logiespagina.

### Oplossing

**1. `src/pages/admin/AdminAccommodationDetail.tsx` — partner-notificatie toevoegen**

Na het resetten van de offertes, voor elke geselecteerde partner de bestaande edge function `send-accommodation-quote-request` aanroepen. Deze stuurt al een offerteaanvraag-email met de juiste template. Parameters:
- `request_id`: accommodation request ID
- `partner_ids`: alleen de partners van de geselecteerde quotes
- `email_subject` en `email_body`: een aangepaste tekst die meldt dat het gastenaantal is gewijzigd en er een nieuwe offerte wordt gevraagd

Dit hergebruikt de bestaande infrastructure en logt automatisch in `email_log` met `related_accommodation_id`.

**2. `src/pages/admin/AdminAccommodationDetail.tsx` — `requestId` meegeven aan communicatielog**

Wijzig de `ProjectCommunicationsCard` aanroep (regel 909-913) om ook `requestId={linkedProgram?.id}` mee te geven. Hierdoor toont het communicatielog zowel logies-specifieke als programma-gerelateerde emails.

### Bestanden
1. `src/pages/admin/AdminAccommodationDetail.tsx` — edge function call na gastwijziging + requestId aan communicatiecard

