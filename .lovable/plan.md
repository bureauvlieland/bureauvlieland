
# Offerte PDF visueel verbeteren

## Wat verandert

### 1. Afbeeldingen bij programma-onderdelen
Elke activiteit in de PDF-preview krijgt een kleine thumbnail (40x40px) naast de naam. De afbeeldingen worden opgehaald uit de `building_blocks` tabel (veld `image_url` of `image_asset`). Bijna alle bouwstenen in dit project hebben al een afbeelding.

### 2. Sortering op tijd
De items per dag worden gesorteerd op `preferred_time`, zodat het programma chronologisch loopt. Items zonder tijd komen onderaan.

## Technische details

**Bestand:** `src/pages/admin/AdminQuotePreview.tsx`

### Aanpassingen:

1. **Extra data ophalen** - Bij het fetchen van items ook `image_url` en `image_asset` meenemen uit de `building_blocks` tabel (die join gebeurt al deels voor VAT, wordt uitgebreid).

2. **ProgramItem interface uitbreiden** met `image_url?: string | null`.

3. **Sortering toevoegen** - Na het groeperen per dag, de items sorteren:
```typescript
dayItems.sort((a, b) => {
  if (!a.preferred_time && !b.preferred_time) return 0;
  if (!a.preferred_time) return 1;
  if (!b.preferred_time) return -1;
  return a.preferred_time.localeCompare(b.preferred_time);
});
```

4. **Thumbnail in PDF-tabel** - De activiteitrij krijgt een afbeelding-kolom:
```
[40x40 afbeelding] | Tijd | Activiteit + beschrijving | Prijs
```
De afbeelding wordt weergegeven als een `img` tag met `object-cover` en afgeronde hoeken, binnen de bestaande tabel-rij.

5. **Fallback** - Als er geen afbeelding beschikbaar is, wordt een gekleurde cirkel met de eerste letter van de activiteit getoond (vergelijkbaar met een avatar).

### Impact
- Alleen de offerte-preview/PDF wordt aangepast
- Geen effect op het klantportaal of andere views
- De html2canvas rendering pakt de afbeeldingen automatisch mee in de PDF
