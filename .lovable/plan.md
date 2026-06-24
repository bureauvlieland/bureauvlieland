## Probleem

Op `BV-2606-0020` heeft de klant het enige programma-onderdeel al goedgekeurd (groen vinkje + "U heeft dit programmaonderdeel goedgekeurd" zichtbaar op de kaart), maar de zijbalk-stepper toont nog:

- "Onderdelen goedkeuren · 0/2 · 0%"
- "Bekijk en keur uw onderdelen goed (0 van 0)"
- Actieve blauwe knop **Onderdeel goedkeuren →**

De admin-omgeving toont de status wél correct.

## Oorzaak

In `src/hooks/useProgramStatus.ts` worden `customerApprovableTotal` en `customerApprovedCount` afgeleid uit items met `status IN ('confirmed','alternative')`. Het onderdeel in de screenshot heeft `status = 'pending'` (wacht nog op partner-bevestiging), maar `customer_approved_at` is wél gezet. Dat item valt daardoor uit zowel teller als noemer → resultaat "0 van 0", `approveDone = false`, en de CTA blijft staan.

## Fix (frontend only, geen data-migratie)

`src/hooks/useProgramStatus.ts`:

1. Noemer (`customerApprovableTotal`) uitbreiden: een item telt mee zodra de klant er iets over kan/heeft kunnen zeggen — dus `status IN ('confirmed','alternative')` **OR** `customer_approved_at IS NOT NULL` (en uiteraard nog steeds `isCustomerActionableCandidate`).
2. Teller (`customerApprovedCount`) baseren op `customer_approved_at` in plaats van op het verschil met `proposalActionsCount`. Zo blijft de teller correct ook als status later wijzigt.
3. `proposalActionsCount` blijft ongewijzigd (alleen items die nog daadwerkelijk klant-actie nodig hebben).

Hierdoor:
- Zijbalk toont "1 van 1" → `approveDone = true` → groen vinkje op stap "Alle onderdelen goedgekeurd".
- CTA "Onderdeel goedkeuren" verdwijnt.
- Stepper schuift door naar "Aanbieders bevestigen" (actief), in lijn met admin.
- Geen impact op fase-2 bulk-akkoord (`proposalActionsCount` ongewijzigd).

Geen wijzigingen aan database, edge functions of admin-views nodig.