

## Plan: Locatie en URL meenemen bij AI/template-items + voorbeeldprogramma's actualiseren

### Probleem 1: Locatiegegevens ontbreken bij AI-gegenereerde items

Wanneer items worden toegevoegd via het AI-dialoog (`AdminAiProgramDialog`) of via template-toepassing (`ApplyTemplateDialog`), worden `location_lat`, `location_lng`, `location_address` en `external_url` **niet** overgenomen van de bouwsteen. De handmatige "Activiteit toevoegen" sheet (`AdminAddActivitySheet`) doet dit wél correct.

### Probleem 2: Voorbeeldprogramma's verwijzen mogelijk naar verouderde bouwstenen

Templates in `program_template_items` verwijzen via `block_id` naar bouwstenen. Als bouwstenen zijn gewijzigd (naam, prijs, provider, etc.), zijn de templates automatisch up-to-date — ze fetchen live block data. **Maar**: als een `block_id` is verwijderd of hernoemd, verschijnt het item als "onbekend". Dit moet gecontroleerd worden in de database.

### Wijzigingen

**1. `src/components/admin/AdminAiProgramDialog.tsx`**
- Voeg `location_lat`, `location_lng`, `location_address`, `external_url` toe aan de block select query (regel 126)
- Voeg deze velden toe aan `BlockInfo` interface
- Neem ze mee in `rowsToInsert` bij `handleApply`

**2. `src/components/admin/ApplyTemplateDialog.tsx`**
- De block query haalt al `select("*")` op, dus alle velden zijn beschikbaar
- Voeg `location_lat`, `location_lng`, `location_address`, `external_url` toe aan `rowsToInsert` (regel 64-82)

**3. Database check — verouderde template-items opsporen**
- Query uitvoeren om template-items te vinden die verwijzen naar niet-bestaande of niet-gepubliceerde bouwstenen
- Resultaat rapporteren zodat je weet of er templates bijgewerkt moeten worden

### Bestanden
1. `src/components/admin/AdminAiProgramDialog.tsx` — locatie + URL velden toevoegen
2. `src/components/admin/ApplyTemplateDialog.tsx` — locatie + URL velden toevoegen
3. Database query — orphaned template items opsporen

