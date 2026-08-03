# Kamerconfiguratie + verzorging in logiesofferte

## Wat er nu mis is

- In het klantportaal ontbreekt de kamerconfiguratie zodra een offerte is **gekozen**: de "Uw Logies"-kaart toont alleen naam, periode, gasten, prijs en "Inbegrepen". De kamerverdeling staat alleen in de nog-niet-gekozen offertekaarten en in het losse logiesportaal.
- Er is geen apart veld voor verzorging. Nu kan een partner alleen "Ontbijt" aanvinken in de vrije lijst "Inbegrepen"; halfpension/volpension/logies-only is daardoor niet eenduidig vast te leggen of te tonen. Aan de aanvraagkant zit "Ontbijt / Halfpension / Volpension" verstopt tussen de facilteiten-checkboxes.

## Wat we bouwen

### 1. Verzorging als expliciet veld
- Nieuwe keuzelijst met vaste waarden: **Logies (alleen overnachting)**, **Logies & ontbijt**, **Halfpension**, **Volpension**, **All-inclusive**, **Anders/in overleg** (met vrij tekstveld voor toelichting).
- Aanvraag (klant): één duidelijke vraag "Welke verzorging wenst u?" in de wensen-stap van de logieswizard, met de optie "geen voorkeur / laat partner adviseren". De drie maaltijd-opties verdwijnen uit de facilteitenlijst zodat er geen dubbeling is.
- Offerte (partner): verplichte keuze "Verzorging" bovenaan het prijsblok in het partner-offerteformulier, voorgevuld met de klantvoorkeur. Bestaande offertes zonder waarde blijven werken (leeg = niet opgegeven).
- Admin ziet en kan de verzorging aanpassen in de offerte-sheet.

### 2. Verzorging overal zichtbaar
Een compacte badge/regel "Verzorging: Logies & ontbijt" op:
- klantportaal: offertelijst én de gekozen-logieskaart;
- los logiesportaal: offertekaart en detail-sheet;
- partnerportaal en admin offerte-overzicht;
- de offerteaanvraag-mail naar partners (klantvoorkeur) en het verblijfsoverzicht-PDF.

### 3. Kamerconfiguratie in het klantportaal
- De gekozen-logieskaart krijgt een blok **Kamerconfiguratie** in dezelfde stijl als de admin-weergave: per regel `1× Classic Garden (2 pers.) — €210/nacht`, plus totaal aantal kamers.
- Wordt alleen getoond als de partner kamers heeft ingevuld; anders blijft de kaart zoals nu.
- Ook meenemen in het verblijfsoverzicht-PDF als dat blok er nog niet staat.

## Technisch

- Migratie: `accommodation_quotes.board_type text` + `board_notes text`; `accommodation_requests.board_preference text`. Geen enum (voorkomt migratie-pijn), validatie in de app + check via trigger niet nodig. GRANTs/RLS blijven ongewijzigd (bestaande tabellen).
- Nieuwe constanten `BOARD_TYPES` in `src/types/accommodation.ts` met label-helper `getBoardLabel()`; gebruikt door alle weergaven.
- Aanpassingen: `src/components/accommodation/steps/StepWishes.tsx` (+ wizard-state en submit), `PartnerAccommodationQuoteSheet.tsx`, `AdminAccommodationQuoteSheet.tsx`, `AccommodationQuoteItem.tsx`, `AccommodationSection.tsx` (gekozen-state: kamerconfiguratie + verzorging), `accommodation-portal/AccommodationQuoteCard.tsx` en `AccommodationQuoteDetailSheet.tsx`, `useAccommodationQuotes.ts` / `useCustomerProgram.ts` (veld meemappen), `send-accommodation-quote-request` edge function, `src/lib/stayOverviewPdf.ts`.
- Types in `src/types/accommodation.ts` uitbreiden; unit test op `getBoardLabel()` + fallback voor lege waarde toevoegen aan de suite.
