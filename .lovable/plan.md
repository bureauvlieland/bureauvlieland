

# Tips voor nieuwe gebruikers in de configurator

## Wat wordt er gebouwd
Wanneer een gebruiker in de "Zelf regelen" track start zonder template (leeg programma), tonen we een helpende "Aan de slag" tipskaart in plaats van alleen "Uw programma is nog leeg". Deze tips geven de gebruiker richting over de logische volgorde van samenstellen.

## Wat de gebruiker ziet
In de lege cart-sidebar (desktop) en in de lege cart-drawer (mobiel) verschijnt een visueel aantrekkelijk blok met:

1. **Stappen-suggestie** met iconen:
   - "Begin met de **overtocht** — u moet tenslotte eerst op het eiland komen"
   - "Voeg **fietsen** toe — de handigste manier om over Vlieland te bewegen"
   - "Kies vervolgens uw **activiteiten** en **catering**"

2. **Snelknoppen** om direct naar de juiste categorie te filteren:
   - "Vervoer bekijken" knop (filtert op categorie `vervoer`)
   - "Alle onderdelen bekijken" link

De tips verdwijnen automatisch zodra het eerste item aan de cart wordt toegevoegd.

## Technisch overzicht

| Bestand | Wijziging |
|---|---|
| `src/components/configurator/ConfiguratorCart.tsx` | Lege-staat vervangen door `EmptyCartTips` component met optionele `onCategoryFilter` callback |
| `src/components/configurator/ProgramEditor.tsx` | Zelfde lege-staat aanpassen (voor expanded modus) |
| `src/components/configurator/EmptyCartTips.tsx` | Nieuw component met tips en snelknoppen |
| `src/pages/ProgrammaSamenstellen.tsx` | `onCategoryFilter` prop doorgeven zodat tips-knoppen de categorie kunnen instellen |

### `EmptyCartTips.tsx` (nieuw)
- Compact kaartje met 3 genummerde tips
- Gebruikt `Ship`, `Bike`, `Utensils` iconen uit lucide-react
- Optionele `onFilterCategory` prop: wanneer aanwezig, toon een "Bekijk vervoer" knop die `onFilterCategory("vervoer")` aanroept
- Friendly tone, u-vorm

### Wijzigingen in bestaande bestanden
- `ConfiguratorCart.tsx` (regel 107-116): lege staat vervangt `ShoppingCart` icoon + tekst door `<EmptyCartTips />`
- `ProgramEditor.tsx` (regel 268-276): zelfde vervanging
- `ProgrammaSamenstellen.tsx`: geeft `setSelectedCategory` als callback door aan `ConfiguratorCart` via een nieuwe optionele prop `onCategoryFilter`

## Wat niet verandert
- Het "Zo werkt het" blok bovenaan de pagina
- De wizard flow
- Template-selectie flow
- De configurator wanneer er al items in de cart zitten
