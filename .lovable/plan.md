

# AI-suggestie (Erwin) integreren als knop in ProgramBuilderView

## Aanpak

In plaats van een apart scherm wordt Erwin een **dialog/sheet** die je opent vanuit de ProgramBuilderView. De klant heeft al basisgegevens ingevuld (eventType, aantal personen, datums), dus die hoeven niet opnieuw gevraagd te worden. Erwin vraagt alleen nog **vibe** en **wensen**, genereert een voorstel, en vult de cart.

### Wijzigingen

**1. Nieuw component: `AiErwinDialog.tsx`**

Een compacte dialog (Sheet) met alleen:
- Vibe-keuze (actief / ontspannen / mix) 
- Optioneel wensen-veld
- "Stel programma samen" knop

Gebruikt de bestaande `generate-program-suggestion` edge function. Bij succes: roept een callback aan die de huidige cart vervangt met de suggesties.

Props: `open`, `onOpenChange`, `numberOfPeople`, `selectedDates`, `eventType`, `onSuggestionReady(items: CartItemDetail[])`

**2. Wijzig: `ProgramBuilderView.tsx`**

- Voeg een opvallende knop toe in de header naast "Wijzig gegevens":
  ```
  ✨ Laat Erwin een voorstel doen
  ```
- State voor `isErwinOpen`
- Render `AiErwinDialog` met de juiste props
- `onSuggestionReady` callback: vervangt alle niet-ferry items via `onReplaceItems` (nieuwe prop) of roept `onRemoveItem` + `onAddItem` aan

**3. Wijzig: `ProgrammaSamenstellen.tsx`**

- Voeg een `handleErwinSuggestion` callback toe die:
  - Cart leegt (behalve ferry-blokken)
  - De gesuggereerde items toevoegt met de juiste dayIndex
  - Toast toont

### Bestanden

| Actie | Bestand |
|---|---|
| Nieuw | `src/components/configurator/AiErwinDialog.tsx` |
| Wijzig | `src/components/configurator/ProgramBuilderView.tsx` — knop + dialog |
| Wijzig | `src/pages/ProgrammaSamenstellen.tsx` — replace-items handler |

