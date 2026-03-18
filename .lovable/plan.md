

## Plan: Tijdpicker vervangen door vrije invoer

### Probleem
De huidige tijdselectie gebruikt een dropdown met 5-minuten intervallen (8:00–21:00). Dit is een lange lijst en beperkt de keuze tot die range.

### Oplossing
Vervang de `Select` dropdown door een combinatie van een native `<input type="time">` veld met een "Flexibel" optie via een checkbox of toggle. Dit geeft volledige 24-uurs vrijheid.

### Wijzigingen

**1. `src/components/admin/AdminAddActivitySheet.tsx`**
- Vervang de `<Select>` voor voorkeurstijd door:
  - Een checkbox "Flexibel" (default aan)
  - Als uitgevinkt: een `<Input type="time">` veld (standaard "10:00")
- Logica: als checkbox aan → `preferredTime = "flexibel"`, anders de ingevulde tijd

**2. `src/components/admin/AdminEditActivitySheet.tsx`**
- Zelfde wijziging als hierboven

**3. `src/components/admin/AddTemplateItemDialog.tsx`**
- Gebruikt al `<input type="time">` — geen wijziging nodig

### Technisch detail
- `timeSlots` import wordt verwijderd uit beide admin sheets
- De `timeSlots` array in `buildingBlock.ts` blijft bestaan (wordt mogelijk elders gebruikt)
- State-logica blijft gelijk: `preferredTime` is "flexibel" of een "HH:mm" string

