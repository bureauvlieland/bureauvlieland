

# Modal bij toevoegen activiteit aan programma

## Wat verandert er?

Wanneer een bezoeker op "Toevoegen" klikt bij een bouwsteen, opent er een compacte modal/dialog in plaats van dat het item direct wordt toegevoegd. In deze modal kan de bezoeker:

1. **De dag kiezen** (alleen zichtbaar bij meerdaagse programma's) -- dropdown of knoppen met de geselecteerde data
2. **Een voorkeurstijd opgeven** -- tijdselectie in stappen van 5 minuten (bijv. "10:00", "14:30") of "Flexibel"
3. **Bevestigen** -- pas bij klik op "Toevoegen aan programma" wordt het item daadwerkelijk aan de cart toegevoegd

Dit voorkomt dat activiteiten zonder tijd in het programma belanden en maakt het direct duidelijk op welke dag iets gepland staat.

---

## Gebruikerservaring

1. Bezoeker klikt "Toevoegen" op een bouwsteenkaart
2. Een compacte dialog opent met:
   - Naam en afbeelding van de activiteit (klein, ter herkenning)
   - **Dag** -- dropdown met "Dag 1 (ma 24 mrt)", "Dag 2 (di 25 mrt)" etc. (alleen bij 2+ dagen, anders verborgen)
   - **Voorkeurstijd** -- tijdpicker met "Flexibel" als standaard, of selecteer een specifiek tijdstip
   - Begeleidende tekst: "Op welk moment past deze activiteit het beste in uw programma?"
3. Klik op "Toevoegen aan programma" voegt het item toe met de gekozen dag en tijd
4. Toast-melding bevestigt de toevoeging

---

## Technisch overzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/components/configurator/AddToCartDialog.tsx` | **Nieuw** -- Dialog component met dag- en tijdkeuze |
| `src/pages/ProgrammaSamenstellen.tsx` | `handleAddToCart` opent dialog i.p.v. direct toevoegen; state voor geselecteerd blok |
| `src/components/configurator/BuildingBlockCard.tsx` | Geen wijziging nodig (onAdd callback blijft hetzelfde) |
| `src/components/configurator/BuildingBlockListItem.tsx` | Geen wijziging nodig |

### Nieuw component: `AddToCartDialog`

- Props: `block` (BuildingBlock), `isOpen`, `onClose`, `selectedDates` (Date[]), `onConfirm(blockId, dayIndex, preferredTime)`
- Dag-selectie: Radio-buttons of Select met geformatteerde datums ("Dag 1 -- ma 24 mrt")
- Tijd-selectie: Select met "Flexibel" (standaard) + tijdslots van 08:00 t/m 22:00 in stappen van 5 minuten
- Bij eendaagse programma's wordt dag-selectie verborgen en staat dayIndex vast op 0
- Bevestigknop: "Toevoegen aan programma"

### Wijziging in `ProgrammaSamenstellen.tsx`

- Nieuwe state: `pendingBlock` (BuildingBlock | null) voor de te openen dialog
- `handleAddToCart` zet `pendingBlock` i.p.v. direct `addToCart` aan te roepen
- Nieuwe `handleConfirmAdd(blockId, dayIndex, preferredTime)` die `addToCart` + `updateItem` aanroept en de dialog sluit
- Dialog wordt gerenderd met `pendingBlock`, `selectedDates` als props

Geen database-wijzigingen nodig.
