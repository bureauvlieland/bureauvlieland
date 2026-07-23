## Probleem
`building_blocks.min_people` / `max_people` staan wel in de database en worden getoond in Bouwstenen/ActiviteitDetail, maar er is **nergens** een validatie of waarschuwing als het werkelijke aantal deelnemers buiten die range valt. Gevolg: Watertaxi (max 12) is in BV-2606-0028 met 15 pers in het programma opgenomen zonder signaal.

## Plan — capaciteits-check invoeren op elke plek waar het aantal personen bepaald wordt

### 1. Centrale helper
Nieuwe module `src/lib/capacityCheck.ts` met:
- `getEffectivePeople(item, projectPeople)` → `override_people ?? projectPeople`.
- `checkCapacity({ people, min, max })` → `{ status: 'ok' | 'below_min' | 'above_max', message }`.
- Unit tests (`capacityCheck.test.ts`) inclusief edge cases (min/max null, exact op grens, override vs project-people).

### 2. Blokkeer + waarschuw in de klantportal
Waar de klant het totale aantal personen aanpast én waar een activiteit wordt toegevoegd:
- **Waarschuwing (niet blokkerend) als aantal > max_people** van één of meer geselecteerde items. Toon een inline banner met de lijst overschreden activiteiten + "pas het aantal aan of verwijder de activiteit".
- Bij "toevoegen activiteit"-picker: max-vol activiteiten krijgen een badge "Max X pers." en zijn selecteerbaar met bevestigingsmodal.
- Onder min: informatieve melding ("minimaal X personen — neem contact op voor kleiner gezelschap"), niet blokkerend.

### 3. Waarschuwing in admin
- `AdminEditActivitySheet` en waar `override_people` wordt gezet: real-time badge naast het personen-veld ("⚠ overschrijdt max 12 van deze bouwsteen"). Save is toegestaan maar vereist bevestiging in een dialog met vrij reden-veld dat wordt gelogd in `program_request_history` (action `capacity_override`).
- Projectdetail: sectie met alle items waarvan `effective_people` buiten de bouwsteen-range valt, bovenaan zichtbaar zodat je in één blik ziet welke onderdelen misschien handmatig geregeld moeten worden.

### 4. Configurator
Bij initiële selectie in de configurator: activiteiten met `max_people < gekozen groepsgrootte` tonen als "op aanvraag" met disclaimer, en `min_people > groepsgrootte` idem. Blokkeert niet, maar zet automatisch `custom_briefing`-notitie klaar zodat de admin weet dat capaciteit besproken moet worden.

### 5. Data-check retro-actief
Eenmalige SELECT-query om alle bestaande `program_request_items` met `effective_people > block.max_people` (of < min) in een rapport te tonen, zodat we (handmatig) kunnen beoordelen of ze aangepast moeten worden. Alleen rapport, geen data-mutatie.

### 6. Tests
- Unit-tests op `capacityCheck` (zie punt 1).
- Component-test: klantportal toont waarschuwingsbanner bij personen-wijziging boven max.
- Component-test: admin-sheet vereist reden bij opslaan buiten capaciteit.
- Regressietest: bestaande items zonder min/max blijven zonder waarschuwing.

## Technische details
- Geen schemawijziging nodig — velden bestaan al.
- `program_request_history` krijgt nieuwe action-key `capacity_override` (alleen data, geen enum-migratie).
- Alle waarschuwingsteksten formeel ("u") in klantportal, informeel ("je") in admin/partner conform tone-of-voice.

**Openstaande keuze:** hard blokkeren of alleen waarschuwen bij overschrijding in de klantportal? Advies: waarschuwen + bevestigen, niet hard blokkeren (er kunnen extra ritten/units geregeld worden — bijv. twee watertaxi-runs). Akkoord?