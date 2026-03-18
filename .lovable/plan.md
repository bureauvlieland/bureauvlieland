

## Plan: Vereenvoudig totalen & fix vermenigvuldigingsbug

### Probleem 1: Te ingewikkeld voor klanten
Nu staan er twee totalen: "Bevestigd totaal" en "Indicatief totaal". Dat is verwarrend. Beter: **één totaalbedrag** dat alle zichtbare regels optelt, met voorlopige regels duidelijk gelabeld als "(voorlopig)".

### Probleem 2: Beachgolf wordt niet vermenigvuldigd
De logica op regel 79 checkt `item.status === "confirmed" && item.quoted_price !== null`. Als een item wél `quoted_price` heeft maar een andere status dan "confirmed" (bijv. "pending"), valt het buiten zowel de confirmed- als de preliminary-tak en toont het "—". Maar als het item confirmed is met `quoted_price` en `price_type === "per_person"`, zou het correct moeten vermenigvuldigen. Het verschil tussen beachgolf en powerkiten zit waarschijnlijk in de `price_type` waarde in de database — de ene staat op "per_person" en de andere op "total". Ik pas de code aan zodat de vermenigvuldiging robuuster is, en ik voeg een visuele controle toe zodat per-persoon items altijd duidelijk zichtbaar "× [aantal] pers." tonen.

### Wijzigingen

**`src/components/customer-portal/PriceSummaryCard.tsx`**:

1. **Eén totaal** — verwijder het onderscheid "Bevestigd totaal" vs "Indicatief totaal". Tel alles op (confirmed + preliminary items + fees + heffingen + logies) tot één "Totaal incl. BTW". Als er nog regels zonder prijs zijn, toon een subtiele melding dat het totaal nog kan wijzigen.

2. **Voorlopige regels labelen** — bij preliminary items het label "(voorlopig)" toevoegen naast het bedrag, in plaats van alleen "ca." ervoor. Zo is per regel duidelijk wat de status is.

3. **BTW-berekening meenemen** — ook preliminary bedragen meenemen in de BTW-uitsplitsing, zodat het totaal excl. BTW + BTW = totaal incl. BTW klopt met het ene getoonde totaal.

4. **Vermenigvuldiging controleren** — de multiplier-logica checken voor edge cases (items met `quoted_price` maar niet-confirmed status, items zonder expliciete `price_type`).

