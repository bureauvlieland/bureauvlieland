

## Plan: Alternatieve datum voorstellen bij afwijzing logiesaanvraag

### Huidige situatie
Partners kunnen bij een logiesaanvraag kiezen uit twee opties:
1. **Offerte indienen** — met prijs, kamers, etc.
2. **Niet beschikbaar** — afwijzen met optionele reden (status `declined`)

### Gewenst
Een derde optie: **"Niet beschikbaar, maar wel op andere datum"** — de partner wijst de gevraagde periode af maar stelt alternatieve datums voor. Bureau Vlieland ontvangt dit als een notificatie/todo zodat zij de klant kunnen informeren.

### Aanpak

**1. UI: derde optie in `PartnerAccommodationQuoteSheet.tsx`**

Voeg een derde RadioGroup-optie toe: `"alternative_dates"` met:
- Twee datumvelden: **Voorgestelde aankomstdatum** en **Voorgestelde vertrekdatum**
- Tekstveld voor toelichting (bijv. "In deze week hebben wij wel kamers beschikbaar")
- Het formulier slaat op als `declined` status maar met extra metadata

**2. Database: `accommodation_quotes` uitbreiden**

Twee nieuwe nullable kolommen:
- `proposed_arrival_date` (date) — voorgestelde alternatieve aankomstdatum
- `proposed_departure_date` (date) — voorgestelde alternatieve vertrekdatum

Migratie: `ALTER TABLE accommodation_quotes ADD COLUMN proposed_arrival_date date, ADD COLUMN proposed_departure_date date;`

**3. Decline handler in `PartnerAccommodation.tsx`**

Pas `handleQuoteDecline` aan om de voorgestelde datums mee te nemen en op te slaan in de `accommodation_quotes` tabel.

**4. Admin notificatie**

Bij een afwijzing met alternatieve datums: een auto-todo aanmaken voor de admin met de voorgestelde periode, zodat Bureau Vlieland de klant kan benaderen.

**5. Admin zichtbaarheid**

In het admin accommodation detail (`AdminAccommodationDetail.tsx`) de voorgestelde alternatieve datums tonen bij afgewezen offertes, zodat de admin direct ziet wat de partner voorstelde.

### Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/migrations/...` | Twee kolommen toevoegen |
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | Derde optie `alternative_dates` met datumvelden |
| `src/pages/PartnerAccommodation.tsx` | `handleQuoteDecline` uitbreiden met datums |
| `src/pages/admin/AdminAccommodationDetail.tsx` | Voorgestelde datums tonen |

