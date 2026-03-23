

## Plan: Aantal deelnemers bewerkbaar maken in klantportaal

### Probleem
Het `override_people` veld is alleen bewerkbaar in de admin. De klant ziet het wel als label in de kostenspecificatie, maar kan het niet aanpassen per onderdeel.

### Aanpassing

**`src/components/customer-portal/CustomerProgramItem.tsx`**

In de expanded content sectie (regel ~424, binnen de `grid sm:grid-cols-2` area), voeg ik een derde veld toe **"Aantal deelnemers"** naast "Gewenste tijd" en "Dag":

- Een compact number-input met als placeholder het groepstotaal (bijv. "35")
- Leeg = gebruik groepstotaal (standaard gedrag)
- Bij wijziging: `onUpdate({ override_people: value || null })`
- Wanneer het afwijkt van het groepstotaal, toon een subtiele hint: "Standaard: 35 personen"
- In `readOnly` modus: toon alleen het afwijkende aantal als tekst

De grid wordt `sm:grid-cols-3` wanneer er meerdere dagen zijn, anders `sm:grid-cols-2` (tijd + deelnemers).

**Geen andere bestanden nodig** — de `onUpdate` callback in `useCustomerProgram` slaat al `override_people` mee als onderdeel van `Partial<ProgramRequestItem>`, en de pricing in `portalPricing.ts` pikt het automatisch op.

### Technische details

- Het veld gebruikt `<Input type="number" min={1}>` met `onChange` → `onUpdate({ override_people: val ? parseInt(val) : null })`
- De `numberOfPeople` prop moet als extra prop aan `CustomerProgramItem` worden doorgegeven (via het program object dat al beschikbaar is in de parent)
- Het label verschijnt altijd in de expanded content, niet in de collapsed meta-row (om de compacte weergave niet te belasten)

