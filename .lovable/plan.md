
# Plan: Nieuwe categorieën toevoegen aan bouwstenen

## Probleem
De database bevat al de categorieën `services`, `overig` en `activiteiten`, maar de TypeScript-code kent alleen `outdoor`, `excursies`, `entertainment`, `locaties`, `catering` en `vervoer`. Hierdoor zijn de nieuwe categorieën niet selecteerbaar bij het aanmaken/bewerken van bouwstenen en niet zichtbaar in filters.

## Aanpak

De volgende bestanden moeten worden bijgewerkt om de drie ontbrekende categorieën (`services`, `overig`, `activiteiten`) toe te voegen:

### 1. Type-definitie: `src/types/buildingBlock.ts`
- `BuildingBlockCategory` type uitbreiden met `"services" | "overig" | "activiteiten"`
- `categoryLabels` object uitbreiden met labels:
  - `services`: "Services"
  - `overig`: "Overig"
  - `activiteiten`: "Activiteiten"

### 2. Configurator categorie-filter: `src/components/configurator/CategoryFilter.tsx`
- Drie nieuwe knoppen toevoegen met passende iconen (bijv. `Wrench` voor Services, `Package` voor Overig, `Users` voor Activiteiten)

### 3. Admin bouwstenen beheer: `src/pages/admin/AdminBuildingBlocks.tsx`
- Drie nieuwe `SelectItem`s toevoegen in het categorie-filterdropdown

### 4. Admin bouwsteen formulier: `src/components/admin/BuildingBlockSheet.tsx`
- Zod schema `category` enum uitbreiden met de drie waarden
- Drie nieuwe `SelectItem`s toevoegen in het categorie-dropdown

### 5. Admin activiteit toevoegen: `src/components/admin/AdminAddActivitySheet.tsx`
- Geen directe wijziging nodig (gebruikt dynamisch `categoryLabels` uit het type-bestand), maar controleren of de categorie-filterknoppen hier ook hardcoded zijn

### 6. Admin template item dialog: `src/components/admin/AddTemplateItemDialog.tsx`
- Gebruikt `categoryLabels` dynamisch, geen wijziging nodig

### 7. Klantportaal activiteit toevoegen: `src/components/customer-portal/AddActivitySheet.tsx`
- Controleren of categorie-filter hardcoded is

### 8. Partner bouwsteen formulier: `src/components/partner-portal/PartnerBlockSheet.tsx`
- `BlockCategory` type en `CATEGORY_OPTIONS` array uitbreiden met de drie nieuwe categorieën

### 9. Factuur preview: `src/pages/admin/AdminInvoicePreview.tsx`
- Gebruikt `categoryLabels` dynamisch, geen wijziging nodig zolang het type-bestand is bijgewerkt

## Samenvatting wijzigingen per bestand

| Bestand | Wijziging |
|---|---|
| `src/types/buildingBlock.ts` | Type + labels uitbreiden |
| `src/components/configurator/CategoryFilter.tsx` | 3 knoppen toevoegen |
| `src/pages/admin/AdminBuildingBlocks.tsx` | 3 filter-opties toevoegen |
| `src/components/admin/BuildingBlockSheet.tsx` | Zod enum + 3 select-opties |
| `src/components/partner-portal/PartnerBlockSheet.tsx` | Type + opties uitbreiden |
| Overige bestanden die `categoryLabels` gebruiken | Geen wijziging nodig (dynamisch) |
