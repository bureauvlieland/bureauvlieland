## Probleem

Wanneer Bureau Vlieland een logies-aanvraag annuleert, krijgt de partner een mail met de referentie (bv. `BV-2605-0005`). In de partnerportal wordt deze offerte/aanvraag dan echter volledig verborgen: in `get-partner-dashboard` worden alle quotes waarvan `accommodation_requests.status === "cancelled"` is, weggefilterd (zelfde geldt voor programma-items met `status = "cancelled"`). De partner kan dus niet terugzoeken om welke aanvraag het gaat.

## Oplossing

Twee samenhangende stappen: (1) geannuleerde items zichtbaar maken via een archief + zoekfunctie, en (2) de annuleringsmail een directe deeplink geven naar die archief-weergave.

### 1. Backend: geannuleerde items meesturen (gemarkeerd)

In `supabase/functions/get-partner-dashboard/index.ts`:
- Verwijder de harde uitsluiting van `accommodation_requests.status === "cancelled"` en van `program_requests.status === "cancelled"` / `i.status === "cancelled"`.
- In plaats daarvan: cancelled items wél meesturen, maar alleen als de annulering binnen het laatste jaar valt (anders blijft de lijst niet onbeperkt groeien). Bestaande retentie van 3 maanden voor closed quotes blijft gelden voor niet-cancelled.
- Voeg op item/quote-niveau een vlag toe (`is_cancelled: true` + `cancelled_at`) zodat de frontend ze duidelijk anders kan tonen.
- Aanvraagreferentie (`reference_number`) staat al op `program_requests`; voor `accommodation_requests` moeten we de reference ook teruggeven. Check of `accommodation_requests` een referentie heeft — zo niet, gebruik dan het bijbehorende `linked_program.reference_number` als zoek-/weergaveveld.

### 2. Frontend: archief + zoeken op referentie

In `src/pages/PartnerDashboard.tsx` / `PartnerWerkbankList.tsx` / `PartnerProjectsTable.tsx`:
- Werkbank blijft default zoals nu (geen cancelled).
- Tab **Projecten**: voeg een toggle "Toon ook geannuleerd" toe naast de bestaande archive-toggle. Als aan, worden cancelled program-items en cancelled accommodation-quotes meegenomen, met een rode/grijze badge "Geannuleerd" en de annuleringsdatum + reden (indien beschikbaar).
- Versterk het bestaande zoekveld zodat zoeken op de referentie (`BV-2605-0005`) altijd matcht, ook als het item cancelled is — dus de cancelled-filter wordt automatisch genegeerd zodra de gebruiker een referentie intypt die exact matcht.
- Klik op een cancelled rij opent het bestaande `PartnerItemSheet` / `PartnerAccommodationQuoteSheet` (die hebben de cancelled-state al ingebouwd, zie `PartnerItemSheet.tsx` regel 399 en `PartnerAccommodationQuoteSheet.tsx` regel 579 — geen extra UI nodig, alleen data doorlaten).

### 3. Annuleringsmail: deeplink

In de edge function die de "Logies-aanvraag … is geannuleerd"-mail verstuurt (waarschijnlijk `notify-partner-cancellation` of de logies-variant — wordt in build-mode opgezocht en aangepast):
- Voeg onderaan een knop/link toe: "Bekijk in je partnerportal" → `https://…/partner/dashboard?tab=projecten&q=BV-2605-0005&includeCancelled=1`.
- `PartnerDashboard.tsx` moet de query-params `q` en `includeCancelled` initieel oppakken in zijn search-state.

## Technische details

- Geen schemawijzigingen nodig: `cancelled_at` en `status='cancelled'` bestaan al op zowel `program_request_items`, `program_requests` als `accommodation_requests`/`accommodation_quotes`.
- Aanpassing in `get-partner-dashboard`: filters in regels ~137-138, ~165 en ~296-302 versoepelen + enrichment uitbreiden met `is_cancelled`, `cancelled_at`, en (voor logies) een reference-veld.
- PII-redactie voor `bureau_central` blijft ongewijzigd; alleen meta (referentie, datums, status) is voor partner relevant.
- Werkbank-filtering in `PartnerWerkbankList.tsx` (regels 76 en 124) blijft zoals die nu is — cancelled hoort niet in werkbank, alleen in projecten/archief.
- Geen wijziging in `customer_approved_at`/workflowlogica.

## Niet in scope

- Geen aparte "Archief"-pagina; we breiden de bestaande Projecten-tab uit. Eén bron van waarheid, minder navigatie.
- Geen historie van handmatig verwijderde quotes (alleen status-cancelled).
