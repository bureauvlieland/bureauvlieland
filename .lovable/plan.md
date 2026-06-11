# Berichtencentrum: aparte "Te beantwoorden" inbox met antwoordfunctie

## Wat er verandert

Het Berichtencentrum (`/admin/berichten`) krijgt twee tabbladen:

1. **Te beantwoorden** (nieuw, standaard geopend) — alle inkomende e-mails die nog niet beantwoord zijn
2. **Verzonden e-mails** — de huidige tabel met uitgaande transactionele mails (blijft zoals het is)

## Tabblad "Te beantwoorden"

- Lijst van inkomende e-mails (uit het communicatiedossier, richting "inbound"), nieuwste bovenaan, met teller-badge op het tabblad.
- Elke rij toont: afzender (naam + e-mail), onderwerp, datum, projectlink en een leesbare preview. Klikken klapt de rij uit zodat je de **volledige tekst** leest — geen afgebroken weergave meer.
- Per bericht drie acties:
  - **Beantwoorden** — opent het bestaande e-mailvenster (SendProjectEmailSheet), voorgevuld met de afzender als ontvanger, onderwerp "Re: …" en het originele bericht als citaat eronder. AI-suggestie en templates blijven beschikbaar. Na verzenden wordt het bericht **automatisch gemarkeerd als beantwoord**.
  - **Naar project** — doorklikken naar het projectdossier (communicatie-tab).
  - **Markeer als beantwoord** — handmatig afvinken (bijv. als je telefonisch hebt gereageerd), met ongedaan-maken-optie.
- Schakelaar "Toon beantwoord" om afgehandelde berichten terug te zien (met wie/wanneer beantwoord).

## Inbox-bel rechtsboven

- De bel toont voortaan alleen **onbeantwoorde** inkomende e-mails — beantwoorden ruimt dus direct de inbox op.
- Klikken op een e-mail in de bel gaat naar het tabblad "Te beantwoorden" met dat bericht direct uitgeklapt en gemarkeerd, zodat je niet meer hoeft te zoeken.

## Technische details

- **Database**: twee kolommen op `project_communications`: `answered_at` (timestamp) en `answered_by` (admin-gebruiker). Geen nieuwe tabel nodig.
- **Frontend**: 
  - `AdminMessages.tsx` krijgt tabs; nieuwe component `InboxToAnswer.tsx` voor het inbox-tabblad.
  - Hergebruik van `SendProjectEmailSheet` met voorgevulde ontvanger/onderwerp/citaat; bij succes wordt `answered_at` gezet via de bestaande `onEmailSent`-callback.
  - `useAdminInbox.ts` (bel-popover) filtert op `answered_at IS NULL`; navigatie wijst naar `/admin/berichten?inbox=<id>`.
- Realtime updates blijven werken (bestaande Supabase-realtime kanalen op `project_communications`).
