

## Aangepast plan: Project OVM Partners B.V. (10-jaars uitje, juni 2026)

### Wijzigingen t.o.v. vorig plan

Meer bestaande bouwstenen gebruiken:

| Item in offerte | Bouwsteen | Opmerking |
|----------------|-----------|-----------|
| Fietstour met gids 2 uur (€180) | `fietstocht-met-begeleiding` (€19 p.p.) | `admin_price_override: 180` |
| Overtocht Doeksen retour (€442,80) | `boot-retour` (op aanvraag) | `admin_price_override: 442.80`, 12 p.p. = €36,90 |
| Fietshuur 2 dagen (€225,60) | `fiets-huur` (€12 p.p./dag) | `admin_price_override: 225.60`, notes: 12x 2 dagen x €9,40 |
| Toeristenbelasting (€92,88) | Geen bouwsteen — blijft losse kost | Standaard app_setting tarief |

### Volledige itemlijst

**Activiteiten (met block_id, op dag-index)**

| # | Item | block_id | provider_id | Dag | Prijs override |
|---|------|----------|-------------|-----|----------------|
| 1 | Rondleiding Brouwerij Fortuna | `rondleiding-brouwerij-fortuna` | fortuna | 0 | €210,00 |
| 2 | Fietstocht met begeleiding | `fietstocht-met-begeleiding` | bureau | 0 | €180,00 |
| 3 | Diner Zeezicht | `diner-zeezicht` (nieuw) | zeezicht-vlieland | 0 | €474,00 |
| 4 | Zeehondentocht | `zeehondentocht` | zeehonden | 1 | €360,00 |
| 5 | Lunch in de natuur | `lunch-strand` | zuiver | 1 | €294,00 |
| 6 | Italiaans Diner Oliva | `italian-shared-dining` | trattoria-oliva | 1 | €390,00 |
| 7 | Vliehors Expres | `vliehors-expres` | vliehors-expres | 2 | €354,00 |
| 8 | Overtocht Doeksen retour | `boot-retour` | bureau | -1 | €442,80 |
| 9 | Fietshuur 2 dagen | `fiets-huur` | bureau | -1 | €225,60 |

**Losse kosten (day_index = -1, geen block_id)**

| # | Kostenregel | Bedrag |
|---|-------------|--------|
| 10 | Hotelkamer Zeezicht 1-pers 2 nachten (2x €438) | €876,00 |
| 11 | Hotelkamer Zeezicht 2-pers 2 nachten (5x €478) | €2.390,00 |
| 12 | Toeristenbelasting (12 pers x 3 dgn x €2,58) | €92,88 |
| 13 | Bureaukosten 15% | €1.039,72 |

### Nieuwe bouwsteen
- `diner-zeezicht` — Diner Restaurant Zeezicht, €39,50 p.p., partner: `zeezicht-vlieland`, categorie: catering, status: published

### Project
- Klant: OVM Partners B.V., Vendelier 71 A, 3905PD Veenendaal
- Datums: 18, 19, 20 juni 2026
- 12 personen, quote_status: `offerte_verstuurd`
- Referentie offerte 2180189, relatienummer 203
- Alle items: `skip_partner_notification: true`

### Technisch
- 1 insert `building_blocks` (diner-zeezicht)
- 1 insert `program_requests`
- 13 inserts `program_request_items` (9 met block_id, 4 losse kosten)

