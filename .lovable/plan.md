## Wat er nu mist

In de "Verzamelfactuur verwerken"-sheet (`src/components/admin/purchase-invoices/CollectiveInvoiceSheet.tsx`) zijn er drie paden per orderregel:

- **matched / manual** → groen, project getoond.
- **ambiguous** → meerdere kandidaten, dropdown om er één te kiezen.
- **unmatched** → alleen "Markeer als intern".

Bij **unmatched** is er nu geen knop om alsnog handmatig aan een bestaand ticket-item te koppelen. Dat is precies wat je hier nodig hebt: de Doeksen-Resnr's 12777224 / 12777275 / 12777279 (Stedelijk Gymnasium Haarlem) horen bij een bestaand project, alleen is `booking_reference` niet (correct) ingevuld op het `program_request_item`.

## Voorstel

Voeg bij `unmatched` (en als secundaire optie ook bij `ambiguous`) een **"Koppel handmatig…"**-knop toe naast "Markeer als intern". Deze opent een Popover met een Command-zoekvak:

- Zoeken op klantnaam, projectreferentie (bijv. BV-2605-xxxx), of bestaande Resnr.
- Resultaten: open `program_request_items` van partner `rederij` (ferry-tickets) uit actieve/recente projecten, gesorteerd op service-datum aflopend, met label `referentienummer · klant · route · datum`.
- Standaard ook tickets zónder `booking_reference` voorrang geven (dat zijn de waarschijnlijke kandidaten).
- Selectie zet exact dezelfde state als `chooseCandidate`: `item_id`, `match_status="manual"`, `project = {…}`. De bestaande `finalize-collective-invoice` edge function schrijft dan `program_request_items.booking_reference = resnr` weg en de match is permanent.

Bewust géén automatische "maak nieuw ticket aan"-route: als er echt geen ticket bestaat hoort het project zelf eerst aangevuld te worden, of de regel blijft een interne kostenpost.

## Technische details

**Bestand:** `src/components/admin/purchase-invoices/CollectiveInvoiceSheet.tsx`

1. Nieuwe sub-component `ManualLinkPopover` met `cmdk`-gebaseerde search (we gebruiken `@/components/ui/command` al elders).
2. Query: `program_request_items` joined met `program_requests`, filter `provider_id = 'rederij'` (of `block_type = 'bureau_ticket'` afhankelijk van wat consistent is met de bestaande matcher in `parse-collective-invoice`), `request.status not in ('cancelled','deleted')`. Limit 50, debounce 250 ms, ILIKE op `customer_name` / `reference_number` / `booking_reference`.
3. Reken kandidaten uit *deze* factuur (al gekozen `item_id`'s) uit de selectielijst om dubbele koppeling te voorkomen.
4. UI: knop "Koppel handmatig…" → Popover met zoekveld + lijst; bij `onSelect` aanroep van bestaande `chooseCandidate(idx, candidateItemId)` (of een lichte variant die zelf de `Candidate` opbouwt uit de query-rij).
5. Bij `ambiguous` als secundaire optie naast de bestaande dropdown ("Andere zoeken…").

**Geen backend-wijzigingen nodig** — `finalize-collective-invoice` accepteert `match_status: "manual"` met `item_id` al en schrijft `booking_reference` weg.

**Out of scope:** wijzigen van de auto-matcher, nieuwe tickets aanmaken vanuit deze sheet, of bulk-acties.