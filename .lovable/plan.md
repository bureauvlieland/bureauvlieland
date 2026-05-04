## Wat gaat er mis?

Bij **BV-2603-0003** klikt de klant op "Akkoord" bij de overtocht Vlieland → Harlingen (16:50, dag 1), maar krijgt de melding **"Dit onderdeel kan nog niet geaccordeerd worden"**.

### Root cause

Het programma als geheel staat op `quote_status = akkoord_ontvangen` (klant heeft het hoofdvoorstel al geaccepteerd). Maar twee individuele items hebben nog `item_quote_status = "concept"`:

| Item | Day | Tijd | item_quote_status |
|---|---|---|---|
| Overtocht Harlingen → Vlieland | 1 | 09:05 | **concept** |
| Overtocht Vlieland → Harlingen | 1 | 16:50 | **concept** |

Het zijn beide ferry-items (block_type `bureau`) die kennelijk later zijn toegevoegd/ververst en nooit door `send-quote-offer` zijn opgepakt, dus hun status bleef op `concept` staan.

De edge function `approve-quote-item` accepteert alleen `["offerte_verstuurd", "in_afstemming", "bevestigd"]` — `concept` valt daarbuiten en geeft daarom de foutmelding. De UI toont echter wel de "Akkoord" knop omdat het programma globaal al akkoord is en het item op `confirmed` staat — vandaar de mismatch tussen wat de klant ziet en wat de backend toelaat.

## Plan

### 1. `approve-quote-item` toleranter maken
Wanneer het programma al op `akkoord_ontvangen` of `definitief_bevestigd` staat, moeten ook items met `item_quote_status = "concept"` goedgekeurd kunnen worden. Per-item akkoord op een al-geaccepteerd programma mag nooit blokkeren op een interne status-stap die overgeslagen is.

Aanpassing in de validatie (regel 175):
```ts
const allowedItemStatuses = ["offerte_verstuurd", "in_afstemming", "bevestigd"];
const programIsAccepted = ["akkoord_ontvangen", "definitief_bevestigd"].includes(program.quote_status);
if (
  !allowedItemStatuses.includes(item.item_quote_status || "") &&
  !(programIsAccepted && item.item_quote_status === "concept")
) {
  return 400 "Dit onderdeel kan nog niet geaccordeerd worden";
}
```

In de update-payload zetten we `item_quote_status` dan ook meteen naar `in_afstemming` zodat het item niet meer op `concept` blijft hangen.

### 2. Data correctie BV-2603-0003
De twee ferry-items (`5fa639f0-…` en `7d49cd63-…`) migreren we van `concept` → `offerte_verstuurd`, zodat ze direct via de normale weg goedgekeurd kunnen worden.

### 3. Preventie bij nieuwe items
Onderzoeken waar ferry-items na akkoord nog op `concept` worden gezet (waarschijnlijk in de ferry-refresh / admin-add flow). Daar moet, als het programma al `akkoord_ontvangen` is, het nieuwe item meteen op `offerte_verstuurd` worden gezet zodat de klant het kan akkorderen zonder backend-wisseltrucs. Dit komt erbij als een tweede commit na het lokaliseren van de exacte schrijflocatie.

## Resultaat
- Klant kan de overtocht-items in BV-2603-0003 direct akkorderen.
- Toekomstige later-toegevoegde items in een al-geaccepteerd programma blokkeren de klant niet meer.
