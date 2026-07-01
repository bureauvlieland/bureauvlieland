
# Plan — Extern feitenoverzicht BV-2603-0003 voor Salure & Zeezicht

Doel: één neutraal, extern presenteerbaar PDF dat alleen deze casus behandelt, met een echte visuele reconstructie van hoe de aanbieding er op 1 april 2026 uitzag voor de klant en voor de partner.

## Wat het PDF wordt

Bestand: `/mnt/documents/Feitenoverzicht_BV-2603-0003_Salure-Zeezicht.pdf` — 4 à 5 pagina's, Bureau Vlieland briefpapier (logo, adres, contactblok, ondertekening Erwin onderaan).

Inhoud, strikt neutraal (geen schuldvraag, geen voorstel):

1. **Voorblad / aanleiding** — Één alinea: waarom dit overzicht bestaat en wat de bronnen zijn (mailtekst 30 mrt, klantakkoord 1 apr, quote-history versie 1, huidige quote-waarde).
2. **Tijdlijn van de aanvraag** — Van eerste contact t/m factuur en het huidige geschil, per regel timestamp + gebeurtenis + bron.
3. **Financieel overzicht** — Tabel met de drie bedragen die feitelijk in het dossier voorkomen (€6.844 initieel, €6.446 klantakkoord 1 apr, €5.119,92 huidige DB-waarde na mutatie 10 jun) en de partnerinkoop van 23 mei — allemaal met bron en timestamp.
4. **Visuele reconstructie 1 april** — Twee paginagrote screenshots:
   - Klantpagina zoals die er op 1 apr uitzag (quote-kaart + detailsheet Zeezicht met kamerlijst, "Inbegrepen: Ontbijt", totaal €6.446, knop "Kies deze").
   - Partnerpagina met dezelfde onderliggende offerte-data.
5. **Ondertekening** — Erwin, contactblok.

Geen aanbevelingen, geen interne kritiek, geen root-cause. Puur reconstructie.

## Hoe de visuele reconstructie wordt gemaakt (technische sectie)

Playwright draait tegen de lokale preview op `http://localhost:8080`, precies volgens de sandbox-instructies:

1. Route-injectie script: in een tijdelijke test-only render mount ik `AccommodationQuoteCard` en `AccommodationQuoteDetailSheet` met een **hand-gebouwd `AccommodationQuote`-object** dat exact matcht met `accommodation_quote_history` v1 (price_total €6.446, `room_configuration` 8×€179 + 9×€199, `includes` `["Ontbijt"]`, `valid_until` = 5 apr 2026). Dit gebeurt via een throwaway route `/dev/reconstruct-2603-0003` die alleen bestaat tijdens de screenshot-run — daarna weggegooid. Geen DB-mutatie.
2. Playwright navigeert, wacht op render, en maakt element-screenshots op vaste viewport `1280×1800`.
3. Zelfde principe voor de partner-view: mock-mount van `PartnerAccommodationQuoteSheet` met dezelfde data.
4. Beide PNG's worden in het PDF ingesloten (reportlab, `Image` op ware breedte). Datumstempels in de screenshots worden bijgeknipt zodat "vandaag" niet zichtbaar is.

## Bronbevestiging vóór render

Vóór ik het PDF genereer haal ik via `supabase--read_query` één keer op:
- `accommodation_quote_history` v1-record van quote `1584d8c2` (om zeker te weten dat mijn mock-data exact overeenkomt).
- `email_log` regel van 30 mrt aan `zwaan@salure.nl` (voor citaat en timestamp).
- Contact- en bedrijfsgegevens van Salure en Zeezicht voor het adresblok bovenaan.

## QA

Na render: `pdftoppm` → elke pagina naar JPG → visueel controleren op afgekapte tekst, verkeerde bedragen, ontbrekende screenshots. Fixen, opnieuw. Pas leveren als alles klopt.

## Wat niet in dit plan zit

- Geen interne aanbevelingen, geen DB-trigger, geen `accepted_terms_log`-uitbreiding, geen portfolio-audit. Dit document is puur voor externe partijen; interne verbeteringen zijn een apart traject.
- Geen automatische mailverzending; jij bepaalt of/hoe dit naar Salure/Zeezicht gaat.
