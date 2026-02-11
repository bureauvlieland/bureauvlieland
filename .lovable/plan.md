

# Plan: Lijstweergave voor bouwstenen op de configurator-pagina

## Overzicht
Een toggle toevoegen waarmee bezoekers kunnen schakelen tussen de huidige **grid-weergave** (kaarten met afbeelding) en een compacte **lijstweergave** (horizontale rijen zonder grote afbeelding).

## Wijzigingen

### 1. Nieuw component: `BuildingBlockListItem.tsx`
Compacte horizontale rij per bouwsteen:
- Kleine thumbnail (60x60px) links
- Naam, korte beschrijving, duur, capaciteit in het midden
- Prijs + "Toevoegen" knop rechts
- Categorie- en "Zelf te regelen"-badge compact weergeven

### 2. Nieuw component: `ViewToggle.tsx`
Twee knoppen (grid/list iconen) naast de categorie-filter. Geselecteerde weergave wordt opgeslagen in `localStorage` zodat de keuze behouden blijft.

### 3. Aanpassing: `ProgrammaSamenstellen.tsx`
- State `viewMode: "grid" | "list"` toevoegen
- `ViewToggle` plaatsen naast de "Kies uw onderdelen" heading
- Conditioneel renderen: grid met `BuildingBlockCard` of lijst met `BuildingBlockListItem`

## Technische details

| Bestand | Actie |
|---|---|
| `src/components/configurator/BuildingBlockListItem.tsx` | Nieuw -- compacte lijstrij |
| `src/components/configurator/ViewToggle.tsx` | Nieuw -- grid/list toggle |
| `src/pages/ProgrammaSamenstellen.tsx` | Wijzigen -- viewMode state + conditionele rendering |

### Geen database-wijzigingen nodig
Puur front-end aanpassing.

