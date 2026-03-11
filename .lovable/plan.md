

# "Wijzig gegevens" vervangen door inline bewerking

## Wat verandert er

De "Wijzig gegevens"-knop verdwijnt. In plaats daarvan komen er kleine **edit-icoontjes** naast "20 personen" en de datumweergave in de header. Bij klikken opent een compact **Popover** (geen modal, geen navigatie) waarin je direct de waarde aanpast.

## Wijzigingen

### `ProgramBuilderView.tsx`

- Verwijder de "Wijzig gegevens" knop en de `onEditBasics` prop
- Voeg twee nieuwe props toe: `onUpdatePeople(count: number)` en `onAddDate` / `onRemoveDate`
- Bij "20 personen": een `Pencil`-icoontje dat een `Popover` opent met een number input + bevestig-knop
- Bij de datumweergave: een `Pencil`-icoontje dat een `Popover` opent met de bestaande `MultiDatePicker` component

Voorbeeld header na wijziging:
```text
Uw programma
👤 20 personen ✏️   📅 2 dagen ✏️        ✨ Erwin's voorstel
```

### `ProgrammaSamenstellen.tsx`

- Verwijder `onEditBasics={() => setPhase("basics")}` prop
- Voeg `onUpdatePeople`, `onAddDate`, `onRemoveDate` props toe, gekoppeld aan de CartContext functies

### Geen nieuwe bestanden nodig

De Popovers worden inline in `ProgramBuilderView` gebouwd met bestaande `Popover`, `Input` en `MultiDatePicker` componenten.

