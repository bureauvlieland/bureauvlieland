

## Plan: Datums en evenementgegevens bewerkbaar maken op projectdetailpagina

### Huidige situatie
De "Evenement details" sectie (datums, aantal personen, notities) op de admin projectdetailpagina is volledig read-only. Er is geen manier om datums aan te passen nadat een aanvraag is aangemaakt.

### Voorstel
Een bewerkknop (potlood-icoon) toevoegen naast de sectie-titel "Evenement details". Bij klikken opent een dialog waarmee de admin kan wijzigen:

- **Datums** — datums toevoegen/verwijderen via een datumkiezer (vergelijkbaar met de bestaande `MultiDatePicker`)
- **Aantal personen** — nummerinvoer
- **Notities** — tekstgebied

Na opslaan worden de velden in `program_requests` bijgewerkt via een directe Supabase update. Indien er een gekoppeld logiesverzoek is (`linked_accommodation_id`), worden `arrival_date` en `departure_date` automatisch meegewerkt (eerste en laatste datum).

### Wijzigingen

**`src/components/admin/EditProjectDetailsDialog.tsx`** (nieuw):
- Dialog met formulier: MultiDatePicker, number input, textarea
- Supabase update naar `program_requests` (selected_dates, number_of_people, general_notes)
- Optioneel: sync `accommodation_requests` arrival/departure dates
- Toast bij succes

**`src/pages/admin/AdminRequestDetail.tsx`**:
1. Import `EditProjectDetailsDialog` en `Pencil` icon
2. Bewerkknop toevoegen naast "Evenement details" titel (~regel 985)
3. State voor dialog open/close
4. `onSuccess` callback die `fetchRequestData()` aanroept

### Bestanden
1. `src/components/admin/EditProjectDetailsDialog.tsx` (nieuw)
2. `src/pages/admin/AdminRequestDetail.tsx` (bewerkknop + state)

