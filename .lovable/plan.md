# Fix: "Staffel op groepsgrootte" komt niet mee als onderdeel van een samengestelde bouwsteen

## Wat er misgaat

Beach Grill Experience (`strand-bbq`) heeft twee onderdelen met prijssoort **Staffel op groepsgrootte**:

- BBQ-huur (set) — staffels: 1-25 → €70, 26-50 → €140, 51-100 → €210
- Meubilair voor een catering — staffels: 1-25 → €124,50, 26-50 → €249, 51-100 → €373,50

Bij toevoegen aan een programma van 8 personen komen deze onderdelen binnen als **"Op aanvraag"** (leeg), in plaats van als de staffelprijs voor 1-25 pers. In de database staat voor de zojuist toegevoegde regels: `admin_price_override = NULL`, `quoted_price = NULL`, `price_type = "total"`.

Er zitten drie bugs achter dit gedrag.

### Bug 1 — kind-blokken worden opgehaald zónder `price_extras`

`fetchRequiredChildrenForBlock` in `src/hooks/useBlockComponents.ts` selecteert de kind-bouwstenen zonder `price_extras`. De staffel-configuratie zit juist daar (`price_extras.tiers`). Zonder deze kolom retourneert `calculateTieredTotal(child, …)` altijd `null` → `quoted_price` blijft leeg.

### Bug 2 — verkeerd aantal personen aan de staffel-lookup

In `src/components/admin/AdminAddActivitySheet.tsx` (regel 287) wordt de staffel opgezocht met `qty` (afgeleid uit `quantity_mode/value` van het onderdeel). Een staffel op **groepsgrootte** hoort op het aantal personen van het programma opgezocht te worden, niet op de component-hoeveelheid. Voor de standaard `quantity_mode = "fixed", value = 1` levert dat toevallig altijd tier 1 op, ongeacht de groepsomvang.

### Bug 3 — de customer-add-optional-component edge function gebruikt niet-bestaande kolommen

`supabase/functions/customer-add-optional-component/index.ts` selecteert `tier_min, tier_max, tier_pricing` (bestaan niet in `building_blocks`) en rekent met `child.tier_pricing`. Deze staffel-tak is dus altijd null. Klanten die zelf een optioneel onderdeel met staffelprijs toevoegen krijgen ook "op aanvraag".

## Aanpak

### 1. Hook: `src/hooks/useBlockComponents.ts`
Voeg `price_extras` toe aan de `child:building_blocks!…(…)`-select in `fetchRequiredChildrenForBlock` (en in de `useBlockComponents`-query, voor consistentie).

### 2. Admin-flow: `src/components/admin/AdminAddActivitySheet.tsx`
In de tiered-tak (ca. regel 286-292):
- Bereken de staffel met `numberOfPeople` (groepsgrootte van het programma), niet met `qty`.
- Zet `override_people = null` (totaalprijs is groep-gebaseerd, `override_people` is alleen zinvol voor per-persoon items).
- Update de begeleidende comment (regel 274).

### 3. Edge function: `supabase/functions/customer-add-optional-component/index.ts`
- Vervang de selectie `tier_min, tier_max, tier_pricing` door `price_extras`.
- Vervang de inline staffel-berekening door een correcte lookup op `price_extras.tiers` (gesorteerd, incl. `tiers_above_max`-gedrag: `"highest"` → hoogste tier, `"on_request"` → `null`), met `people` (groepsgrootte) als input.
- Redeploy de edge function.

### 4. Herstel voor het huidige project
De zojuist toegevoegde regels van Meubilair en BBQ-huur staan al met lege prijs in de DB (Beach Grill Experience, 8 pers). Twee opties:

- **A (aanbevolen):** ik vul de correcte staffelprijzen na (Meubilair € 124,50, BBQ-huur € 70) op de twee bestaande rijen, zodat je niets hoeft te doen.
- **B:** je verwijdert beide regels en voegt Beach Grill Experience opnieuw toe; na de fix worden ze dan meteen goed geboekt.

Zeg welke voorkeur je hebt; anders doe ik A.

### 5. Sanity-check
Na de fix: nieuw testitem toevoegen (Beach Grill Experience op een test-programma van bv. 30 personen) en verifiëren dat Meubilair op € 249 en BBQ-huur op € 140 landt (tier 26-50).

## Wat er níét verandert

- Geen wijziging aan het datamodel of aan `building_block_components`.
- Geen wijziging aan de staffel-configuratie-UI (`BuildingBlockSheet.tsx`) — die schrijft al correct naar `price_extras.tiers`.
- Geen wijziging aan de admin-tak waar een tiered-bouwsteen direct (zonder samenstelling) wordt toegevoegd — die werkte al goed via `handleSelectBlock`.
