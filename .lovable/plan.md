

## Plan: Logiesaanvraag archiveren als "niet te helpen"

### Wat wordt gebouwd

Een "Aanvraag sluiten" actie op de admin logies-detailpagina waarmee je de aanvraag op `cancelled` zet met een reden, optioneel een e-mail naar de klant stuurt, en het klantportaal een passende melding toont.

### Wijzigingen

**1. `src/pages/admin/AdminAccommodationDetail.tsx`**
- Knop "Aanvraag sluiten" toevoegen (destructive, met `XCircle` icon)
- Dialog met:
  - Tekstveld voor reden/toelichting (wordt opgeslagen in `admin_notes` of een nieuw `cancellation_reason` veld — maar dat bestaat niet op `accommodation_requests`, dus we gebruiken `admin_notes`)
  - Checkbox "Klant per e-mail informeren" (standaard aan)
  - Bij aanvinken: opent daarna de bestaande `SendProjectEmailSheet` met een voorgegenereerde "niet te helpen" mail
- Mutation: `status = 'cancelled'` + `admin_notes` bijwerken
- Na sluiting: alle openstaande quotes (`pending`) ook op `withdrawn` zetten

**2. `src/components/customer-portal/AccommodationSection.tsx`**
- Nieuwe state toevoegen: als `accommodation.status === 'cancelled'`, toon een Card met:
  - Rode/grijze styling
  - Melding: "Bureau Vlieland heeft helaas geen passende logies kunnen vinden voor uw aanvraag."
  - Eventueel suggestie om zelf te zoeken of contact op te nemen
- Deze check komt vóór de bestaande states (na de `!accommodation` check)

**3. `src/pages/admin/AdminAccommodation.tsx`** (lijstpagina)
- Controleren of `cancelled` aanvragen correct worden weergegeven (status badge bestaat al in `STATUS_CONFIG`)

### Geen databasewijziging nodig
De status `cancelled` zit al in de constraint. Er hoeven geen migraties te draaien.

