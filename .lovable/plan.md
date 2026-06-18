## Doel

Een **audit-rapport** opleveren (geen code- of datawijzigingen) dat per voorbeeldprogramma en per bouwsteen laat zien of de inhoud nog spoort met wat er de afgelopen 6 maanden daadwerkelijk is verkocht en bevestigd. Op basis daarvan beslis jij later per regel of we iets aanpassen.

## Scope (uit jouw antwoorden)

- **Voorbeeldprogramma's** (`program_templates` + `program_template_items`) — 11 templates, 9 gepubliceerd, 110 items
- **Bouwstenen** (`building_blocks`) — 135 totaal, 51 actief
- **Referentieset**: 14 bevestigde projecten (`quote_status IN ('akkoord_ontvangen','definitief_bevestigd')`) van de laatste 6 mnd, samen 99 program_request_items
- **Output**: rapport, nog géén wijzigingen in templates of blocks

## Deliverable

Eén Excel-bestand `/mnt/documents/audit-voorbeeldprogrammas-bouwstenen.xlsx` met 5 tabbladen, plus een korte markdown-samenvatting in de chat.

### Tab 1 — Samenvatting
Top-bevindingen, aantallen, en de "rode vlaggen": templates zonder recente match, bouwstenen die nooit verkocht zijn, bouwstenen die wél vaak verkocht worden maar inactief/concept zijn, prijsdrift > 15%.

### Tab 2 — Voorbeeldprogramma's (templates)
Per template (11 rijen):
- naam, duur, doelgroep, gepubliceerd ja/nee, indicatieve prijs p.p.
- aantal items in template
- "matchscore" t.o.v. bevestigde projecten: hoeveel van de items komen terug in recente bevestigde programma's
- gemiddelde werkelijke prijs p.p. van vergelijkbare bevestigde projecten (zelfde duur/doelgroep) vs. `indicative_price_pp` → afwijking in %
- laatst inhoudelijk bijgewerkt (`updated_at`)
- aanbeveling-kolom (leeg, jij vult in)

### Tab 3 — Template-items detail
Alle 110 template-items uitgeklapt, gekoppeld aan de bouwsteen waar ze naar verwijzen, met: status van die bouwsteen, hoe vaak die bouwsteen in de 14 bevestigde projecten zit, en of de bouwsteen nog actief is. Hiermee zie je per template welke regel "stof vangt".

### Tab 4 — Bouwstenen-gebruik
Alle 135 bouwstenen, gesorteerd op frequentie in bevestigde projecten:
- naam, type, status (concept/actief/gepubliceerd), partner
- # keer in bevestigde projecten (laatste 6 mnd)
- # keer in templates
- gemiddeld gefactureerde prijs in bevestigde projecten vs. huidige prijs op de bouwsteen → afwijking
- laatst bijgewerkt
- vlag: "veelgebruikt maar inactief", "in template maar nooit verkocht", "prijsdrift", "weeskind" (nergens gebruikt)

### Tab 5 — Bevestigde projecten (referentie)
De 14 projecten met datum, doelgroep, # gasten, duur, totaalwaarde, en de items die erin zaten. Puur als bron-onderbouwing.

## Aanpak (technisch)

1. Read-only queries op `program_templates`, `program_template_items`, `building_blocks`, `program_requests` (filter op `quote_status` + 6mnd venster), `program_request_items`.
2. Matching tussen bevestigde items en bouwstenen via `building_block_id` (waar aanwezig) + fallback op naam.
3. Prijsdrift: vergelijk bouwsteen-prijs / template `indicative_price_pp` met gemiddelde `quoted_price` / `price_per_person` van bevestigde items.
4. Excel gegenereerd via openpyxl conform de xlsx-skill (blauw = invoer/feit, zwart = berekening, prijzen incl. BTW conform projectregel).
5. Geen migrations, geen edge-functions, geen UI-aanpassingen.

## Wat dit rapport NIET doet

- Templates of bouwstenen aanpassen — dat doen we pas in een vervolgronde, per regel die jij markeert
- Partners of prijzen in de database wijzigen
- Iets publiceren of e-mailen

## Vervolgstap (na jouw review)

Jij markeert in kolom "aanbeveling" wat aangepast moet worden (tekst herschrijven, prijs bijstellen, bouwsteen op inactief, item uit template halen, etc.). Daarna doen we die wijzigingen in een aparte build-ronde, eventueel met een admin-bulk-edit-scherm als de lijst lang wordt.
