

# Configurator radicaal vereenvoudigen: formulier → programmaweergave

## Probleem

De huidige flow heeft nog steeds een keuzescherm (EntryChoice) dat een extra klik vereist voordat de klant iets kan doen. De grid+sidebar+cart layout is complex. De klantpagina (AddActivitySheet) heeft een veel intuïtievere UX voor het toevoegen van activiteiten.

## Nieuwe flow

```text
Hero → Inline formulier (naam, e-mail, telefoon, bedrijf, type, personen, datums)
     → "Start" knop
     → Programmaweergave (klantportaal-stijl) met "Activiteit toevoegen" sheet
     → "Verstuur aanvraag" knop
```

Geen keuzeschermen, geen grid, geen sidebar cart. Eén formulier, dan direct bouwen.

## Technische aanpak

### 1. Nieuwe fase-structuur in `ProgrammaSamenstellen.tsx`

Twee fasen: `"basics"` en `"program"`.

**Basics fase**: Inline formulier met alle contactgegevens + groepsinfo (velden uit huidige `RequestFormModal`):
- Naam, e-mail, telefoon, bedrijf (optioneel)
- Type evenement (dropdown)
- Aantal personen
- Datum(s) kiezen (multi-date picker)
- Grote "Start uw programma" knop

**Program fase**: Klantportaal-stijl overzicht:
- Header met samenvatting (personen, datums, type)
- Dag-tabs bij meerdaags (hergebruik `DayTabs`)
- Timeline van toegevoegde activiteiten (hergebruik `CustomerTimeline` patronen)
- Prominente "Activiteit toevoegen" knop → opent `AddActivitySheet`
- Zwevende "Verstuur aanvraag" balk onderaan

### 2. Hergebruik `AddActivitySheet` patronen

De bestaande `AddActivitySheet` is bijna 1-op-1 geschikt. Aanpassing: tijdslot-selectie verwijderen (conform eerdere beslissing), alleen dag-keuze bij meerdaags behouden.

### 3. `RequestFormModal` wordt submit-bevestiging

De modal bevat geen contactgegevens meer (die zijn al ingevuld). Het wordt een korte bevestigingsstap met:
- Samenvatting van programma + contactgegevens
- Eventuele opmerkingen (textarea)
- "Verstuur" knop

### 4. EntryChoice, AiErwinChat, TemplateSelector

- `EntryChoice.tsx` wordt niet meer gebruikt op de configuratorpagina
- `AiErwinChat.tsx` en `TemplateSelector.tsx` blijven bestaan maar worden niet meer direct gekoppeld — ze kunnen later als optionele routes terugkomen
- Geen bestanden verwijderd (kunnen elders gebruikt worden)

### 5. Cart context blijft functioneel

De `CartContext` blijft werken voor het bijhouden van items. De UI presentatie verandert van cart-sidebar naar een programma-tijdlijn.

## Bestanden

| Actie | Bestand |
|---|---|
| Herschrijf | `src/pages/ProgrammaSamenstellen.tsx` — twee fasen: basics form → programmaweergave |
| Nieuw | `src/components/configurator/ProgramBuilderView.tsx` — klantportaal-stijl programmaweergave met add-activiteit knop |
| Nieuw | `src/components/configurator/BasicsForm.tsx` — inline formulier voor contactgegevens + groepsinfo |
| Wijzig | `src/components/configurator/RequestFormModal.tsx` — vereenvoudigen naar bevestiging + opmerkingen |

