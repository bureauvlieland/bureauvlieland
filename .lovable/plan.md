# Plan — SEO Batch B (stap 1+2+3)

Doel: maximale ranking-impact op de 10 bestaande landingspagina's in één ronde. Daarna (volgende ronde) doen we stap 4+5+6 (interne links, www-canonical, sitemap/robots).

## Scope: 10 pagina's

`/bedrijfsuitje-vlieland`, `/teamuitje-vlieland`, `/heisessie-vlieland`, `/familieweekend-vlieland`, `/groepsweekend-vlieland`, `/incentive-reis-vlieland`, `/jubileum-vlieland`, `/zakelijk-evenement-vlieland`, `/meerdaags-bedrijfsuitje-vlieland`, `/bedrijfsuitje-ideeen-vlieland`

---

## Stap 1 — Title/meta/H1 rewrite

Per pagina: exact keyword vooraan in `<title>` (≤60 tekens), in `<h1>`, en in eerste 120 tekens van de eerste alinea. Meta description ≤155 tekens met keyword + USP + impliciete CTA.

Voorbeeldlijn (`/teamuitje-vlieland`):
- title: `Teamuitje op Vlieland organiseren | Bureau Vlieland`
- description: `Teamuitje op Vlieland van A tot Z geregeld: activiteiten, overnachting, catering en logistiek. Lokale specialist met één aanspreekpunt.`
- h1: `Teamuitje op Vlieland`

Voor elke pagina lever ik dit aan in het patroon dat `BedrijfsuitjeVlieland.tsx` al gebruikt (`<Helmet>` + `<LandingPageStructuredData>`). H1 + eerste alinea aanpassen waar het keyword er nu niet letterlijk in staat.

## Stap 2 — Kannibalisatie "teamuitje / teambuilding vlieland"

`/teamuitje-vlieland` wordt hoofdpagina voor de cluster teamuitje/teambuilding.

- Canonical op `/teamuitje-vlieland` blijft self-referencing.
- Andere 9 pagina's: canonicals blijven self-referencing (geen cross-canonical — dat zou ze uit de index gooien), maar in de bodytekst van `/bedrijfsuitje-vlieland`, `/heisessie-vlieland`, `/zakelijk-evenement-vlieland` etc. één expliciete tekstuele link naar `/teamuitje-vlieland` met anchor "teamuitje op Vlieland" toevoegen waar dat nu ontbreekt.
- Title-tags ontdubbelen: zorg dat geen twee pagina's exact dezelfde primaire keyword in title hebben. `/bedrijfsuitje-vlieland` = "bedrijfsuitje", `/teamuitje-vlieland` = "teamuitje", `/heisessie-vlieland` = "heisessie", enz. — geen overlap in de hoofdfrase.

## Stap 3 — FAQ-schema (JSON-LD) per pagina

Per pagina 4 vragen (lokaal relevant, geen generiek). Nieuwe component `src/components/FaqStructuredData.tsx` die een `FAQPage` JSON-LD injecteert (zelfde patroon als `LandingPageStructuredData`). Optioneel ook visueel een FAQ-sectie tonen — voorstel: ja, want dat verbetert dwell-time en geeft Google de antwoorden in-page (Google geeft alleen rich snippets als de tekst zichtbaar is op de pagina).

Per pagina kies ik 4 vragen passend bij intent, bv. voor `/teamuitje-vlieland`:
1. Wat kost een teamuitje op Vlieland?
2. Hoe lang duurt een teamuitje op Vlieland?
3. Welke teambuilding-activiteiten zijn er op Vlieland?
4. Kunnen wij met de auto naar Vlieland voor een teamuitje?

Antwoorden kort (≤300 tekens), geen verkooppraat, feitelijk.

---

## Technische details

- Nieuwe file: `src/components/FaqStructuredData.tsx` (JSON-LD-only, mirror van `LandingPageStructuredData`).
- 10 page-files krijgen: aangepaste `<Helmet>`-content, aangepaste H1/eerste alinea waar nodig, één `<FaqStructuredData items={...}>` + zichtbare FAQ-sectie (accordion of simpele dl).
- Geen routes-, hooks- of data-wijzigingen. Pure presentatielaag.
- Geen schema- of edge-function-wijzigingen.

## Wat ik NIET in deze ronde doe

- Geen redesign of nieuwe imagery.
- Geen nieuwe pagina's.
- Geen sitemap/robots/www-canonical (stap 5+6 volgende ronde).
- Geen interne-link-blokken onderaan (stap 4 volgende ronde) — de bestaande "Bekijk ook"-blokken laten we staan zoals ze zijn.

## Volgorde van uitvoering

1. Maak `FaqStructuredData` component.
2. Per pagina (10x): titel/meta/H1/eerste alinea + FAQ-blok + JSON-LD.
3. Steekproef in preview: bekijk `/teamuitje-vlieland` en `/bedrijfsuitje-vlieland` om te bevestigen dat Helmet + JSON-LD correct renderen.

## Aanname die ik nodig heb voor groen licht

Voor de title-tags hanteer ik het patroon `{Keyword} op Vlieland organiseren | Bureau Vlieland` (of `… boeken` waar dat beter past — bv. `/incentive-reis-vlieland`). Als je een andere stijl wilt (bv. zonder " | Bureau Vlieland", of met jaartal), zeg het nu.
