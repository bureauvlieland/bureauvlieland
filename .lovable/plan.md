
# Plan: Bouwstenen Toevoegen/Updaten vanuit Facturen

## Samenvatting
Op basis van de 4 geüploade facturen voeg ik nieuwe bouwstenen toe en update ik bestaande waar nodig. Bij doublures gebruik ik de hoogste prijs.

---

## Bouwstenen om te UPDATEN (al in database)

| Bestaand | Huidige Prijs | Nieuwe Prijs | Actie |
|----------|---------------|--------------|-------|
| Zeehondentocht | €35 p.p. | Toevoegen variant: €425/boot exclusief | Nieuw item aanmaken |
| Vliehors Expres | €25 p.p. | Toevoegen variant: €825 exclusieve rit | Nieuw item aanmaken |
| Fietshuur | €12/dag | Geen update nodig (€9,90 is lager) | Behouden |

---

## Nieuwe Bouwstenen om toe te voegen

### Outdoor/Activiteiten (category: outdoor)
| ID | Naam | Prijs | Type | BTW | Provider |
|----|------|-------|------|-----|----------|
| strandspektakel | Strandspektakel | €32,50 p.p. | per_person | 21% | Vlieland Outdoor Center |

### Excursies (category: excursies)
| ID | Naam | Prijs | Type | BTW | Provider |
|----|------|-------|------|-----|----------|
| rondleiding-brouwerij-fortuna | Rondleiding Brouwerij Fortuna | €17,50 p.p. | per_person | 9% | Brouwerij Fortuna |
| zeehondentocht-exclusief | Zeehondentocht Exclusief (per boot) | €425 | total | 9% | Zeehondentochten Vlieland |
| vliehors-expres-exclusief | Vliehors Expres Exclusief | €825 | total | 9% | Vliehors Expres |

### Catering (category: catering)
| ID | Naam | Prijs | Type | BTW | Provider |
|----|------|-------|------|-----|----------|
| koffie-gebak-boot | Koffie & Gebak aan boord | €7,75 p.p. | per_person | 9% | Rederij Doeksen |
| lunch-strand | Lunch op het strand | €25 p.p. | per_person | 9% | Bureau Vlieland |
| borrelplank | Borrelplank | €7,75 p.p. | per_person | 9% | Bureau Vlieland |
| taart-pp | Taart (per persoon) | €4 p.p. | per_person | 9% | Bureau Vlieland |
| bubbels-fles | Fles Bubbels | €23,50 | total | 21% | Bureau Vlieland |
| wijn-wit-fles | Fles Witte Wijn (Sauvignon Blanc) | €16,75 | total | 21% | Bureau Vlieland |
| bier-heineken | Flesje Heineken | €2,75 | total | 21% | Bureau Vlieland |
| bier-fortuna-bries | Flesje Fortuna Bries | €4,25 | total | 21% | Bureau Vlieland |
| frisdrank-groot | Frisdrank 1,5L (Cola/Ice Tea) | €7,50 | total | 21% | Bureau Vlieland |
| water-chaudfontaine | Chaudfontaine 1L | €5 | total | 21% | Bureau Vlieland |
| luncharrangement | Luncharrangement | €25 p.p. | per_person | 9% | Bureau Vlieland |

### Vervoer (category: vervoer)
| ID | Naam | Prijs | Type | BTW | Provider |
|----|------|-------|------|-----|----------|
| watertaxi-harlingen-vlieland | Watertaxi Harlingen-Vlieland | €440 per rit | total | 21% | De Bazuin Watertaxi |
| taxirit-vlieland | Taxirit Vlieland | €100 | total | 21% | Taxi van Koot |
| tandemhuur | Tandemhuur | €25/dag | per_day | 21% | Fietsverhuur Jan Van Vlieland |
| terreinwagen-4x4 | Inzet 4x4 Terreinwagen | €200/dag | per_day | 21% | Bureau Vlieland |
| parkeren-harlingen | Parkeren Harlingen | €280 | total | 21% | Bureau Vlieland |

### Locaties (category: locaties)
| ID | Naam | Prijs | Type | BTW | Provider |
|----|------|-------|------|-----|----------|
| materiaalhuur-ceremonie | Materiaalhuur Ceremonie | €1182,25 | total | 21% | Bureau Vlieland |
| materiaalhuur-toostmoment | Materiaalhuur Toostmoment | €943 | total | 21% | Bureau Vlieland |
| materiaalhuur-badhuys | Materiaalhuur Badhuys | €335 | total | 21% | Badhuys Vlieland |
| zaalhuur-brouwerij-fortuna | Zaalhuur Brouwerij Fortuna | €300 | total | 21% | Brouwerij Fortuna |

### Diensten/Bureau (category: locaties - als personeelskosten)
| ID | Naam | Prijs | Type | BTW | Provider |
|----|------|-------|------|-----|----------|
| eventondersteuning-uur | Eventondersteuning (per uur) | €60,50 | per_hour | 21% | Bureau Vlieland |
| voorbereidingskosten-event | Voorbereidingskosten Event | €363 | total | 21% | Bureau Vlieland |

### Overig (toeristenbelasting - niet als bouwsteen)
| ID | Naam | Prijs | Type | BTW | Opmerking |
|----|------|-------|------|-----|-----------|
| toeristenbelasting-vlieland | Toeristenbelasting Vlieland 2025 | €2,32 p.p. | per_person | 0% | Administratief item |
| euro-voor-natuur | Euro voor de Natuur (SBB) | €1 p.p. | per_person | 0% | Donatie Staatsbosbeheer |

---

## Technische Details

### Stap 1: Insert nieuwe bouwstenen
SQL INSERT statements voor alle nieuwe items met:
- `block_type`: 'bureau' voor Bureau Vlieland items, 'partner' voor partner items
- `is_published`: false (niet direct zichtbaar in configurator)
- `is_active`: true
- `price_includes_vat`: true (prijzen zijn incl. BTW)
- Correcte `vat_rate` per item (0%, 9%, of 21%)

### Stap 2: Geen updates nodig
De bestaande items (Zeehondentocht €35 p.p., Vliehors Expres €25 p.p.) blijven bestaan als standaard tarieven. De exclusieve varianten worden als aparte items toegevoegd.

---

## Totaaloverzicht

| Categorie | Nieuwe Items |
|-----------|-------------|
| Outdoor | 1 |
| Excursies | 3 |
| Catering | 11 |
| Vervoer | 5 |
| Locaties | 6 |
| **Totaal** | **26 nieuwe bouwstenen** |

Alle prijzen worden als **BTW-inclusief** opgeslagen conform het bestaande pricing model.
