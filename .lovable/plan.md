

## Beoordeling mobiele navigatie

### Wat goed werkt
- Dezelfde structuur als desktop (4 items + CTA)
- Accordions voor submenu's
- Deelt `navItems` met MegaDropdown — geen dubbele data

### Problemen

**1. Geen actieve-pagina-indicator**
Desktop heeft nu `text-primary border-b-2 border-primary` voor de actieve route. Mobiel toont geen enkele visuele feedback. Gebruiker weet niet waar hij is.

**2. Inconsistente styling accordion-triggers**
- "Ons aanbod": `font-semibold text-foreground` (altijd opvallend)
- "Over ons": `text-muted-foreground` (subtiel)
- "Logies" en "Inspiratie": ook `text-muted-foreground`

Dit is dezelfde inconsistentie die we net op desktop hebben opgelost.

**3. Menu sluit niet bij scroll of back-navigatie**
Het menu is een inline `<div>` dat open blijft totdat de gebruiker expliciet op X klikt. Bij navigatie via browser-back blijft het menu visueel open.

**4. Geen overlay/backdrop**
Het menu duwt de pagina-inhoud omlaag in plaats van erover te schuiven. Op lange submenu's (10+ links bij "Ons aanbod") scrollt de gebruiker ver naar beneden. Een slide-in sheet of overlay is gebruikelijker op mobiel.

**5. CTA bovenaan is goed, maar telefoonlink krijgt te weinig nadruk**
Op mobiel is bellen de belangrijkste conversieactie. Het telefoonnummer staat klein en subtiel onder de CTA-knop.

### Plan

**1. MobileNav omzetten naar Sheet (slide-in overlay)**
- Gebruik de bestaande `Sheet` component (side="left" of "right")
- Menu schuift over de pagina heen i.p.v. de content te verplaatsen
- Sluit automatisch bij navigatie (al afgedekt door `onClose`)

**2. Actieve-pagina-indicator toevoegen**
- Importeer `useLocation` en hergebruik dezelfde matching-logica als desktop
- Actief item: `text-primary font-medium` (geen border nodig in verticale lijst)

**3. Styling uniformeren**
- Alle top-level items: `text-base font-medium text-foreground`
- Submenu-items: `text-sm text-muted-foreground`
- Verwijder de afwijkende `font-semibold` op "Ons aanbod"

**4. Telefoonlink prominenter maken**
- Toon als gestylede knop met `Phone` icoon, naast of onder de CTA
- `variant="outline"` voor visueel onderscheid

### Bestanden
1. `src/components/navigation/MobileNav.tsx` — sheet, actieve staat, styling
2. `src/components/Navigation.tsx` — Sheet trigger i.p.v. inline toggle

