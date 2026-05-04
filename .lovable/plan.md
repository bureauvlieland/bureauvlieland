# Logies-tab klantportal: duidelijkheid + 2-weg communicatie

De huidige Logies-sectie in de klantportal heeft twee zwakke plekken:

1. **"Gegevens wijzigen"** opent de algemene programma-wijzigdialoog, maar de klant ziet niet welke gevolgen aanpassingen hebben voor de logies-aanbieding. De achterliggende sync naar het hotel werkt al (datum/personen → quotes terug naar pending + mail naar partner), maar dat is voor de klant onzichtbaar.
2. **"Neem contact op"** stuurt een eenrichtingsmail. Antwoorden komen wel binnen via `inbound-email` en worden gelogd in `project_communications`, maar de klant ziet zijn eigen verzonden berichten en de antwoorden van het hotel nergens terug in de portal. De partner ziet de conversatie ook niet als aparte stroom in zijn omgeving.

We pakken beide punten aan en lijnen het patroon uit met hoe Admin ↔ Partner al communiceert.

## 1. Wijzigingen met expliciete logies-impact

In `EditProgramDetailsDialog`:
- Boven de waarschuwing een nieuwe sectie **"Gevolgen voor uw logies"** wanneer er een geselecteerde/ingediende quote is (Hotel Zeezicht in dit geval). Toont per type wijziging in gewone taal:
  - Datum gewijzigd → "Hotel Zeezicht ontvangt automatisch een bericht en bevestigt of de nieuwe data nog beschikbaar zijn. Tot die bevestiging staat uw boeking weer op 'in behandeling'."
  - Aantal personen gewijzigd → "Hotel Zeezicht past het aantal kamers/gasten aan en stuurt een bijgewerkte prijsopgave."
  - Beide → gecombineerd.
- Checkbox-bevestiging "Ik begrijp dat mijn logiesreservering opnieuw bevestigd moet worden" alleen als er daadwerkelijk een actieve quote is; pas dan is "Opslaan" actief.
- Statuschip in de hoofdkaart wisselt automatisch terug van "Gekozen / Logies geregeld" naar "In afwachting van bevestiging" zodra de wijziging is opgeslagen (hangt al aan quote.status — bestaande logica in `update-customer-program`, alleen UI-label aanscherpen).

Geen backend-wijziging nodig voor de sync zelf — die loopt al.

## 2. 2-weg berichtenthread klant ↔ logiespartner

Vervangt de huidige one-shot dialoog. Patroon spiegelt de bestaande Admin ↔ Partner thread.

### Datamodel
Hergebruik `project_communications` (bestaat al, wordt al gevuld door `send-customer-accommodation-message` outbound en `inbound-email` inbound). We voegen toe:
- Nieuwe rij-eigenschap `audience` (text, default `"admin"`, waardes: `"admin"`, `"customer_partner"`). Bestaande rijen blijven `admin`. Migratie zet bestaande `customer_accommodation_message`-gerelateerde rijen op `customer_partner` (op basis van `sent_by LIKE 'customer:%'` of inbound-replies daarop).
- Index op `(accommodation_id, audience, communication_date)`.
- RLS: klant mag rijen lezen waar `audience='customer_partner'` én `request_id` matcht een program waarvan hij het token heeft (via bestaande edge-function pattern, niet directe RLS — we lezen via een nieuwe edge function `get-customer-accommodation-thread`).

### Klantportal UI
In `AccommodationSection.tsx` onder de geselecteerde quote:
- Nieuwe **"Berichten met {hotelnaam}"** card (collapsible, default open als er berichten zijn).
- Toont chronologisch de uitgaande berichten van de klant en de inkomende antwoorden van het hotel. Avatar/labels: "U" en hotelnaam.
- Knop "Nieuw bericht" opent de bestaande dialoog, hernoemd naar **"Bericht aan {hotelnaam}"**.
- Realtime via Supabase channel op `project_communications` filter `accommodation_id=eq.X`.

### E-mail flow
- Outbound (`send-customer-accommodation-message`): zet `audience='customer_partner'`. ReplyTo blijft het bestaande `reply+{reference_number}@reply.bureauvlieland.nl` subaddress zodat antwoorden via `inbound-email` terugkomen.
- Inbound (`inbound-email`): wanneer de afzender de partner van een quote bij dit project is én er bestaat een eerdere `customer_partner`-rij voor die accommodation, log de reply ook als `audience='customer_partner'` en stuur de notificatiemail naar de klant (al deels aanwezig). De notificatiemail krijgt expliciete tekst: *"U kunt direct antwoorden op deze e-mail of inloggen op uw programma-pagina om te reageren."*
- E-mail aan de partner krijgt onderaan een duidelijke regel: *"Antwoord direct op deze e-mail — uw bericht komt automatisch terecht bij {klantnaam} en wordt gelogd in uw partner-dashboard."*

### Partner portal
In `PartnerAccommodation.tsx` (en dashboard-card) een nieuwe tab/sectie **"Berichten met klant"** naast de bestaande admin-chat, gevoed uit dezelfde `project_communications` met `audience='customer_partner'`. Reageren vanuit de partnerportal voegt een rij toe en mailt de klant (nieuwe edge function `send-partner-customer-message`, spiegelbeeld van `send-customer-accommodation-message`).

### Privacy
- Bij `invoicing_mode='bureau_central'` (memory: bureau central model) wordt in mails naar de partner de klantnaam wel getoond (nodig voor context van de boeking) maar geen e-mail/telefoon. Dit volgt het bestaande pattern in `send-customer-accommodation-message` waar contactgegevens al worden gemaskeerd. Geen wijziging, alleen bevestigen in tests.

## Technische details

```text
┌──────────────────────────────────────────────────────────┐
│ Klant (portal)                                           │
│  ├─ EditProgramDetailsDialog  →  update-customer-program │
│  │     └─ syncs accommodation_requests + resets quotes   │
│  └─ AccommodationThread (nieuw)                          │
│        ├─ list: get-customer-accommodation-thread (new)  │
│        └─ send: send-customer-accommodation-message      │
│              └─ project_communications (audience=cp)     │
└──────────────────────────────────────────────────────────┘
                          ▲
                          │ Mailjet Parse → inbound-email
                          ▼
┌──────────────────────────────────────────────────────────┐
│ Partner portal                                           │
│  └─ CustomerMessagesPanel (nieuw, in PartnerAccommodation)│
│        ├─ list: project_communications RLS               │
│        └─ send: send-partner-customer-message (nieuw)    │
└──────────────────────────────────────────────────────────┘
```

### Bestanden die wijzigen
- `supabase/migrations/<new>.sql` — kolom `audience`, index, backfill.
- `src/components/customer-portal/EditProgramDetailsDialog.tsx` — impactsectie + bevestiging.
- `src/components/customer-portal/AccommodationSection.tsx` — thread-card + label-tweak.
- `src/components/customer-portal/AccommodationMessageThread.tsx` (nieuw).
- `src/components/customer-portal/ContactAccommodationDialog.tsx` — submit ververst de thread; success-state korter.
- `supabase/functions/send-customer-accommodation-message/index.ts` — `audience` zetten + duidelijker reply-instructie in mail.
- `supabase/functions/get-customer-accommodation-thread/index.ts` (nieuw).
- `supabase/functions/inbound-email/index.ts` — `audience` zetten op partner-replies bij customer-thread.
- `supabase/functions/send-partner-customer-message/index.ts` (nieuw).
- `src/pages/PartnerAccommodation.tsx` + nieuwe `CustomerMessagesPanel` component.

### Niet in scope
- Geen aparte notificatiebadge in de hoofdnavigatie van de partner (volgt bestaand chat-patroon, kan later).
- Geen attachments in de klant↔partner-thread (kan in v2; outbound mail attachments zou via `Mailjet Parse` met `Attachments` moeten — apart traject).
