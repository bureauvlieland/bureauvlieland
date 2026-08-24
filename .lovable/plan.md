# Goedkeuren mislukt op de klantpagina (BV-2606-0028)

## Wat er aan de hand is

Het project staat op **akkoord ontvangen**, maar de geldigheidsdatum van het voorstel (`quote_valid_until`) stond op **21 augustus 2026** — dus verlopen. De goedkeurfunctie blokkeert elke goedkeuring van een verlopen voorstel, óók als het project al akkoord is en het alleen nog om later toegevoegde/gewijzigde onderdelen gaat. Elke klik geeft dan een 400 terug.

De klantpagina laat vervolgens alleen de algemene tekst "Goedkeuren mislukt. Probeer het later opnieuw." zien, waardoor de echte reden ("dit voorstel is verlopen") onzichtbaar blijft.

## Wat we gaan doen

1. **Verlopen-blokkade niet meer toepassen op al geaccepteerde projecten.** Zodra een project de fase akkoord ontvangen of definitief bevestigd heeft, mag de klant nieuwe of gewijzigde onderdelen altijd goedkeuren — de vervaldatum hoort alleen bij de oorspronkelijke offertefase. Extra vangnet: bij een nieuw toegevoegd onderdeel wordt de geldigheid opnieuw opgerekt bij publiceren, zodat de datum niet meteen weer in het verleden ligt.

2. **Duidelijke foutmelding in het klantportaal.** In plaats van "Probeer het later opnieuw" komt de echte reden van de server in de melding te staan (bijvoorbeeld verlopen voorstel of onderdeel al goedgekeurd), zowel bij het goedkeuren van één onderdeel als bij "Alle onderdelen goedkeuren".

3. **Deze specifieke aanvraag weer werkend maken** door de geldigheidsdatum van BV-2606-0028 op te schuiven, zodat de klant direct kan goedkeuren.

## Technisch

- `supabase/functions/approve-quote-item/index.ts`: `skipValidityCheck` uitbreiden naar `admin_override || ["akkoord_ontvangen","definitief_bevestigd"].includes(program.quote_status)`.
- `supabase/functions/publish-program-changes/index.ts`: bij publiceren met nieuwe/gewijzigde onderdelen die klantgoedkeuring vereisen, `quote_valid_until` verlengen wanneer deze in het verleden ligt (conform de bestaande `quoteValidity`-instelling).
- `src/hooks/useCustomerProgram.ts`: servermelding (`data.error`) doorgeven aan de toast bij enkelvoudige én bulk-goedkeuring; per-item foutredenen tellen en in de warning-toast tonen.
- Data-fix: `quote_valid_until` van BV-2606-0028 bijwerken naar een datum in de toekomst.
- Test: unit-/edge-test die aantoont dat goedkeuren lukt bij `akkoord_ontvangen` met een verlopen `quote_valid_until`.
