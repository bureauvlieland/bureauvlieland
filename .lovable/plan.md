
# Mediabibliotheek voor Bouwstenen

## Overzicht
Een centrale mediabibliotheek toevoegen aan het admin panel waarmee je:
1. Alle geüploade afbeeldingen kunt bekijken in een visueel overzicht
2. Nieuwe afbeeldingen kunt uploaden naar de bibliotheek
3. Bij het bewerken van een bouwsteen direct een afbeelding uit de bibliotheek kunt kiezen

## Wat wordt er gebouwd?

### 1. Nieuwe admin pagina: `/admin/media`
- Grid-weergave van alle afbeeldingen in de `building-block-images` bucket
- Zoekfunctie op bestandsnaam
- Upload-functionaliteit voor nieuwe afbeeldingen
- Delete optie per afbeelding
- Preview modal bij klikken op afbeelding
- Metadata weergave (bestandsnaam, grootte, datum)

### 2. Mediabibliotheek Picker Component
Een herbruikbaar dialog/modal dat:
- Geïntegreerd wordt in het "Media" tabblad van BuildingBlockSheet
- Alle beschikbare afbeeldingen toont in een grid
- Zoek/filter mogelijkheid biedt
- Direct nieuwe afbeeldingen kan uploaden
- Bij selectie de image_url invult in het formulier

### 3. Nieuwe hook: `useMediaLibrary`
- `useMediaFiles()` - haalt alle bestanden uit de storage bucket
- `useUploadMedia()` - upload nieuwe afbeelding
- `useDeleteMedia()` - verwijder afbeelding

## Gebruikerservaring

**Bij het bewerken van een bouwsteen:**
1. Ga naar het "Media" tabblad
2. Klik op "Kies uit bibliotheek"
3. Dialog opent met alle beschikbare afbeeldingen
4. Zoek of scroll naar de juiste afbeelding
5. Klik om te selecteren → image_url wordt automatisch ingevuld

**Mediabibliotheek beheren:**
1. Admin → Media in het navigatiemenu
2. Bekijk alle geüploade afbeeldingen
3. Upload nieuwe afbeeldingen via drag-and-drop of bestandskeuze
4. Verwijder ongebruikte afbeeldingen

## Navigatie
Nieuwe menu-item "Media" toevoegen aan AdminLayout sidebar (tussen "Bouwstenen" en "Partners")

---

## Technische details

### Nieuwe bestanden
```
src/pages/admin/AdminMedia.tsx          # Volledige mediabibliotheek pagina
src/components/admin/MediaLibrary.tsx   # Grid component voor afbeeldingen
src/components/admin/MediaPickerDialog.tsx  # Picker dialog voor BuildingBlockSheet
src/hooks/useMediaLibrary.ts            # React Query hooks voor storage operaties
```

### Aanpassingen bestaande bestanden
- `src/App.tsx` - Route toevoegen voor /admin/media
- `src/components/admin/AdminLayout.tsx` - Menu-item toevoegen
- `src/components/admin/BuildingBlockSheet.tsx` - MediaPickerDialog integreren

### Storage API gebruik
```typescript
// Bestanden ophalen
const { data } = await supabase.storage.from("building-block-images").list();

// Bestand uploaden (met unieke naam)
const filePath = `${Date.now()}-${fileName}`;
await supabase.storage.from("building-block-images").upload(filePath, file);

// Public URL ophalen
const { data: { publicUrl } } = supabase.storage
  .from("building-block-images")
  .getPublicUrl(filePath);

// Bestand verwijderen
await supabase.storage.from("building-block-images").remove([filePath]);
```

### Component structuur MediaPickerDialog
- Dialog met grid van afbeeldingen
- Zoekbalk bovenaan
- Upload zone (drag-and-drop)
- Selectie highlight
- "Selecteer" en "Annuleren" buttons
