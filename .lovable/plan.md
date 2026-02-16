
# Omschrijvingen bouwstenen tonen in klantportaal en offerte

## Wat verandert er?
Momenteel zien klanten alleen de naam van een activiteit en de aanbieder. De korte en lange beschrijvingen (bijv. "Exclusieve zeehondentocht per boot" of de uitgebreide uitleg over een Italiaanse shared dining) worden niet getoond. Na deze wijziging:

- **Korte beschrijving** verschijnt direct onder de aanbieder in elk programma-item
- **Lange beschrijving** verschijnt bij het openklikken van een item
- **Offerte (AdminQuotePreview)** toont de korte beschrijving onder elke activiteit
- **Programma-PDF download** werkt al met beschrijvingen (maar ontvangt nu ook de juiste data)

## Technische aanpak

### 1. Edge function verrijken met beschrijvingen
**Bestand:** `supabase/functions/get-customer-program/index.ts`

De huidige query haalt items op met `select("*")` uit `program_request_items`. Omdat `short_description` en `description` niet op die tabel staan, moeten we ze ophalen uit `building_blocks`.

Na het ophalen van items, een extra query doen op `building_blocks` voor alle `block_id`'s, en de beschrijvingen toevoegen aan elk item:

```
block_short_description: block.short_description
block_description: block.description
```

### 2. Klantportaal: beschrijvingen tonen
**Bestand:** `src/components/customer-portal/CustomerProgramItem.tsx`

- Onder de aanbieder (regel 129-131): `short_description` tonen als subtiele tekst
- In de `CollapsibleContent` (regel 384): de volledige `description` tonen boven de bestaande content

### 3. Offerte-preview: beschrijvingen tonen
**Bestand:** `src/pages/admin/AdminQuotePreview.tsx`

- De building blocks query (regel 171-173) uitbreiden met `short_description` en `description`
- De ProgramItem interface uitbreiden met `block_short_description` en `block_description`
- Items verrijken met beschrijvingen (regel 177-187)
- In de offerte-tabel (regel 731-740) de korte beschrijving tonen onder de activiteitnaam

### 4. Programma-PDF: data aansluiten
**Bestand:** `src/components/customer-portal/ProgramPdfDownload.tsx`

Dit bestand gebruikt al `(item as any).block_description` (regel 157). Zodra de edge function de data meelevert, werkt dit automatisch.

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/get-customer-program/index.ts` | Beschrijvingen ophalen uit building_blocks en toevoegen aan items |
| `src/components/customer-portal/CustomerProgramItem.tsx` | Short description onder aanbieder, description in uitgeklapt blok |
| `src/pages/admin/AdminQuotePreview.tsx` | Short description ophalen en tonen in offerte-tabel |
| `src/components/customer-portal/ProgramPdfDownload.tsx` | Geen wijziging nodig (pakt `block_description` al op) |
