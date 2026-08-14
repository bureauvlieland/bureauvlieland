Direct boeken zichtbaarder in het hoofdmenu

## Aanleiding
De route "/activiteiten-boeken" staat nu alleen prominent op de homepagina (RoutePicker) en als klein chip-label "Losse activiteiten" onder "Populair op Vlieland" in het navigatie-dropdown. Dat is te verstopt voor een belangrijke conversieroute.

## Voorgestelde oplossing
Maak "Losse activiteiten direct boeken" een volwaardig onderdeel van het hoofdmenu, zonder de balk te overladen met een extra top-level knop.

1. **Eigen kaart in "Wat we organiseren"**
   - Voeg in `src/components/navigation/MegaDropdown.tsx` een nieuw item toe aan `watWeOrganiserenItems`:
     - label: "Direct boeken"
     - href: "/activiteiten-boeken"
     - description: "Bekijk vertrektijden en boek losse activiteiten direct online"
     - icon: `Zap` (past bij de snelle, directe route)
   - Hernoem de bestaande chip "Losse activiteiten" in `populairItems` naar "Direct boeken" zodat beide plekken dezelfde taal gebruiken.

2. **Actieve menu-status**
   - Voeg `/activiteiten-boeken` toe aan de `watWeOrganiserenHrefs`-array in `src/components/Navigation.tsx`, zodat "Wat we organiseren" visueel actief wordt op de boekpagina.

3. **Mobiel menu**
   - `MobileNav.tsx` haalt `watWeOrganiserenItems` en `populairItems` al op uit `navItems`; geen aparte wijziging nodig.

## Technisch
- Alleen front-end wijzigingen in `MegaDropdown.tsx` en `Navigation.tsx`.
- Geen backend-, auth- of RLS-wijzigingen.
- Controleer na afloop dat de desktop dropdown, het mobiele menu en de active-state op `/activiteiten-boeken` correct werken.
