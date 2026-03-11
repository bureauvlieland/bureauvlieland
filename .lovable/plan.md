

# Auto-todo "alle partners beantwoord" + stavaza-mail voor programma's

## Wat
1. **Auto-todo**: Wanneer alle partners van een programma-aanvraag hebben gereageerd (geen `pending` items meer over, exclusief `self_arranged`), wordt automatisch een admin-taak aangemaakt: "Alle partners hebben gereageerd op [referentie] — beoordeel en stuur update naar klant".
2. **Stavaza-mail knop**: Op de admin programma-detailpagina (`AdminRequestDetail.tsx`) een knop "Status update e-mail" die — net als bij logies — een `SendProjectEmailSheet` opent met een voorgegenereerde samenvatting van de huidige stand van zaken per programmaonderdeel.

## Aanpak

### 1. Nieuw auto-todo type: `all_partners_responded`
**Bestand:** `src/lib/autoTodoCreator.ts`
- Type toevoegen aan `AutoTodoType`
- Titel: `"Alle partners hebben gereageerd op ${referenceNumber} (${customerName})"`
- UI config: label "Alle reacties binnen", groene kleur

### 2. Todo aanmaken in edge function
**Bestand:** `supabase/functions/update-partner-item-status/index.ts`
- Na de bestaande "alle confirmed → terms_reminder" check (regel ~482), een bredere check toevoegen:
  - Haal alle items op met `skip_partner_notification = false` (dus alleen verstuurde items)
  - Filter `self_arranged` eruit
  - Als geen enkel item meer `pending` is → maak `all_partners_responded` todo aan (entity_id = request_id)
- Priority: `high`

### 3. Stavaza-mail functionaliteit
**Bestand:** `src/pages/admin/AdminRequestDetail.tsx`
- Import `SendProjectEmailSheet`
- State: `showStatusEmailSheet`, `statusEmailDefaults`
- Functie `generateProgramStatusEmailBody(request, items)` die een overzichtelijke e-mail genereert:
  - Aanhef met klantnaam, referentienummer, aantal personen, datum
  - Samenvatting: X van Y partners hebben gereageerd, X bevestigd, X niet beschikbaar, X alternatieven
  - Per categorie een lijstje van items met hun status
  - Link naar klantenportaal (`/mijn-programma/{customer_token}`)
  - Afsluitende tekst
- Knop "Status update e-mail" in de actie-sectie van de pagina
- `SendProjectEmailSheet` component onderaan renderen

### 4. Deep link in takenlijst
**Bestand:** `src/pages/admin/AdminTodos.tsx`
- `all_partners_responded` toevoegen aan `autoTypeActionConfig` met link naar `/admin/aanvragen/${related_request_id}`

### 5. Backfill bestaande projecten
**Bestand:** nieuw eenmalig edge function `supabase/functions/backfill-all-responded-todos/index.ts`
- Query alle actieve `program_requests`
- Per request: check of er items zijn met `skip_partner_notification = false` en `block_type != 'self_arranged'`
- Als alle items niet meer `pending` zijn en er geen bestaande todo is → aanmaken

### Bestanden
- `src/lib/autoTodoCreator.ts` — nieuw type + config
- `supabase/functions/update-partner-item-status/index.ts` — check na partner-reactie
- `src/pages/admin/AdminRequestDetail.tsx` — mail-knop + body generator + SendProjectEmailSheet
- `src/pages/admin/AdminTodos.tsx` — deep link config
- `supabase/functions/backfill-all-responded-todos/index.ts` — eenmalig backfill

