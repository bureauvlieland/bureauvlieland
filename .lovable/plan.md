

# Activiteit direct toevoegen zonder tussenstap

## Probleem

De `AddActivitySheet` heeft een twee-stappen flow: eerst bladeren, dan dag/tijd/opmerkingen kiezen. Maar de tijd en opmerkingen worden niet opgeslagen (`handleAddActivity` negeert ze). Bovendien zijn er al inline controls voor tijd en opmerkingen op de kaarten zelf.

## Oplossing

De `AddActivitySheet` wordt vereenvoudigd: klik op een activiteit → direct toegevoegd aan de actieve dag. De sheet sluit. Tijd en opmerkingen pas je aan via de bestaande inline controls op de kaart.

## Wijzigingen

### `AddActivitySheet.tsx`
- Verwijder de hele "selectedBlock" tweede stap (dag/tijd/notes formulier)
- `onAddActivity` signature vereenvoudigen naar `(blockId: string) => void`
- Bij klikken op een kaart: direct `onAddActivity(block.id)` aanroepen en sheet sluiten
- Verwijder alle form state (`selectedDayIndex`, `preferredTime`, `notes`, `isSubmitting`)

### `ProgramBuilderView.tsx`
- `handleAddActivity` vereenvoudigen: roept `onAddItem(blockId, activeDay)` aan met de huidige actieve dag
- Props van `AddActivitySheet` aanpassen naar de nieuwe signature

### Klantportaal (`AddActivitySheet` wordt ook daar gebruikt)
- De klantportaal-versie van `onAddActivity` in `DesktopProgramView` en `MobileProgramView` aanpassen naar de vereenvoudigde signature
- `CustomerProgram.tsx`: `addItem` handler aanpassen

