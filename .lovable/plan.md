

## Plan: ferry-tijden, nieuwe partner Island Events + wellness blocks, wellness-natuur uitbreiden

### A. Templates van vorige plan + ferry-tijd aanpassing
Voer de eerder goedgekeurde template-updates uit (4 nieuwe templates + Strand BBQ → Outdoor BBQ vervanging), maar **alle `boot-retour` items krijgen `preferred_time = '09:00'`** in plaats van 13:30. Voor de bestaande templates ook `boot-retour` items die nog op andere tijden staan harmoniseren naar 09:00.

### B. Nieuwe partner: Island Events
Insert in `partners`:
- `id = 'island-events'`, `name = 'Island Events'`
- `partner_type = 'activity'`, `is_active = true`
- `commission_percentage = 10`
- `website_url = 'https://vlieland.wellcomewellness.nl'`
- Verder leeg (kan later aangevuld worden via admin)

### C. Twee nieuwe building_blocks (gepubliceerd, gekoppeld aan `island-events`)

**1. `wellness-sauna-dagentree` — "Wellness Sauna Dagentree"**
- Categorie: `wellness`, `block_type = 'standard'`, `price_type = 'per_person'`
- `price_adult = 45.55` (hele dag), `is_from_price = true`, `vat_rate = 21`
- Beschrijving: Finse sauna, zoutkristal, infrarood, Turks stoombad, jacuzzi, zwembad, badjas/slippers/handdoek incl. (4 uur dagdeel of hele dag).
- `external_url = 'https://vlieland.wellcomewellness.nl/behandelingen/wellness/sauna/'`
- `min_people = 1`, `max_people = 30`, duration "halve / hele dag"

**2. `wellness-vlieland-experience` — "Vlieland Experience (Wellness)"**
- Categorie: `wellness`, `price_type = 'per_person'`, `price_adult = 180.00`, `vat_rate = 21`
- Beschrijving: 120 min compleet uitgebreide behandeling — anti-stress, voedend, herstellend (lichaamspeeling, lichaamspakking, Recover Touch facial, massage).
- `min_people = 1`, `max_people = 8` (kleine groepen), duration "120 min"

### D. Template `wellness-natuur` uitbreiden + 3-daagse variant

**Update `wellness-natuur` (2 dagen)** — voeg wellness-momenten toe:
- Dag 0 16:30: vervang `strandyoga-ontspanning` blijft, **nieuw 17:30 `wellness-sauna-dagentree`** (relax na yoga)
- Dag 1 14:30 (vrije tijd) → vervang door **`wellness-vlieland-experience`** als optionele topper
- Korte beschrijving update: "Yoga, sauna, zeehondentocht en optionele luxe wellness-behandeling."

**Nieuwe template `wellness-natuur-3d` — "Wellness & Natuur (3 dagen)"**
- `duration_days = 3`, gepubliceerd, voor verlengde weekenden of doordeweekse arrangementen
- Dag 0: Overtocht 09:00 → Fietshuur 11:00 → Strandyoga 14:00 → `wellness-sauna-dagentree` 16:00 → Diner Zeezicht 19:30
- Dag 1: Vrije tijd 10:00 → Zeehondentocht 11:30 → Lunch 13:30 → `wellness-vlieland-experience` 15:00 → Italian shared dining @ Oliva 19:00
- Dag 2: Vrije tijd 10:00 → Vliehors Expres 13:00 → Borrel & Hapjes 16:00 → Overtocht 09:00 (laatste dag — let op: tijd staat vast op 09:00 conform jouw verzoek)

### E. Beleidsregel "1-nacht alleen doordeweeks"
Voeg toe aan beide wellness templates in `seasonal_notes` / `description` van het template:
> "1-nachts arrangement is uitsluitend doordeweeks (zo–do) boekbaar i.v.m. minimumverblijfsduur in het weekend. Voor weekenden adviseren we de 3-daagse variant."

Geen schema-wijziging nodig — dit is communicatieve regel in template-omschrijving (wordt later in configurator getoond).

### Database operaties (allemaal SQL via migrations)
- `INSERT INTO partners` (Island Events)
- `INSERT INTO building_blocks` × 2 (sauna + experience)
- `UPDATE program_template_items` — ferry tijden naar 09:00
- `INSERT INTO program_template_items` — wellness-natuur uitbreiding
- `INSERT INTO program_templates` — `wellness-natuur-3d` + items
- `UPDATE program_templates` — descriptions met midweek-melding

### Niet in scope
- Auth-account voor Island Events (alleen partner-record; uitnodiging kan later via admin Bulk-mailing / wachtwoord-reset flow).
- Image uploads voor de nieuwe blocks (placeholder; later via admin).
- Configurator-validatie die boekingen op weekend echt blokkeert — nu alleen tekstuele indicatie.

