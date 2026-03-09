

## Fix: Intro-card toont lege tips bij 12 activiteiten + "Toevoegen" knop altijd beschikbaar

### Probleem 1: "Aan de slag" tips zichtbaar bij 12 activiteiten
`ProgramIntroCard` ontvangt geen `itemCount` prop vanuit Desktop- en MobileProgramView. Daardoor is `itemCount` undefined, en toont het altijd de "EmptyCartTips" in plaats van de tekst voor bestaande programma's.

### Probleem 2: "Toevoegen" knop verborgen voor maatwerk-projecten
De conditie `!program.program_type?.startsWith("maatwerk_")` verbergt de knop voor maatwerk-programma's. De gebruiker wil dat klanten altijd activiteiten kunnen toevoegen/wijzigen/verwijderen (met bevestigingsdialog bij opslaan).

### Wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/components/customer-portal/DesktopProgramView.tsx` | Pass `itemCount={program.items.filter(i => i.status !== "cancelled").length}` aan ProgramIntroCard. Verwijder maatwerk-check op "Toevoegen" knop (alleen `!termsAccepted` behouden). |
| `src/components/customer-portal/MobileProgramView.tsx` | Idem: `itemCount` doorgeven + maatwerk-check verwijderen op "Toevoegen" knop. |

### Resultaat
- Intro-card toont correcte tekst ("Wij hebben de aanvragen verstuurd...") bij bestaande activiteiten
- "Toevoegen" knop is altijd zichtbaar zolang voorwaarden niet geaccepteerd zijn
- Bestaande wijzigings-flow (floating bar → ChangeConfirmationDialog → edge function → notificatie) blijft ongewijzigd

