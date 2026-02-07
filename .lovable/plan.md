

# Bouwstenen Admin verbeteringen

## 1. Form reset na opslaan

Na het toevoegen van een bouwsteen wordt het formulier niet leeggemaakt. De oorzaak: het formulier reset alleen als de `block` prop verandert, maar bij twee opeenvolgende "nieuwe" acties blijft `block` steeds `null`.

**Oplossing**: Na succesvol opslaan expliciet `form.reset()` aanroepen voordat de sheet sluit. Daarnaast een key-mechanisme toevoegen zodat het form altijd vers is bij een nieuwe sessie.

## 2. Driestaps-status voor bouwstenen

Huidige situatie: alleen `is_published` (ja/nee). Gewenste situatie:

| Status | Betekenis | Online zichtbaar | Bruikbaar in offertes |
|--------|-----------|------------------|----------------------|
| concept | Nog in bewerking | Nee | Nee |
| actief | Klaar, niet publiek | Nee | Ja |
| gepubliceerd | Publiek zichtbaar | Ja | Ja |

**Aanpak**: Een nieuw `status` kolom (`text`) toevoegen aan de `building_blocks` tabel met waarden `concept`, `active`, `published`. De bestaande `is_published` wordt behouden voor backward-compatibiliteit maar de logica wordt gebaseerd op de nieuwe kolom. Bestaande data wordt gemigreerd: `is_published = true` wordt `published`, de rest wordt `active`.

De RLS-policy "Published blocks are publicly readable" wordt aangepast naar `status = 'published'` (in plaats van `is_published = true`).

## 3. Auto-slug op basis van naam

Bij het aanmaken van een nieuwe bouwsteen wordt de ID (slug) automatisch gegenereerd vanuit de naam. Het veld blijft zichtbaar maar wordt automatisch ingevuld. De gebruiker kan het nog handmatig aanpassen.

## Technische details

### Database migratie

```sql
-- Nieuwe status kolom
ALTER TABLE building_blocks ADD COLUMN status text NOT NULL DEFAULT 'concept';

-- Bestaande data migreren
UPDATE building_blocks SET status = 'published' WHERE is_published = true AND is_active = true;
UPDATE building_blocks SET status = 'active' WHERE is_published = false AND is_active = true;
UPDATE building_blocks SET status = 'concept' WHERE is_active = false;

-- RLS policy aanpassen
DROP POLICY "Published blocks are publicly readable" ON building_blocks;
CREATE POLICY "Published blocks are publicly readable" ON building_blocks
  FOR SELECT USING (status = 'published');
```

### Code aanpassingen

**`src/components/admin/BuildingBlockSheet.tsx`**:
- Na succesvol opslaan (create): `form.reset()` aanroepen voor `onOpenChange(false)`
- Naam-veld: `onChange` handler die automatisch slug genereert en in het `id` veld zet (alleen bij aanmaken, niet bij bewerken)
- `is_published` switch vervangen door een `status` dropdown met drie opties
- Slugify-functie: `"Zeehondentocht Vlieland"` wordt `"zeehondentocht-vlieland"`

**`src/pages/admin/AdminBuildingBlocks.tsx`**:
- Status-filter aanpassen voor drie waarden (concept/actief/gepubliceerd)
- Published-switch in tabel vervangen door status-badge
- Status-kolom met gekleurde badges (concept=grijs, actief=blauw, gepubliceerd=groen)

**`src/hooks/useBuildingBlocks.ts`**:
- `usePublishedBuildingBlocks` filter aanpassen naar `status = 'published'` (in plaats van `is_published` + `is_active`)
- `useTogglePublishBlock` vervangen door `useUpdateBlockStatus`

**`src/types/buildingBlock.ts`**:
- `BuildingBlockStatus` type toevoegen: `"concept" | "active" | "published"`
- Status labels map toevoegen

**`src/components/configurator/BuildingBlockCard.tsx`** en andere publieke componenten:
- Geen wijzigingen nodig, deze gebruiken al de `usePublishedBuildingBlocks` hook die de juiste filter krijgt
