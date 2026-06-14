# Catering-pagina: editorial herziening

Pagina blijft `/catering`. Wizard-tiles en aanvraagflow blijven werken — schuiven naar onderen als secundaire CTA. SEO/Helmet/JSON-LD behouden, "BBQ" hernoemen naar "Beach Grill experience" (consistent met eerdere keuze, ipv outdoor cooking).

## Nieuwe paginastructuur

1. **Hero** — donker, full-bleed, één Lexence-foto (plating of service). Headline: "Koken op locatie. Op Vlieland." Sub: "Van lunch tot high-end diner — door eigen chefs, één aanspreekpunt, één factuur." CTA's: "Start aanvraag" (scrollt naar wizard) + "Voor 50+ personen → Grote partijen" (link `/grote-partijen-vlieland`).

2. **Intro-statement** — kort editorial blok, één alinea over Bureau Vlieland + Zuiver Traiteur + chefs Robert Buurma & Roland Bakker als één keuken op het eiland.

3. **Chefs & keuken (B)** — editorial split-screen:
   - Links: Lexence-beelden (amuses / plating / mise-en-place) — gestapeld.
   - Rechts: tekst over chefs, niveau, lokale producten, kleine pull-quote.
   - Link "Bekijk hoe we dit voor Lexence deden →" naar `/grote-partijen-vlieland`.

4. **Voor welk moment (C)** — 4 grote beeld-first kaarten (foto vult kaart, titel + 1 zin overlay onderkant), elke kaart linkt naar `/catering-aanvragen?type=<key>`:
   - **Lunch op locatie** — `catering-food.jpg` / `lunch-buffet.jpg`
   - **Borrel & receptie** — `outdoor-drinks.jpg`
   - **Beach Grill experience** (was: Strand-BBQ / outdoor cooking) — `strand-bbq.jpg`
   - **High-end diner / walking dinner** — Lexence-foto van geplate gang
   - Maatwerk-link eronder.

5. **Locaties (nieuw)** — drie kaarten met beeld + korte tekst, plus 4e maatwerk-tegel:
   - **Brouwerij Fortuna** — proeflokaal / brouwerij-setting.
   - **Kampeerterrein De Lange Paal** — buitenlocatie aan het wad.
   - **De Bolder** — zaal met podium en grote bar op kampeerterrein Stortemelk.
   - **Andere locatie? Wij regelen het** → `/contact` of maatwerk-aanvraag.

6. **Beach Grill highlight** — bestaande "Strand BBQ" split (image+tekst) hernoemd naar **Beach Grill experience**, copy aangepast (grill op het strand, lokale producten, chef ter plaatse). Beeld blijft `strand-bbq.jpg`.

7. **Aanvraagblok (secundair)** — huidige "Wat voor catering zoekt u?" wizard-tiles verplaatst naar hieronder, header "Direct uw aanvraag starten" + korte uitleg (5 stappen, indicatieve prijs, offerte ≤2 werkdagen, ≥7 dagen vooraf). Hernoem tile "BBQ" → "Beach Grill". Maatwerk-link eronder.

8. **Banner naar Grote partijen** — strakke CTA-strook met Lexence-beeld op achtergrond: "Evenement voor 50+ personen? Bekijk onze high-end catering case." → `/grote-partijen-vlieland`.

9. **CTA-strook + Footer** — bestaande primary-CTA blok behouden.

## Wat verdwijnt

- **"Catering Mogelijkheden"** card-grid (4 generieke kaarten met bullets) → vervangen door visuele momentkaarten (sectie 4).
- **"Catering Impressies"** losse foto-galerij → beelden geïntegreerd in chefs-blok, momentkaarten en banner.

## Terminologie

- Overal **Beach Grill experience** ipv Strand-BBQ / outdoor cooking (incl. SEO meta description, FAQ-antwoord, JSON-LD `Offer name`). "BBQ" als zoekterm in `keywords`-meta blijft staan (mensen zoeken er nog op), maar zichtbare copy = Beach Grill.

## Beeldgebruik

- **Lexence-foto's**: hero, chefs-blok, "high-end diner" momentkaart, eind-banner. (Ik upload 3–5 stuks via `lovable-assets` naar `src/assets/lexence-*`. Mag ik dezelfde set gebruiken die voor `/grote-partijen-vlieland` is gepland, of upload jij specifieke beelden?)
- **Bestaande assets**: catering-food/lunch-buffet, outdoor-drinks, strand-bbq, outdoor-dining, sunset-dinner.
- **Locatie-foto's**: indien geen specifieke beelden voor Fortuna/Lange Paal/De Bolder beschikbaar → text-card met een neutraal sfeerbeeld of icoon-card. Laat je weten of je beelden aanlevert.

## Tech / scope

- Eén file: `src/pages/Catering.tsx` herschrijven.
- Helmet/SEO behouden; FAQ-tekst "strand-BBQ" → "Beach Grill experience"; og:image vervangen door Lexence-still.
- Tailwind + semantic tokens, geen nieuwe deps.
- Wizard-routes `/catering-aanvragen?type=bbq` blijven werken (param-key ongewijzigd, alleen label wordt "Beach Grill").
- Geen backend/datamodel-wijzigingen.

## Openstaand vóór bouw

1. Welke Lexence-beelden mag ik gebruiken (zelfde set als Grote partijen, of aparte upload)?
2. Heb je foto's voor Fortuna / De Lange Paal / De Bolder, of mag ik tekstkaarten zonder beeld doen (subtiel sfeer-icoon)?