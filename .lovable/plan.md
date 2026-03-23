

## Plan: Hoofdnavigatie verbeteren

### Wijzigingen

**1. Navigation.tsx — hover-open + actieve-pagina-indicator + consistente styling**
- MegaDropdown opent op `onMouseEnter` en sluit op `onMouseLeave` (met kleine delay om per ongeluk sluiten te voorkomen)
- Verwijder de `onClick` toggle — hover is primair, click blijft als fallback voor accessibility
- Voeg `useLocation()` toe om de actieve route te detecteren
- Alle nav-items krijgen dezelfde base styling (`text-sm text-muted-foreground`) — "Ons aanbod" verliest de afwijkende `font-semibold text-foreground`
- Actieve items krijgen `text-primary font-medium` + een 2px bottom-border indicator
- "Ons aanbod" is actief als de huidige route matcht met een van de MegaDropdown hrefs
- Dropdown-positionering: `left-0` → `left-1/2 -translate-x-1/2` zodat het gecentreerd onder de trigger staat en niet buiten het scherm valt

**2. MegaDropdown.tsx — verwijder "Diensten" link**
- Verwijder `{ label: "Diensten", href: "/diensten" }` uit `extraItems` — de pagina is overbodig en de link is circulair
- Alleen "Catering" en "Evenementen" blijven in de bottom row

**3. MobileNav.tsx — verwijder "Diensten" uit de mobiele navigatie**
- Dezelfde `extraItems` array wordt gebruikt, dus de wijziging werkt automatisch door. Geen aparte aanpassing nodig.

### Bestanden
1. `src/components/Navigation.tsx`
2. `src/components/navigation/MegaDropdown.tsx`

