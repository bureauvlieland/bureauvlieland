
# Plan: Uitbreiden Building Block Categorieën

## Samenvatting

De huidige categorie "Activiteiten" bevat een mix van sportieve activiteiten, excursies, entertainment en locatieverhuur. Door de categorieën uit te breiden wordt het voor klanten makkelijker om relevante bouwstenen te vinden in de configurator.

## Nieuwe categoriestructuur

| Categorie | Beschrijving | Icoon |
|-----------|--------------|-------|
| **outdoor** | Sportieve buitenactiviteiten | Mountain (berg) |
| **excursies** | Rondleidingen en tours | Map (kaart) |
| **entertainment** | Muziek, DJ, Silent Disco | Music (muzieknoot) |
| **locaties** | Zaalhuur, tenten, techniek | Building (gebouw) |
| **catering** | Eten en drinken (bestaand) | Utensils (bestek) |
| **vervoer** | Transport (bestaand) | Ship (boot) |

## Toewijzing huidige bouwstenen

### Naar `outdoor` (17 items)
Alle Vlieland Outdoor Center activiteiten:
- Blokarten, SUP, Bootcamp, Golfsurfen, Kitesurfen
- Beach Golf, Beachtennis, Disc Golf
- Handboog Schieten, Bijl Werpen, Lasergamen
- Power Vliegeren, Branding Raften, Branding Kanoën
- Outdoor Cooking, Viking Expeditie, Kubb
- Teambuilding, Powerkiten, Surfles, Beach Games

### Naar `excursies` (4 items)
- Vliehors Expres
- Vuurtorenbezoek
- Zeehondentocht
- Fietstocht met begeleiding

### Naar `entertainment` (3 items)
- DJ Timothy
- Live muziek
- Silent Disco Beach

### Naar `locaties` (8 items)
- Zaalhuur De Bolder
- Locatiehuur Lange Paal
- Easy-up tenten
- Stretchtent incl. op- en afbouw
- Techniek & installatie
- Schoonmaak zaal
- Personeelskosten Bureau Vlieland
- Barfaciliteiten & glaswerk (verplaatst van catering)

### Blijft `catering` (11 items)
Alle overige catering items

### Blijft `vervoer` (bestaand)
Geen wijzigingen

## Technische wijzigingen

### 1. Database: ENUM type uitbreiden
```sql
-- Nieuwe categorieën toevoegen aan het ENUM type
ALTER TYPE building_block_category ADD VALUE 'outdoor';
ALTER TYPE building_block_category ADD VALUE 'excursies';
ALTER TYPE building_block_category ADD VALUE 'entertainment';
ALTER TYPE building_block_category ADD VALUE 'locaties';
```

### 2. Database: Bouwstenen migreren
```sql
-- Outdoor activiteiten
UPDATE building_blocks SET category = 'outdoor' 
WHERE id IN ('voc-blokarten', 'voc-sup', 'voc-bootcamp', ...);

-- Excursies
UPDATE building_blocks SET category = 'excursies' 
WHERE id IN ('vliehors-expres', 'vuurtoren', 'zeehondentocht', ...);

-- Entertainment
UPDATE building_blocks SET category = 'entertainment' 
WHERE id IN ('dj-timothy', 'live-muziek', 'silent-disco');

-- Locaties
UPDATE building_blocks SET category = 'locaties' 
WHERE id IN ('zaalhuur-de-bolder', 'locatiehuur-lange-paal', ...);
```

### 3. TypeScript types bijwerken
**Bestand:** `src/types/buildingBlock.ts`
```typescript
export type BuildingBlockCategory = 
  | "outdoor" 
  | "excursies" 
  | "entertainment" 
  | "locaties" 
  | "catering" 
  | "vervoer";

export const categoryLabels: Record<BuildingBlockCategory, string> = {
  outdoor: "Outdoor & Sport",
  excursies: "Excursies",
  entertainment: "Entertainment",
  locaties: "Locaties",
  catering: "Catering",
  vervoer: "Vervoer",
};
```

### 4. CategoryFilter component bijwerken
**Bestand:** `src/components/configurator/CategoryFilter.tsx`
```typescript
const categories = [
  { id: "all", label: "Alles", icon: null },
  { id: "outdoor", label: "Outdoor & Sport", icon: Mountain },
  { id: "excursies", label: "Excursies", icon: Map },
  { id: "entertainment", label: "Entertainment", icon: Music },
  { id: "locaties", label: "Locaties", icon: Building2 },
  { id: "catering", label: "Catering", icon: Utensils },
  { id: "vervoer", label: "Vervoer", icon: Ship },
];
```

### 5. Admin BuildingBlockSheet bijwerken
**Bestand:** `src/components/admin/BuildingBlockSheet.tsx`

Nieuwe categorieën toevoegen aan:
- Zod schema validatie (regel 61)
- Select dropdown opties (regels 421-425)

### 6. Admin BuildingBlocks filter bijwerken
**Bestand:** `src/pages/admin/AdminBuildingBlocks.tsx`

Nieuwe categorieën toevoegen aan het filter dropdown.

### 7. Customer portal AddActivitySheet bijwerken
**Bestand:** `src/components/customer-portal/AddActivitySheet.tsx`

Category filter opties uitbreiden.

### 8. Admin AddActivitySheet bijwerken
**Bestand:** `src/components/admin/AdminAddActivitySheet.tsx`

Category filter opties uitbreiden.

## Risico's en mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Bestaande data in `program_request_items` | Laag | Items slaan `block_category` op als text, geen ENUM |
| ENUM wijziging | Middel | Nieuwe waarden toevoegen is veilig (geen data verlies) |
| Tijdelijke inconsistentie | Laag | Alle wijzigingen in één migratie |

## Volgorde van implementatie

1. Database migratie uitvoeren (ENUM + data updates)
2. TypeScript types bijwerken
3. CategoryFilter component bijwerken
4. Admin formulieren bijwerken
5. Customer portal filters bijwerken
6. Testen in configurator
