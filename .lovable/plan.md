## Wat is er aan de hand bij Scherp (BV-2606-0004)

Ik heb met de klant-token van Nancy ingelogd op het portaal en het gedrag exact gereproduceerd:

- Nancy heeft het portaal vandaag (14 juli, 13:13) opnieuw bekeken maar er staat **geen enkele wijziging in de historie** — geen `removed`, geen `day_changed`, geen `time_changed`.
- Als ik in het portaal op **"Verwijderen"** klik verdwijnt het onderdeel meteen uit beeld. Onderin verschijnt een sticky balk met knop **"Doorvoeren"**. Pas als je díe klikt gaat de wijziging via de edge function `update-customer-program` naar de database.
- Refresht Nancy vóór "Doorvoeren", dan is de lokale state weg en komt het onderdeel terug uit de database. **De klacht klopt dus feitelijk**, en het is inderdaad kwalijk: de UX suggereert dat verwijderen direct werkt.

Er is dus geen echte data-corruptie of RLS-bug — het is een gebrekkige "staged changes"-flow die aanvoelt als "opgeslagen". Nancy heeft simpelweg de bevestig-balk onderin nooit ingedrukt. Op een lang programma met 8 items en veel scrollen valt die balk ook makkelijk buiten beeld.

## Grondige fix

### 1. Verwijderde items blijven zichtbaar als "wordt verwijderd" (i.p.v. gewoon weg)

In `useCustomerProgram.removeItem` en `getItemsForDay` / `filter(status !== "cancelled")`:
- Bestaande items niet lokaal op `status: cancelled` zetten en verstoppen, maar in een aparte `pendingRemovals: Set<itemId>` bijhouden.
- Onderdeel blijft in de tijdlijn staan met:
  - Doorgestreepte titel
  - Rood badge "Wordt verwijderd — nog niet opgeslagen"
  - Knop **"Verwijderen ongedaan maken"** in plaats van "Verwijderen"
- `getPendingChanges()` blijft hetzelfde type `removed` change genereren op basis van deze set.

### 2. Onopgeslagen-wijzigingen kunnen niet stilletjes verloren gaan

- `beforeunload`-handler in `CustomerProgram.tsx` die de browser een confirm laat tonen zodra `pendingChanges.length > 0`. Tekst: *"U heeft nog niet-opgeslagen wijzigingen. Weet u zeker dat u de pagina wilt verlaten?"*
- Bij tab-navigatie binnen het portaal (Onderdelen ↔ Logies ↔ Akkoord) toont een dialog dezelfde waarschuwing als er onopgeslagen wijzigingen zijn.

### 3. Sterkere call-to-action-balk

In `DesktopProgramView.tsx` en `MobileProgramView.tsx`:
- Balk krijgt gele/oranje "warning" styling in plaats van neutraal wit — zo dringt hij door.
- Kop wordt: **"U heeft X niet-opgeslagen wijziging(en)"**
- Ondertitel: *"Klik op 'Opslaan' om ze door te voeren. Zonder opslaan gaan uw wijzigingen verloren."*
- Knoptekst: **"Wijzigingen opslaan"** i.p.v. "Doorvoeren".
- Op mobiel dezelfde balk (nu ook onderin, boven de bottom nav) en niet meer scrollbaar-weg.

### 4. Statushistorie ook loggen op klant-portaal-actie

De historie liet Nancy's klik(ken) niet zien omdat er nooit een submit was. Om in de toekomst te kunnen bewijzen wat een klant wél/niet heeft gedaan:
- Nieuwe entry `customer_portal_action` met `action: "remove_started"` / `"remove_undone"` in `program_request_history` op elke lokale klik. Dit gaat via een lichte edge-call (fire-and-forget) zodat we in het admin-log kunnen zien "klant heeft geprobeerd te verwijderen op tijdstip X maar niet opgeslagen".

### 5. Grondige tests

**Unit / contract tests** (`src/lib/__tests__/`):
- `customerPortalPendingChanges.test.ts`: `removeItem` op bestaand item ⇒ item blijft in `program.items`, verschijnt in `getPendingChanges()` als `removed`, `pendingRemovals` bevat het id.
- Undo: tweede `removeItem` op zelfde id ⇒ verwijdert uit `pendingRemovals`, verdwijnt uit `getPendingChanges()`.
- `submitChanges` roept edge function met correcte `changes`-payload aan (mock supabase client), en pas dan wordt `pendingRemovals` geleegd na `fetchProgram`.
- Testen dat `getItemsForDay` cancelled items uit database wél verstopt (bestaand gedrag) maar `pendingRemovals`-items juist toont.

**E2E-test** (`tests/e2e/customer-portal-remove-item.spec.ts`):
- Zet test-project op met 2 items via test-fixture, open klantportaal-URL.
- Klik Verwijderen → item krijgt strike-through, balk verschijnt.
- Refresh pagina → beforeunload confirm wordt bevestigd → na reload staat item weer normaal (want niet opgeslagen).
- Klik nogmaals Verwijderen → klik Opslaan → refresh → item is nu écht weg uit DB.

### 6. Release

- Migratie hoeft niet (alleen frontend + optioneel edge-log-endpoint).
- Nieuwe edge-function `log-customer-portal-action` alleen als we punt 4 meenemen (aparte, zeer kleine functie).
- Deploy via normale publish-flow. Ik test na deploy zelf de flow op Nancy's token één keer end-to-end (alleen kijken, niet klikken op Opslaan) en meld het resultaat.

## Communicatie richting Nancy

Na deploy stuur ik een korte mail-suggestie ter goedkeuring waarin je uitlegt: *"We hebben de portaal zo aangepast dat verwijderde onderdelen zichtbaar blijven tot je op 'Wijzigingen opslaan' klikt, en dat we waarschuwen als je de pagina wilt verlaten zonder op te slaan. Wil je het opnieuw proberen? Anders pas ik het handmatig aan volgens jouw planning."*

## Technische samenvatting

Files:
- `src/hooks/useCustomerProgram.ts` — nieuwe `pendingRemovals` state, aangepaste `removeItem`/`getPendingChanges`/`submitChanges`.
- `src/pages/CustomerProgram.tsx` — `beforeunload`-guard, navigatie-guard, prop `pendingRemovals` doorgeven.
- `src/components/customer-portal/CustomerProgramItem.tsx` — visuele "wordt verwijderd" state + Undo-knop.
- `src/components/customer-portal/DesktopProgramView.tsx` + `MobileProgramView.tsx` — nieuwe warning-balk styling en copy.
- `src/lib/__tests__/customerPortalPendingChanges.test.ts` — nieuw.
- `tests/e2e/customer-portal-remove-item.spec.ts` — nieuw.
- (optioneel) `supabase/functions/log-customer-portal-action/index.ts` — nieuw voor auditlog.
