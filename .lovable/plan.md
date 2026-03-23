

## Plan: Logiesaanvraag intrekken bij partners

### Wat
Een "Intrekken" actie toevoegen per partner in de partnerlijst en bij offertekaarten, waarmee een admin een uitgevraagde offerte kan intrekken (status `pending` → verwijderd of geannuleerd). Optioneel kan de partner een notificatie-email ontvangen.

### Aanpassingen

**1. `src/pages/admin/AdminAccommodationDetail.tsx`** — Partner selectielijst uitbreiden:
- Bij partners met status `pending` ("Wacht op reactie"): een "Intrekken" knop toevoegen (XCircle icoon)
- Bij klikken: AlertDialog ter bevestiging met optie om de partner per email te informeren
- Na bevestiging: quote record verwijderen of status op `withdrawn` zetten, `quotes_requested_count` decrementeren, en communicatielog aanmaken
- De partnerlijst refreshen na actie

**2. Database migratie** — Nieuwe status `withdrawn` toevoegen:
- De `accommodation_quotes` tabel staat al vrije text-statussen toe (geen enum), dus `withdrawn` kan direct gebruikt worden
- Update `quotes_requested_count` op de `accommodation_requests` tabel bij intrekking

**3. `supabase/functions/withdraw-accommodation-quote/index.ts`** — Nieuwe edge function:
- Accepteert `quoteId` en optioneel `notifyPartner: boolean`
- Zet quote status op `withdrawn`
- Decrementeert `quotes_requested_count` op de request
- Stuurt optioneel een email naar de partner (template of inline)
- Logt in `project_communications`

**4. UI-weergave updates**:
- In de partner selectielijst: `withdrawn` status tonen als grijze badge "Ingetrokken"
- Ingetrokken partners weer selecteerbaar maken (zodat ze opnieuw uitgevraagd kunnen worden)
- In de offertekaarten-grid: ingetrokken offertes niet tonen (of als aparte groep)

### Technische details

- De edge function valideert admin-authenticatie en controleert dat de quote daadwerkelijk status `pending` heeft
- `quotes_requested_count` wordt met 1 verlaagd via een SQL update
- De email aan de partner is optioneel en gebruikt een simpel inline template ("Bureau Vlieland heeft de offerteaanvraag voor [periode] ingetrokken")
- Communication log entry met type `email` of `note`, direction `outbound`

### Bestanden
1. `src/pages/admin/AdminAccommodationDetail.tsx` — intrekken-knop + bevestigingsdialog
2. `supabase/functions/withdraw-accommodation-quote/index.ts` — nieuwe edge function
3. Database migratie — geen schemawijziging nodig (status is vrij tekstveld)

