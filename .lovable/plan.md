## Probleem

In het sheet **Activiteit bewerken** (admin) staat onder het bedrag een misleidende afleiding bij items met `price_type = "total"` (zoals **Vliehors Expres Exclusief** in BV-2602-0005).

Wat er nu wordt getoond:

```
Totaalbedrag voor 150 personen × 2 dagen   €825,00
Afgeleid: €5,50 per persoon (€2,75 p.p.p.d.)
```

Dit klopt niet:

- `price_type = total` betekent dat €825 het **vaste totaal** is voor de hele groep — ongeacht aantal personen of dagen. De zin "voor 150 personen × 2 dagen" suggereert dat het bedrag mee-schaalt.
- De "Afgeleid: … p.p.p.d." regel zet een totaalbedrag om in een per-persoon-per-dag tarief, terwijl Vliehors Expres juist géén per-persoon-prijs hanteert. Dat is precies de verwarring die je zag.
- De afleiding gebruikt `numberOfPeople` (150) terwijl het item een eigen `override_people` heeft (70). Voor andere items (per_person / per_person_per_day) moet wél `override_people ?? numberOfPeople` worden gebruikt — anders berekent het paneel een ander totaal dan wat onder water in `portalPricing.ts` wordt gerekend.

Onder water (`program_request_items`) is alles correct opgeslagen: `price_type='total'`, `admin_price_override=825`, `override_people=70`. Het totaalbedrag van €825 klopt dus. Alleen de UI in dit sheet is misleidend.

## Wat aanpassen

Eén bestand: `src/components/admin/AdminEditActivitySheet.tsx`, het breakdown-paneel (regels ~445-499).

1. **Effectief aantal personen** = `override_people ?? numberOfPeople`. Gebruiken in zowel breakdown-tekst als totaalberekening, zodat het paneel exact spiegelt wat `getDisplayLineTotal` in `portalPricing.ts` doet.

2. **Breakdown-tekst per price_type:**
   - `total` → `"Vast totaalbedrag voor de hele groep"` (geen "× personen × dagen").
   - `per_person` → `"€X p.p. × N personen"` (zoals nu).
   - `per_person_per_day` → `"€X p.p.p.d. × N personen × D dagen"` (zoals nu).

3. **"Afgeleid"-regel:**
   - Bij `total`: regel volledig **verbergen**. Een totaalbedrag heeft geen zinvolle p.p.- of p.p.p.d.-afleiding (en zeker niet als de groep niet per-persoon afrekent).
   - Bij `per_person` / `per_person_per_day`: regel blijft zoals hij is.

4. **Waarschuwing bij `total` met opvallend laag bedrag** (optioneel, klein): als `price_type=total` én `priceOverride < 50` én `numberOfPeople > 10`, een subtiele hint "Weet je zeker dat dit een totaalbedrag is en geen per-persoon prijs?" — spiegelbeeld van de bestaande waarschuwing bij `per_person` met hoog bedrag. Houdt admin scherp op verkeerd ingesteld prijstype.

## Wat niet aanpassen

- Geen wijzigingen aan `portalPricing.ts`, edge functions of database. De rekenkundige logica klopt al; alleen de admin-UI is onduidelijk.
- Geen wijziging aan het input-veld of het Select-component zelf.

## Verificatie

Na de wijziging openen voor:

- **BV-2602-0005 / Vliehors Expres Exclusief** (`total`, 825, override 70 op 150 totaal) → breakdown toont *"Vast totaalbedrag voor de hele groep — €825,00"*, geen p.p./p.p.p.d.-afleiding.
- **BV-2604-0008 / Fietshuur** (`per_person_per_day`, 12, 15 pers, 2 dagen) → blijft *"€12,00 p.p.p.d. × 15 personen × 2 dagen — €360,00"* met afgeleide per-persoon-regel.
- **BV-2604-0008 / Strand BBQ** (`per_person`, 35, 15 pers) → blijft *"€35,00 p.p. × 15 personen — €525,00"*.
