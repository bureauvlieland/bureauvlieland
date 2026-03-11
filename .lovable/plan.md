

# Multi-step checkout op eigen pagina

## Wat verandert

De huidige side-sheet (`ReviewAndSubmitSheet`) wordt vervangen door een volledige checkout-flow op een eigen pagina (`/programma-samenstellen/checkout`). Bovenin de pagina staat een stappenbalk die zichtbaar is tijdens het hele configuratieproces (builder + checkout).

## Stappen

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ① Basisgegevens    ② Programma    ③ Gegevens    ④ Versturen
      (done)           (active)       (todo)        (todo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- **Stap 1 — Basisgegevens**: Bestaande `BasicsForm` (groepsgrootte + datums). Al afgerond wanneer je in de builder zit.
- **Stap 2 — Programma**: Bestaande `ProgramBuilderView`. "Verder" knop gaat naar stap 3.
- **Stap 3 — Gegevens**: Contactformulier (naam, email, telefoon, bedrijf, opmerkingen). Geen "type uitje" meer. Plus het "Zo werkt het" blok dat uitlegt wat er na versturen gebeurt.
- **Stap 4 — Bevestiging**: Succesbericht met countdown + redirect naar klantportaal.

## Wat verdwijnt
- `ReviewAndSubmitSheet` component (side-sheet)
- Programma-overzicht in de checkout (dubbel met de builder)
- "Type uitje" selector
- `ProgramEditorSheet` (de uitklap-sheet, niet meer nodig)

## Technisch

### Nieuw component: `CheckoutStepIndicator`
Compact horizontale stappenbalk. Props: `currentStep`, `steps[]`. Getoond bovenaan de pagina-content op alle stappen.

### Nieuw component: `CheckoutContactForm`  
Contactformulier (naam, email, telefoon, bedrijf, opmerkingen) + "Zo werkt het" blok + submit knop. Bevat de submit-logica die nu in `ReviewAndSubmitSheet` zit.

### Nieuw component: `CheckoutSuccess`
Succesbericht met countdown, redirect, en self-arranged blokken info.

### `ProgrammaSamenstellen.tsx` aanpassen
- `phase` wordt uitgebreid: `"basics" | "program" | "contact" | "success"`
- Stappenbalk bovenaan (na hero of in plaats van hero voor latere stappen)
- "Verder" knop in builder navigeert naar `"contact"` phase
- Submit in contact form navigeert naar `"success"` phase
- Geen sheet meer nodig

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/components/configurator/CheckoutStepIndicator.tsx` | Nieuw — stappenbalk |
| `src/components/configurator/CheckoutContactForm.tsx` | Nieuw — formulier + how-it-works |
| `src/components/configurator/CheckoutSuccess.tsx` | Nieuw — bevestigingspagina |
| `src/pages/ProgrammaSamenstellen.tsx` | Aanpassen — multi-step flow, sheet verwijderen |
| `src/components/configurator/ReviewAndSubmitSheet.tsx` | Verwijderen |

