

## Plan: Selectieve partnernotificatie bij wijziging aantal gasten

### Probleem
Wanneer een admin het aantal gasten wijzigt, worden momenteel **alle** actieve offertes gereset en alle partners genotificeerd. Als er al een offerte is geselecteerd, zou alleen die partner geïnformeerd moeten worden — niet alle eerder benaderde (en al afgewezen) partners.

### Oplossing
De `EditAccommodationGuestsDialog` uitbreiden met een stap waarin de admin kan kiezen welke partners een notificatie krijgen en welke offertes gereset worden.

### Wijzigingen

**1. `EditAccommodationGuestsDialog.tsx` — Partner-selectie toevoegen**
- Accepteer een nieuwe prop `quotes` (lijst van actieve offertes met partnernaam en status)
- Toon checkboxes per partner met hun huidige status (geselecteerd, offerte ontvangen, wachtend)
- Pre-selecteer automatisch de partner met status "selected" als die er is
- Bij geen geselecteerde offerte: pre-selecteer alle actieve partners
- Warning-tekst dynamisch aanpassen op basis van selectie

**2. `AdminAccommodationDetail.tsx` — Mutation aanpassen**
- Pass `quotes` data door naar de dialog
- `updateGuestsMutation` aanpassen zodat deze een lijst `selectedQuoteIds` accepteert (naast `newGuests`)
- Alleen de geselecteerde offertes resetten naar "pending" in plaats van alle actieve offertes
- Alleen de partners van geselecteerde offertes worden genotificeerd via de bestaande edge function flow

**3. Notificatie-logica**
- Offertes die niet geselecteerd zijn door de admin in de dialog blijven ongewijzigd (behouden hun huidige status)
- De history-log vermeldt welke partners zijn geïnformeerd

### UI-flow
1. Admin klikt op bewerk-icoon bij "Gasten"
2. Dialog opent met aantal gasten + lijst van actieve partners met checkboxes
3. Admin past aantal aan en vinkt aan welke partners een bericht krijgen
4. Knop: "Opslaan & X partner(s) informeren"
5. Alleen aangevinkte offertes worden gereset, alleen die partners ontvangen een e-mail

