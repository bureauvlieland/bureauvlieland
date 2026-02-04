
# Plan: Partner Building Block Sheet Uitbreiden

## Samenvatting
De Partner "Mijn Aanbod" sheet moet worden uitgebreid zodat partners alle relevante velden kunnen invullen die ook in de admin-omgeving beschikbaar zijn. **Kritiek probleem**: de huidige categorieën in de partner sheet (`activiteiten`, `catering`, `vervoer`) bestaan niet in de database ENUM en veroorzaken fouten bij opslaan.

## Overzicht wijzigingen

```text
┌─────────────────────────────────────────────────────────────┐
│                   Partner Block Sheet                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tab: Algemeen                                        │   │
│  │  ├─ Naam                           (bestaand)         │   │
│  │  ├─ Korte beschrijving             (bestaand)         │   │
│  │  ├─ Volledige beschrijving         (bestaand)         │   │
│  │  ├─ Categorie (FIXED!)             (6 opties)         │   │
│  │  ├─ Duur                           (bestaand)         │   │
│  │  ├─ Min/Max personen               (bestaand)         │   │
│  │  ├─ Seizoensnotities               (NIEUW)            │   │
│  │  └─ Tags                           (NIEUW)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tab: Prijzen                                         │   │
│  │  ├─ Prijstype                      (bestaand)         │   │
│  │  ├─ Vanaf-prijs toggle             (NIEUW)            │   │
│  │  ├─ BTW inclusief toggle           (NIEUW)            │   │
│  │  ├─ BTW tarief                     (NIEUW)            │   │
│  │  ├─ Volwassenen: prijs + notitie   (uitgebreid)       │   │
│  │  ├─ Kinderen: prijs + notitie + leeftijd (NIEUW)      │   │
│  │  └─ Huisdieren: prijs + notitie    (NIEUW)            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tab: Media                                           │   │
│  │  └─ Afbeelding upload              (bestaand)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Kritieke Fix: Categorieën

**Huidige foutieve waarden:**
- `activiteiten` → bestaat niet in database
- `catering` → OK
- `vervoer` → OK

**Correcte database ENUM waarden:**
- `outdoor` - "Outdoor & Sport"
- `excursies` - "Excursies"
- `entertainment` - "Entertainment"
- `locaties` - "Locaties"
- `catering` - "Catering"
- `vervoer` - "Vervoer"

## Wijzigingen per bestand

### 1. `src/components/partner-portal/PartnerBlockSheet.tsx`

**Grote herstructurering nodig:**

1. **Type definitie herstellen** (regel 125):
   ```typescript
   // VAN
   category: "activiteiten" as "activiteiten" | "catering" | "vervoer"
   
   // NAAR
   category: "outdoor" as "outdoor" | "excursies" | "entertainment" | "locaties" | "catering" | "vervoer"
   ```

2. **Formulier uitbreiden met ontbrekende velden**:
   - `price_adult_note` (prijsnotitie volwassenen)
   - `price_child`, `price_child_note`, `price_child_min_age`, `price_child_max_age`
   - `price_pet`, `price_pet_note`
   - `is_from_price` (boolean toggle)
   - `price_includes_vat`, `vat_rate`
   - `seasonal_notes`
   - `tags` (als comma-separated string)

3. **Tab-structuur toevoegen** (zoals admin sheet):
   - Tab "Algemeen": naam, beschrijving, categorie, duur, personen, seizoen, tags
   - Tab "Prijzen": prijstype, BTW, volwassenen, kinderen, huisdieren
   - Tab "Media": afbeelding upload

4. **Category selector vervangen** (regel 476-495):
   ```typescript
   <SelectContent>
     <SelectItem value="outdoor">Outdoor & Sport</SelectItem>
     <SelectItem value="excursies">Excursies</SelectItem>
     <SelectItem value="entertainment">Entertainment</SelectItem>
     <SelectItem value="locaties">Locaties</SelectItem>
     <SelectItem value="catering">Catering</SelectItem>
     <SelectItem value="vervoer">Vervoer</SelectItem>
   </SelectContent>
   ```

5. **Categorie ook bewerkbaar maken voor bestaande blocks**:
   - Verwijder de `{isNew && ...}` conditie rond de categorie selector
   - Partners moeten ook na aanmaak de categorie kunnen wijzigen

6. **Database insert/update uitbreiden** (regel 273-340):
   - Alle nieuwe velden meenemen in zowel insert als update operaties

### 2. `src/types/partner.ts` 

**PartnerBuildingBlock interface uitbreiden** (regel 95-111):
```typescript
export interface PartnerBuildingBlock {
  // ... bestaande velden ...
  
  // Nieuwe velden toevoegen:
  price_adult_note: string | null;
  price_child: number | null;
  price_child_note: string | null;
  price_child_min_age: number | null;
  price_child_max_age: number | null;
  price_pet: number | null;
  price_pet_note: string | null;
  is_from_price: boolean;
  price_includes_vat: boolean | null;
  vat_rate: number | null;
  seasonal_notes: string | null;
  tags: string[] | null;
}
```

### 3. `src/pages/PartnerBlocks.tsx`

**Select query uitbreiden** (regel 62-63):
```typescript
.select(`
  id, name, description, short_description, category, block_type, 
  duration, price_adult, price_adult_note, price_type, 
  price_child, price_child_note, price_child_min_age, price_child_max_age,
  price_pet, price_pet_note, 
  min_people, max_people, is_published, is_active, 
  image_url, image_asset, is_from_price, price_includes_vat, vat_rate,
  seasonal_notes, tags
`)
```

## Niet wijzigen

- **`is_published`**: Blijft alleen door admin te wijzigen (partners dienen voorstellen in)
- **`block_type`**: Blijft hardcoded op `partner` (correct voor partner-aangemaakt aanbod)
- **Media bibliotheek**: Niet nodig voor partners, eigen uploads zijn voldoende

## Samenvatting resultaat

Na implementatie kunnen partners:
- Correct categoriseren met de 6 database ENUM waarden
- Kinderprijzen instellen met leeftijdsgrenzen
- Huisdierprijzen instellen
- BTW-instellingen beheren
- Seizoensinformatie en tags toevoegen
- Hun aanbod volledig professioneel beheren

Bureau Vlieland behoudt controle over publicatie (goedkeuring workflow).
