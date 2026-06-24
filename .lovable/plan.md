## Probleem

`/admin/tickets` (Tickets én Bureau-uitvoering) tonen nu álle items van lopende projecten, ook als de klant het programma nog niet heeft goedgekeurd. Daardoor lijken ferries/fietsen/eigen activiteiten al "te boeken/regelen" terwijl we eigenlijk nog op de klant wachten.

## Regel

Een item is pas zichtbaar in deze werklijsten zodra de klant het heeft goedgekeurd: `program_request_items.customer_approved_at IS NOT NULL` (dit is ook al de signaal dat we elders in de app gebruiken voor "Door u goedgekeurd"). Cancelled items blijven uitgesloten (al het geval).

## Aanpassingen

**1. `src/pages/admin/AdminTickets.tsx` — tickets-query**
- Selecteer `customer_approved_at` mee.
- Filter `filtered` zo dat rijen zonder `customer_approved_at` verborgen worden in `period === "upcoming"` en `period === "all"`. In `period === "archive"` laten we ze ook weg (geen historisch belang als nooit goedgekeurd).
- `openCount` (tab-badge) telt alleen items mét klantakkoord die nog niet geboekt zijn.
- Tel apart hoeveel items wél in het systeem staan maar nog op klantakkoord wachten en toon dat als grijze sub-tekst onder de paginakop: "X items wachten nog op klantakkoord — nog niet boeken."

**2. `src/components/admin/bureau-execution/BureauExecutionList.tsx` — bureau-query**
- Selecteer `customer_approved_at` mee.
- Filter rijen zonder `customer_approved_at` uit `filtered`.
- `openCount` telt alleen goedgekeurde, nog niet geregelde items.
- Voeg dezelfde sub-tekst "X wachten nog op klantakkoord" toe onder de bestaande introzin.

**3. Geen wijziging in de inline-popovers** (`TicketBookingInline`, `BureauExecutionInline`) — die blijven werken in de projectdetail-pagina, waar admin desgewenst alvast iets kan invullen. De werklijsten zijn puur de "klaar om te doen"-views.

## Niet in scope
- Geen DB-migratie nodig.
- Geen wijzigingen aan klant/partner-portal of statusbadges.
- Geen wijziging aan e-mailflows of edge functions.

## Verificatie
- Bestaande unit tests blijven groen.
- Handmatig: een project in `offerte_verstuurd` met ferry + fietsen + eigen activiteit verdwijnt uit `/admin/tickets` (beide tabs) en verschijnt pas zodra de klant goedkeurt.
