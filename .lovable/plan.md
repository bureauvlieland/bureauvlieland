
# Self-arranged items zichtbaar maken in klantportaal

## Probleem
Items die verwijzen naar bouwblokken van type `self_arranged` (boottickets, fietshuur) worden in het klantportaal niet als zodanig gemarkeerd. De klant ziet ze als gewone activiteiten, terwijl ze zelf verantwoordelijk zijn voor boeking en betaling.

Daarnaast zijn er 2 bestaande items in de database die een verkeerd `block_type` hebben (de "Overtocht met Rederij Doeksen" items staan als `partner` in plaats van `self_arranged`).

## Wat verandert

### 1. Datafix: bestaande items corrigeren
Een migratie die alle `program_request_items` bijwerkt waarvan het `block_type` afwijkt van het huidige `block_type` van het gekoppelde bouwblok. Dit corrigeert de 2 bootticket-items in dit project en eventuele andere inconsistenties.

### 2. Visuele markering in CustomerProgramItem
Self-arranged items krijgen een duidelijk andere weergave:
- Een opvallende badge "Zelf te regelen" (oranje/amber) in plaats van de reguliere statusbadge
- De provider-tekst wordt vervangen door "Zelf te boeken en betalen"
- Een directe link naar de externe boekingspagina (bijv. rederij-doeksen.nl of fietsverhuurvlieland.nl) als call-to-action knop
- Geen prijs/BTW-informatie (want dat regelt de klant zelf)

### 3. External URL meenemen bij item-aanmaak
Het `external_url` veld van het bouwblok wordt opgeslagen op het program_request_item, zodat de link beschikbaar is in het klantportaal zonder extra database-queries.

## Technische details

### Database-migratie
```sql
-- Fix bestaande items: sync block_type met building_blocks
UPDATE program_request_items pri
SET block_type = bb.block_type::text
FROM building_blocks bb
WHERE pri.block_id = bb.id
  AND pri.block_type != bb.block_type::text;
```

### Bestanden die worden aangepast

1. **`src/components/customer-portal/CustomerProgramItem.tsx`**
   - Detecteer `block_type === "self_arranged"` en toon aangepaste weergave
   - Badge "Zelf te regelen" in amber styling
   - Subtekst "Zelf te boeken en betalen" i.p.v. provider
   - External link knop wanneer beschikbaar
   - Geen prijs/BTW-details tonen

2. **`src/components/customer-portal/ItemStatusBadge.tsx`**
   - Nieuwe optionele variant voor self_arranged items

3. **`src/components/configurator/RequestFormModal.tsx`**
   - Bij het aanmaken van items ook het `external_url` veld meenemen (als het bouwblok dat heeft)

4. **`supabase/functions/update-customer-program/index.ts`**
   - Bij het toevoegen van items via de klantportal ook `external_url` meenemen

5. **`src/types/programRequest.ts`**
   - Optioneel `external_url` veld toevoegen aan het `ProgramRequestItem` type (als dat nog niet bestaat)

### Voorbeeld weergave

Een self_arranged item ziet er in het klantportaal zo uit:

```text
[afbeelding] Overtocht met Rederij Doeksen
             Zelf te boeken en betalen        [Zelf te regelen]
             Dag 1 - 15 mei | Flexibel
             [Boek bij Rederij Doeksen ->]
```

In plaats van het huidige:

```text
[afbeelding] Overtocht met Rederij Doeksen
             Bureau Vlieland                   [In behandeling]
             Dag 1 - 15 mei | Flexibel
```
