

# BasicsForm vereenvoudigen: alleen pax + datums, contactgegevens naar indienen

## Wat verandert er

Het startscherm wordt veel compacter: alleen **aantal personen** en **datum(s)**. Contactgegevens (naam, email, telefoon, bedrijf) en type uitje verhuizen naar het moment van indienen — de `RequestFormModal` heeft deze velden al, inclusief prefill-logica.

## Wijzigingen

### 1. `BasicsForm.tsx` — Strip naar kern

- Verwijder: naam, email, telefoon, bedrijf, eventType velden
- Houd over: aantal personen + MultiDatePicker + submit-knop
- `BasicsFormData` interface wordt simpeler: alleen `numberOfPeople` en `selectedDates`
- Validatie: `selectedDates.length > 0 && numberOfPeople >= 1`
- Tekst aanpassen: "Hoeveel personen en welke datum(s)?"

### 2. `MultiDatePicker.tsx` — Fix datepicker overlap

- De `PopoverContent` krijgt `side="bottom"` en `sideOffset={8}` zodat de kalender altijd **onder** de chips opent, niet eroverheen
- Eventueel `forceMount` verwijderen als dat z-index problemen geeft

### 3. `ProgrammaSamenstellen.tsx` — Pas `handleBasicsSubmit` aan

- `contactData` state wordt niet meer gezet bij basics (die info bestaat nog niet)
- `BasicsFormData` bevat geen contactvelden meer
- `prefillData` voor `RequestFormModal` wordt niet meer vanuit basics meegegeven (de modal vraagt het zelf)

### 4. `RequestFormModal.tsx` — Contactvelden worden nu altijd ingevuld

- `prefillData` prop wordt optioneel (was het al) — als er geen prefill is, start de modal gewoon met lege velden
- Geen codewijziging nodig hier, want de modal heeft al alle contactvelden + eventType

## Resultaat

```text
Stap 1 (basics):     Aantal personen + Datum(s) → "Start uw programma"
Stap 2 (builder):    Activiteiten kiezen, Erwin-voorstel, drag & drop
Stap 3 (indienen):   Modal met contactgegevens + type uitje + opmerkingen
```

