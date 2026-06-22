## Doel
Op de **Programma**-tab (klantportaal):
1. **Programma-lijst** bovenaan, **"Programmavoorstel met indicatieve prijzen"** (ProgramIntroCard) eronder.
2. **Groep & wensen** (GuestDetailsCard) hier weghalen — blijft alleen onder de **Praktisch**-tab.

## Wijzigingen
- **`src/components/customer-portal/DesktopProgramView.tsx`**
  - Verwijder `<GuestDetailsCard ... />` (regel ~322–331).
  - Verplaats `<ProgramIntroCard ... />` (regel ~308) naar ná het Programma-blok (regel ~362–536).
- **`src/components/customer-portal/MobileProgramView.tsx`**
  - Verwijder `<GuestDetailsCard ... />` (regel ~362–371).
  - Verplaats `<ProgramIntroCard ... />` (regel ~348) naar ná het Programma-blok.

## Niet aangepast
- `PracticalView.tsx` houdt `GuestDetailsCard` ongewijzigd.
- `ProgramStepper` / "Gegevens & voorwaarden"-checklist blijft zoals 'ie is (keuze b).