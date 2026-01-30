
# Plan: Referentienummers en Datumwijzigingen Klantpagina

## Overzicht
Dit plan omvat drie onderdelen:
1. Tonen van referentienummers op de klantpagina
2. Zorgen dat datumwijzigingen correct doorkomen in de admin omgeving
3. Mogelijk maken dat klanten logies datums kunnen wijzigen met notificatie naar partners

---

## 1. Referentienummers Tonen

### Huidige situatie
- Referentienummers bestaan in de database (`reference_number` in `program_requests` en `accommodation_requests`)
- Ze worden NIET opgehaald door de customer program hook
- Ze worden NIET weergegeven op de klantpagina

### Aanpassingen

**A. TypeScript types bijwerken**
- `src/types/programRequest.ts`: `reference_number` toevoegen aan `ProgramRequest` interface

**B. Data ophalen**
- `src/hooks/useCustomerProgram.ts`: De query haalt al `*` op van `program_requests`, dus `reference_number` komt al mee. We hoeven alleen het type te updaten.

**C. UI aanpassen**
- `src/components/customer-portal/ProgramOverviewCard.tsx`: Referentienummer tonen in de header
- Props toevoegen voor `referenceNumber` en optioneel `accommodationReferenceNumber`
- Weergave: `#BV-2601-0001` als subtiele badge of tekst

**D. Data doorvoeren**
- `src/pages/CustomerProgram.tsx`: Props doorgeven aan views
- `DesktopProgramView.tsx` en `MobileProgramView.tsx`: Props doorgeven naar `ProgramOverviewCard`

---

## 2. Datumwijzigingen Admin Synchronisatie

### Huidige situatie
De datumwijzigingen van klanten worden:
- ✅ Correct opgeslagen in `program_requests.selected_dates`
- ✅ Gelogd in `program_request_history`
- ✅ Partners voor activiteiten worden genotificeerd
- ❌ Accommodation datums (`arrival_date`/`departure_date`) worden NIET gesynchroniseerd

### Oorzaak
De `update-customer-program` edge function werkt alleen `program_requests.selected_dates` bij, maar raakt de gekoppelde `accommodation_requests` niet aan.

### Aanpassingen

**A. Edge function uitbreiden**
- `supabase/functions/update-customer-program/index.ts`:
  - Bij datumwijziging: check of er een `linked_accommodation_id` is
  - Update `accommodation_requests.arrival_date` en `departure_date` met de nieuwe datums
  - Log de wijziging

---

## 3. Logies Datums Wijzigen met Partner Notificatie

### Huidige situatie
- Klanten kunnen programma datums wijzigen via `EditProgramDetailsDialog`
- Er is GEEN mogelijkheid om specifiek logies datums te wijzigen
- Partners die al offertes hebben ingediend worden NIET op de hoogte gesteld

### Aanpassingen

**A. Accommodation datums synchroniseren**
- Bij wijziging van `selected_dates` door de klant, automatisch de `arrival_date` en `departure_date` van de gekoppelde accommodatie bijwerken

**B. Logiespartners notificeren**
- `supabase/functions/update-customer-program/index.ts` uitbreiden:
  - Bij datumwijziging met gekoppelde accommodatie:
    - Alle partners met een `pending` of `submitted` offerte ophalen
    - Email sturen over de datumwijziging
    - Optioneel: offerte status resetten naar `pending` zodat partners opnieuw kunnen offreren

**C. UI feedback**
- `EditProgramDetailsDialog.tsx`: Waarschuwing aanpassen om te vermelden dat ook logiesaanbieders worden geïnformeerd bij meerdaagse programma's met actieve accommodatie

---

## Technische Details

### Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/types/programRequest.ts` | `reference_number` toevoegen aan interface |
| `src/components/customer-portal/ProgramOverviewCard.tsx` | Referentienummer weergeven + props |
| `src/components/customer-portal/DesktopProgramView.tsx` | Props doorgeven voor reference_number |
| `src/components/customer-portal/MobileProgramView.tsx` | Props doorgeven voor reference_number |
| `src/components/customer-portal/EditProgramDetailsDialog.tsx` | Waarschuwing uitbreiden voor logiespartners |
| `supabase/functions/update-customer-program/index.ts` | Accommodation datums sync + partner notificaties |

### Flow na implementatie

```text
Klant wijzigt datums in EditProgramDetailsDialog
                │
                ▼
┌────────────────────────────────────────────────┐
│ update-customer-program edge function          │
│                                                │
│ 1. Update program_requests.selected_dates      │
│ 2. Als linked_accommodation:                   │
│    - Update arrival_date/departure_date        │
│    - Haal partners op met pending/submitted    │
│    - Stuur notificatie emails                  │
│    - Reset offerte status naar pending         │
│ 3. Notificeer activiteiten-partners            │
│ 4. Log naar history                            │
└────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ Admin ziet in Projects/Requests:        │
│ - Gewijzigde datums zichtbaar           │
│ - History entry voor datumwijziging     │
│ - Accommodation request met nieuwe data │
└─────────────────────────────────────────┘
```

### Email naar logiespartners

Wanneer datums wijzigen en er een actieve accommodatie aanvraag is:

**Onderwerp:** `Datumwijziging logiesaanvraag - [Bedrijfsnaam]`

**Inhoud:**
- Nieuwe datums duidelijk vermelden
- Verzoek om offerte te herzien of opnieuw in te dienen
- Link naar partnerportaal

---

## Risico's en aandachtspunten

1. **Reeds gekozen accommodatie**: Als de klant al een offerte heeft geselecteerd (`status: selected`), moeten we de klant waarschuwen dat wijzigen mogelijk consequenties heeft. Overweeg om wijzigen te blokkeren of expliciete bevestiging te vragen.

2. **Verlopen offertes**: Bij datumwijziging kunnen reeds ingediende offertes niet meer geldig zijn. De partner moet opnieuw kunnen offreren.

3. **Eendaagse programma's**: Bij eendaags programma is er geen accommodation, dus deze flow wordt overgeslagen.
