

# Plan: Prijsconfiguratie vereenvoudigen

## Overzicht
De prijstype-opties worden teruggebracht van 5 naar 3: **Per persoon**, **Totaalprijs** en **Op aanvraag**. De opties `per_hour` en `per_day` vervallen. Bij keuze "Totaalprijs" of "Op aanvraag" worden de secties Kinderen en Huisdieren verborgen.

## Bestaande data (uit eerdere analyse)
- 24 bouwstenen: `per_person`
- 34 bouwstenen: `total`
- 1 bouwsteen: `per_hour`
- 3 bouwstenen: `per_day`
- 22 bouwstenen: `on_request`

De 4 items met `per_hour`/`per_day` worden gemigreerd naar `total`.

## Wijzigingen

### 1. Database migratie
- Update alle `per_hour` en `per_day` bouwstenen naar `total`
- Verwijder de enum-waarden `per_hour` en `per_day` uit `building_block_price_type`

### 2. TypeScript types (`src/types/buildingBlock.ts`)
- `BuildingBlockPriceType` beperken tot `"per_person" | "total" | "on_request"`
- `priceTypeLabels` opschonen (per_hour en per_day verwijderen)
- `formatPriceNote`: cases voor per_hour en per_day verwijderen
- `calculateIndicativeTotal`: per_hour en per_day cases verwijderen (vallen al onder default/total)

### 3. Admin BuildingBlockSheet (`src/components/admin/BuildingBlockSheet.tsx`)
- Prijstype select: alleen "Per persoon", "Totaalprijs" en "Op aanvraag" tonen
- Zod schema aanpassen naar `z.enum(["per_person", "total", "on_request"])`
- Bij `per_person`: alle prijsvelden tonen (Volwassenen, Kinderen, Huisdieren)
- Bij `total`: header wijzigen naar "Prijs", alleen een enkel prijsveld, Kinderen/Huisdieren verbergen
- Bij `on_request`: prijsvelden volledig verbergen (er is geen prijs in te vullen)

### 4. Partner PartnerBlockSheet (`src/components/partner-portal/PartnerBlockSheet.tsx`)
- Zelfde logica als admin: prijstype select beperken tot 3 opties
- Conditionele weergave van prijsvelden op basis van gekozen type

### 5. Display-functies opruimen
- `PartnerBlocks.tsx` (`formatPrice`): per_hour/per_day cases verwijderen
- `formatBlockPrice` en `formatPriceNote` in buildingBlock.ts: per_hour/per_day verwijderen

### Geen wijzigingen nodig
- Offerte-preview en factuur-preview gebruiken `admin_price_override`, niet het prijstype van de bouwsteen

