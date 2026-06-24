## Diagnose project BV-2606-0020

Item "Zeehondentocht Exclusief" (`c4d51c8b…`):
- Klant gaf 22-06 13:39 bulk-akkoord op 17:30 → `customer_approved_at` én `customer_accepted_at` gezet.
- Partner stuurde vandaag 24-06 07:18 alternatief 16:30 → `status='alternative'`, `proposed_time=16:30`, `status_note="Beschikbaar om 16:30 ipv 17:30"`.
- **Mail naar klant is wél verstuurd**: `email_log` rij `template_name=status_alternative`, onderwerp "Alternatief voorstel voor Zeehondentocht Exclusief", 24-06 07:18.

**MAAR**: `customer_accepted_at` is niet gewist door de edge function (waarschijnlijk gedeployde versie zonder die regel, of de regel werd door iets anders overschreven). Gevolg:
- Badge in klantportal toont groen "Door u goedgekeurd".
- Header toont "Alles goedgekeurd / Voorstel goedgekeurd".
- Er verschijnt geen knop "Akkoord met nieuwe tijd".
- Klant kan dus niet expliciet bevestigen, en denkt dat alles al rond is.

## Wat ik ga doen

### 1. Edge function `update-partner-item-status` — harden + redeployen
Bij `status='alternative'` of `'unavailable'` na een eerdere klant-acceptatie altijd beide vlaggen wissen op het betrokken item:
- `customer_accepted_at = null`
- `customer_approved_at = null`
- `item_quote_status = 'wacht_op_klant'` (reset workflow-vlag)

Idem voor admin-flows die `proposed_time/date` of `quoted_price` na akkoord wijzigen — in die paden bestaat dezelfde reset al, maar controleren en consistent maken via één helper `resetCustomerApprovalOnItem(itemId)`.

### 2. Backfill BV-2606-0020
Eenmalige SQL: voor item `c4d51c8b…` `customer_accepted_at` en `customer_approved_at` op `NULL`, `item_quote_status='wacht_op_klant'`. Klantportal valt direct terug op "Akkoord nodig" + actieknop.

### 3. Klantportal — defensieve UI-regels
In `CustomerProgramItem.tsx`:
- `needsCustomerAction` mag niet door `customer_approved_at` worden gepacificeerd zolang `status='alternative'` en `updated_at > customer_approved_at`. Concreet: voor `alternative`-items zonder `customer_accepted_at` altijd actie vragen.
- Banner boven het item: "Aanbieder heeft een andere tijd voorgesteld — uw goedkeuring nodig" met expliciete knop "Akkoord met 16:30" / "Tegenvoorstel doen" / "Verwijderen uit programma".
- Toelichting van de partner (`status_note`) prominenter tonen bij alternative.

### 4. Aggregaten — header, stepper, hero
In `useProgramStatus` en `ProposalHeroCard`/`ProgramStepper`: een item telt pas als "goedgekeurd" wanneer `customer_accepted_at` aanwezig is én `updated_at <= customer_accepted_at` (geen latere partner-wijziging). Anders telt het als open.

Resultaat: "Alles goedgekeurd" / "2/2 100%" verdwijnt zolang er een open alternative ligt.

### 5. Tests
Uitbreiding `itemStatus.test.ts` + nieuwe `useProgramStatus.test.ts`:
- partner-alternative na klant-akkoord → derived = `wacht_op_klant`, niet `geaccepteerd`.
- aggregaat "alle goedgekeurd" wordt `false` zodra één item een latere alternative heeft.
- na klant accepteert alternative → derived = `geaccepteerd`, aggregaat weer `true`.

## Antwoord op uw vraag

Ja, er is vanochtend om 07:18 een mail "Alternatief voorstel voor Zeehondentocht Exclusief" naar de klant gestuurd. Maar in de portal ziet de klant het niet als openstaand omdat de eerdere bulk-acceptatie niet werd gewist — dat is de échte bug, en die los ik met bovenstaande stappen voor eens en altijd op, inclusief regressietests.
