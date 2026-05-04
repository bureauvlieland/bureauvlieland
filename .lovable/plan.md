## Probleem

Bureau Vlieland-onderdelen (provider_id = `bureau`, bv. boot, fietsen, eigen begeleiding) worden in de huidige workflow anders behandeld dan partner-onderdelen:

- **Bij klant-akkoord op het voorstel** (`accept-quote-proposal`): bureau-items krijgen wel `customer_approved_at`, maar blijven verder hangen op hun originele status.
- **Bij "versturen naar partners"** (`send-items-to-partners`): bureau-items worden alleen "vrijgegeven" (`skip_partner_notification = false`, `status = pending`). Er is geen externe partij die ze ooit gaat bevestigen, dus ze blijven oneindig in `pending` staan in de klantportal.

De wens: bureau-items moeten "same same" meelopen — zodra de klant akkoord geeft én items naar de aanbieders gaan, mag het bureau-onderdeel meteen op **goedgekeurd / bevestigd** staan, want de aanbieder ervan is Bureau Vlieland zelf.

## Aanpak

Eén kleine aanpassing in de edge function `send-items-to-partners`: bij het vrijgeven van bureau-items meteen doorzetten naar de bevestigde eindstatus in plaats van `pending`.

### Wijzigingen

`**supabase/functions/send-items-to-partners/index.ts**`

- In stap 5 (release bureau items) update zetten naar:
  - `skip_partner_notification = false`
  - `status = 'confirmed'`
  - `item_quote_status = 'bevestigd'`
  - `customer_approved_at = now()` (als nog niet gezet — vangnet voor admin-flow waar customer approval misschien niet via portal liep)
  - `status_updated_at = now()`
- History-regel iets aanpassen: "X bureau-item(s) automatisch bevestigd (interne aanbieder)".
- De bestaande `bureau_item_pricing` todo-creatie blijft staan zodat ontbrekende prijzen nog steeds opgepakt worden.

De `guard_item_status_consistency` trigger staat dit toe omdat `skip_partner_notification` in dezelfde update naar `false` gaat.

### Geen wijzigingen nodig in

- `accept-quote-proposal`: zet al correct `customer_approved_at` op alle items (ook bureau).
- Customer portal UI: toont automatisch de juiste status zodra `status = 'confirmed'`.

## Eénmalige data-correctie

Bestaande projecten waar bureau-items al "vrijgegeven" zijn maar nog op `pending` staan zonder externe partner (provider_id = `bureau`, skip_partner_notification = false, status = pending) eenmalig bijwerken naar `confirmed` / `bevestigd` zodat de klantportal voor lopende projecten ook klopt.

## Test

Na deploy: één bestaand project openen waar bureau-items in pending staan, "verstuur naar partners" opnieuw triggeren is niet nodig — de eenmalige data-correctie pakt ze. Voor nieuwe projecten: end-to-end klantakkoord → verstuur → bureau-items staan direct op groen in de klantportal.  
  
Voor wat betreft de bootovertochten moet ik nog wel een aanvraag krijgen om de boottickets te boeken en de definitieve prijs hiervan op te geven. Dus ik moet als partner ook deze programma onderdelen krijgen net zoals alle andere partners. 