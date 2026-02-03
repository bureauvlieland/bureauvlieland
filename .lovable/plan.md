

# Alle Website-afbeeldingen in de Mediabibliotheek

## Huidige situatie
De mediabibliotheek toont alleen afbeeldingen uit de `building-block-images` storage bucket. Maar er zijn ook 63 afbeeldingen in de `src/assets/` folder die overal op de website worden gebruikt (hero images, team foto's, activiteiten, etc.).

## Oplossing
De mediabibliotheek uitbreiden met twee secties/tabs:
1. **Geüploade afbeeldingen** - Uit de storage bucket (huidige functionaliteit)
2. **Website assets** - De statische afbeeldingen uit `src/assets/`

## Wat wordt aangepast

### 1. Hook uitbreiden: `useMediaLibrary.ts`
- Nieuwe functie `useAssetFiles()` toevoegen die alle bestanden uit `src/assets/` ophaalt
- Een mapping maken van alle asset bestandsnamen naar hun import paths

### 2. Assets index bestand maken
Omdat Vite statische imports vereist, maken we een index bestand dat alle assets exporteert:

```
src/assets/index.ts
```

Dit bestand exporteert alle afbeeldingen met hun URLs zodat ze dynamisch kunnen worden geladen.

### 3. MediaLibrary component aanpassen
- Tabs toevoegen: "Uploads" en "Website Assets"
- Website assets tab toont de 63 afbeeldingen uit src/assets
- Assets zijn alleen selecteerbaar (niet te verwijderen, want ze zitten in de code)
- Zoekfunctie werkt over beide bronnen

### 4. MediaPickerDialog aanpassen
- Dezelfde tabs toevoegen
- Bij selectie van een asset wordt de juiste import path of URL gebruikt

## Gebruikerservaring

**In de mediabibliotheek:**
- Standaard tab "Uploads" toont geüploade afbeeldingen
- Tab "Website Assets" toont alle 63 bestaande afbeeldingen
- Beide tabs hebben zoekfunctie
- Assets kunnen niet verwijderd worden (grijs icoontje)

**Bij kiezen voor bouwsteen:**
- Beide bronnen beschikbaar
- Duidelijk onderscheid tussen uploads en assets

## Categorieën voor assets (bonus)
De assets kunnen ook gecategoriseerd worden op basis van hun naam:
- **Activiteiten**: beach-*, cycling-*, surf-*, etc.
- **Catering**: catering-*, food-*, lunch-*
- **Locaties**: vlieland-*, lighthouse-*, dunes-*
- **Events**: event-*, wedding-*, team-*
- **Profielen**: *-profile.*
- **Logo's**: logo*

---

## Technische details

### Nieuw bestand: `src/assets/index.ts`
```typescript
// Auto-generated asset index
import amuseTour from "./amuse-tour.jpg";
import beachActivity from "./beach-activity.jpg";
// ... alle 63 assets

export const assetFiles = [
  { name: "amuse-tour.jpg", url: amuseTour, category: "activiteiten" },
  { name: "beach-activity.jpg", url: beachActivity, category: "activiteiten" },
  // ... etc
];
```

### Aanpassingen `useMediaLibrary.ts`
```typescript
export interface AssetFile {
  name: string;
  url: string;
  category: string;
}

export function useAssetFiles(): AssetFile[] {
  // Import from assets/index.ts
  return assetFiles;
}
```

### Aanpassingen `MediaLibrary.tsx`
```typescript
// Tabs state
const [activeTab, setActiveTab] = useState<"uploads" | "assets">("uploads");

// Render tabs boven de grid
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="uploads">Uploads ({files?.length || 0})</TabsTrigger>
    <TabsTrigger value="assets">Website Assets (63)</TabsTrigger>
  </TabsList>
</Tabs>
```

### Te wijzigen bestanden
- `src/assets/index.ts` (nieuw) - Export alle assets
- `src/hooks/useMediaLibrary.ts` - Voeg useAssetFiles toe
- `src/components/admin/MediaLibrary.tsx` - Voeg tabs en assets weergave toe
- `src/components/admin/MediaPickerDialog.tsx` - Voeg tabs toe voor selectie

