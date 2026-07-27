
# Programma-flow vereenvoudigen

## Doel
Klanten sturen op één duidelijke ingang per intentie, en de programma-configurator wordt geschikt voor zowel losse activiteiten (via ons geboekt) als meerdaagse programma's, met een makkelijke vervoer/fietsen-stap en optionele templates.

## Homepage RoutePicker (`/`)

Wordt 5 tegels, met herverdeling van wat elke tegel doet:

| Tegel | Voor wie | Doel-URL |
|---|---|---|
| **Losse activiteiten direct boeken** | Weet wat je wilt, boekt zelf realtime bij aanbieder | `/activiteiten-boeken` (MAP) |
| **Catering aanvragen** | Alleen eten/drinken | `/catering-aanvragen` |
| **Stel uw programma samen** ⭐ meest gekozen | Één dag óf meerdaags — losse activiteit via ons, of compleet programma incl. boot/fietsen/logies | `/programma-samenstellen` |
| **Programma op maat** | Advies vooraf, wij stellen samen | `/maatwerk` |
| **Logies aanvragen** | Alleen overnachting | `/logies-aanvragen` |

Veranderingen t.o.v. huidige tegels:
- "Losse activiteit(en)" → **"Losse activiteiten direct boeken"** (tekst + subkopij verduidelijken dat dit realtime MAP-boekingen zijn, niet via Bureau Vlieland).
- De oude route "losse activiteit via ons laten regelen" (`/snel-aanvragen`) verdwijnt als aparte homepage-tegel en wordt onderdeel van "Stel uw programma samen".
- "Stel uw programma samen" krijgt subkopij: *"Van één losse activiteit tot een compleet meerdaags programma — wij regelen boot, fietsen, activiteiten en logies."*

## Wizard `/programma-samenstellen`

Nu: BasicsForm → ProgramBuilder → Contact.
Wordt:

```text
1. Basics (datum, personen)  ── bestaand
2. Vervoer & fietsen         ── NIEUW, optioneel te overslaan
3. Snelstart (optioneel)     ── NIEUW: template of leeg
4. ProgramBuilder            ── bestaand, met auto-toegevoegde items
5. Contact + verzenden       ── bestaand
```

### Stap 2 — Vervoer & fietsen
Compacte kaart met drie ja/nee-vragen:
- **Boot heen & terug regelen?** ja/nee — bij ja: heen-tijd + terug-tijd via bestaande Doeksen-API-selects (pinned op dag 1 / laatste dag zoals nu).
- **Fietsen nodig?** ja/nee — bij ja: aantal (default = aantal personen) + type (**versnellingsfiets** / **e-bike**).
- **Bagagevervoer?** ja/nee (Isla Vlieland, optioneel).

Uitkomst wordt bij confirm meteen als items in de cart gezet (day_index -1 voor boot heen, laatste dag voor terug, fiets p.p.p.d over hele duur). Klant ziet ze in stap 4 al staan en kan er nog uit.

### Stap 3 — Snelstart (optioneel)
Twee opties naast elkaar:
- **Leeg beginnen** → direct door naar builder.
- **Voorbeeldprogramma kiezen** → 2-4 templates (bijv. "Actieve teamdag", "Ontspannen bedrijfsuitje", "Meerdaags familieweekend"). Bij kiezen worden template-items toegevoegd bovenop de vervoer/fietsen uit stap 2.

Templates komen uit bestaande `program_templates` tabel (geen nieuwe backend nodig). Klant kan in stap 4 alles nog wijzigen.

### Stap 4 — ProgramBuilder
Ongewijzigd, behalve:
- Kleine contextuele hint onderaan: *"Zoekt u alleen catering? → /catering-aanvragen · Alleen overnachting? → /logies-aanvragen"* (fallback voor mensen die op de verkeerde plek zijn beland).
- Pinned boot/fietsen-items zijn al aanwezig als klant dat in stap 2 heeft aangegeven.

## Wat blijft ongewijzigd

- **Catering-flow** (`/catering-aanvragen`) — eigen wizard, blijft los.
- **Logies-flow** (`/logies-aanvragen`) — eigen partner-flow, blijft los.
- **Maatwerk** (`/maatwerk`) — intake-formulier, blijft los.
- **MAP realtime boekingen** (`/activiteiten-boeken`) — blijft ongewijzigd.
- Pricing, tourist tax, commissie, ferry-API-koppeling, partner-portal: allemaal ongewijzigd.

## Technische details

**Nieuw / gewijzigd:**
- `src/components/routepicker/RoutePicker.tsx` — tegel-labels/kopij + link "Losse activiteit(en)" bijwerken naar MAP.
- `src/pages/programma-samenstellen/*` — nieuwe wizard-stappen `TransportBikesStep.tsx` en `TemplatePickerStep.tsx`, plus step-navigatie state in bestaande wizard-container.
- `src/lib/programWizardCart.ts` (bestaand of nieuw) — helpers `addFerryItemsToCart()`, `addBikeItemsToCart()`, `applyTemplateToCart()` — gebruikt bestaande item-shapes zodat ProgramBuilder ze onveranderd toont.
- Cart-handoff via bestaande `CART_HANDOFF_KEY` (memory).

**Verwijderen / afvoeren:**
- Route `/snel-aanvragen` blijft technisch bestaan (backwards compat), maar wordt niet meer gelinkt vanaf homepage.

**Nieuwe tests:**
- `programWizardCart.test.ts` — ferry pinning op day_index -1 / laatste dag, fiets p.p.p.d over duur, template-merge zonder duplicaten.
- Uitbreiding `capacityCheck.test.ts` — vervoer-stap respecteert Watertaxi max-personen.

**Geen backend-migraties nodig.**

## Verificatie na build
1. Homepage: 5 tegels, links kloppen, "Losse activiteiten direct boeken" gaat naar MAP.
2. `/programma-samenstellen` met 1 dag → boot heen&terug + 4 fietsen aanvinken → template "Actieve teamdag" → builder toont boot pinned, fietsen p.p.p.d, template-activiteiten.
3. `/programma-samenstellen` met leeg beginnen zonder vervoer → builder start leeg, hint naar catering/logies zichtbaar.
4. Vitest suites groen.
