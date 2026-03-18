

## Analyse: Item offerte-statussen blijven op "Concept" na akkoord

### Wat er aan de hand is

De flow werkt als volgt:

1. **`send-quote-offer`** (offerte versturen naar klant) → zet alle actieve items van "concept"/"in_afstemming" naar **"bevestigd"**
2. **`accept-quote-proposal`** (akkoord verwerken) → zet de programma-status naar "akkoord_ontvangen", maar **raakt de item_quote_status niet aan**

Het probleem: als de admin de quote-status handmatig op "Akkoord ontvangen" zet (of via "Verstuur naar partners"), dan roept dat `accept-quote-proposal` aan. Maar die functie update alleen de programma-status, niet de item-statussen. Die blijven op "concept" staan.

Dit kan op twee manieren zijn ontstaan:
- De offerte is **nooit formeel verstuurd** via de "Verstuur offerte" knop (die `send-quote-offer` aanroept en de items naar "bevestigd" zet)
- Of de offerte is verstuurd maar de items zijn later gereset

In het geval van dit project lijkt het erop dat de "Akkoord ontvangen" status is gezet zonder dat de offerte eerder formeel is verstuurd, waardoor de items nooit de transitie van "concept" naar "bevestigd" hebben gemaakt.

### Fix

**Bestand: `supabase/functions/accept-quote-proposal/index.ts`**

Na het updaten van de programma-status (rond regel 358-368), ook de item_quote_status updaten voor items die nog op "concept" of "in_afstemming" staan → zet ze naar **"bevestigd"**. Dit is dezelfde logica die `send-quote-offer` al toepast, maar dan als vangnet bij het akkoord-proces.

Toevoegen na de programma-update:

```sql
UPDATE program_request_items 
SET item_quote_status = 'bevestigd' 
WHERE request_id = [program.id] 
  AND status != 'cancelled' 
  AND item_quote_status IN ('concept', 'in_afstemming')
```

Dit zorgt ervoor dat ongeacht of de offerte formeel is verstuurd, bij het akkoord alle items minimaal op "bevestigd" staan.

### Impact
- Geen breaking changes — items die al "bevestigd" of "optioneel" zijn worden niet geraakt
- Bestaande projecten met dit probleem worden niet retroactief gefixt, maar nieuwe akkoord-acties werken correct
- Optioneel: een eenmalige data-fix voor het huidige project (item_quote_status → "bevestigd" voor de 6 items)

