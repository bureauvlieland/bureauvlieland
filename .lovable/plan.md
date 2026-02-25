

# Waarschuwing "Gefactureerd door" corrigeren

## Probleem
De huidige waarschuwing bij "Gefactureerd door: Bureau Vlieland" zegt dat de partner niet genotificeerd wordt en het item niet in hun portaal ziet. Dit klopt niet: de notificatie en portaalzichtbaarheid zijn gebaseerd op `provider_id` (de uitvoerder), niet op `block_type` (de factureringspartij). De partner wordt dus wel degelijk genotificeerd en ziet het item wel.

## Oplossing
De waarschuwingstekst aanpassen in beide sheets zodat deze correct weergeeft wat er gebeurt:
- De partner wordt wel genotificeerd en ziet het item in hun portaal
- De factuur loopt via Bureau Vlieland, dus de partner hoeft geen factuur in te dienen

## Bestanden die worden aangepast

### 1. `src/components/admin/AdminEditActivitySheet.tsx`
De bestaande amber-waarschuwing wijzigen naar een informatieve melding (blauw/info-stijl):
- **Titel**: "Facturatie via Bureau Vlieland"
- **Tekst**: "[Partnernaam] ontvangt wel een aanvraag en ziet dit item in hun portaal, maar hoeft geen factuur in te dienen. De facturatie loopt via Bureau Vlieland."

### 2. `src/components/admin/AdminAddActivitySheet.tsx`
Dezelfde aanpassing doorvoeren in de "Toevoegen" sheet, zodat beide sheets consistent zijn.

## Technische details
- Alleen tekst- en stijlwijzigingen (amber -> info/blauw)
- Icoon wijzigen van `AlertTriangle` naar `Info`
- Geen logica-aanpassingen nodig -- de bestaande notificatie-flow via `skip_partner_notification` en `provider_id` werkt al correct
