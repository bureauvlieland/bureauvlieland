

## Plan: Offerte-versiehistorie en her-goedkeuringsflow na wijziging

### Probleem
Wanneer het aantal gasten wordt gewijzigd en een offerte wordt gereset naar `pending`, en de partner daarna een aangepaste offerte indient:
1. `forwarded_at` wordt niet gereset — admin ziet nog "Doorgestuurd" met de oude datum
2. Er is geen zichtbare historie van de oude vs. nieuwe offerte
3. De klant hoeft de nieuwe versie niet opnieuw goed te keuren — het oude akkoord is mogelijk nog actief
4. De `accommodation_requests.status` gaat terug naar `processing`, maar na partner-herindenting staat het weer op `submitted` zonder dat de klant het opnieuw moet goedkeuren

### Oplossing

**1. Reset `forwarded_at` bij offerte-reset** — `src/pages/admin/AdminAccommodationDetail.tsx`

In de `updateGuestsMutation` (regel 406), voeg `forwarded_at: null` toe aan de update zodat de "Doorgestuurd" badge verdwijnt en de admin de nieuwe offerte opnieuw moet doorsturen naar de klant.

**2. Bewaar offerte-versiehistorie** — Database migratie

Nieuw tabel `accommodation_quote_history` met kolommen:
- `id`, `quote_id`, `version`, `price_total`, `price_per_person_per_night`, `room_configuration`, `includes`, `conditions`, `description`, `number_of_guests` (snapshot), `submitted_at`, `selected_at`, `forwarded_at`, `created_at`
- Triggered: wanneer een offerte wordt gereset naar `pending`, sla de huidige versie op in deze tabel

**3. Automatisch historie opslaan bij reset** — `src/pages/admin/AdminAccommodationDetail.tsx`

Vóór de reset naar `pending`, de huidige quote-gegevens ophalen en als snapshot opslaan in `accommodation_quote_history`.

**4. Historie tonen in admin quote sheet** — `src/components/admin/AdminAccommodationQuoteSheet.tsx`

Voeg een opklapbare sectie "Versiehistorie" toe onderaan het sheet. Per versie: prijs, aantal gasten, datum ingediend, datum doorgestuurd.

**5. Verwijder oude `forwarded_at` in edge function** — `supabase/functions/send-accommodation-quote-request/index.ts`

Bij re-request (status `declined/rejected/expired` → `pending`), reset ook `forwarded_at: null`.

### Wijzigingen

| Bestand | Wat |
|---|---|
| Database migratie | Tabel `accommodation_quote_history` + RLS |
| `src/pages/admin/AdminAccommodationDetail.tsx` | Reset `forwarded_at`, sla versie-snapshot op |
| `supabase/functions/send-accommodation-quote-request/index.ts` | Reset `forwarded_at` bij re-request |
| `src/components/admin/AdminAccommodationQuoteSheet.tsx` | Toon versiehistorie |

### Resultaat
- Na gastenwijziging verdwijnt "Doorgestuurd" badge → admin moet opnieuw doorsturen
- Oude offerteversies zijn bewaard en zichtbaar in de admin
- De klant doorloopt het goedkeuringsproces opnieuw voor de aangepaste offerte

