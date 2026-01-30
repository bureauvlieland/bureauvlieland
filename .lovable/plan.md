

# Plan: Building Blocks toevoegen voor Bureau Vlieland

## Overzicht

Uit de offerte worden individuele onderdelen als bouwstenen toegevoegd aan de `building_blocks` tabel. Alle onderdelen zijn:
- **Block type**: `bureau` (Bureau Vlieland factureert direct aan klant)
- **Price type**: `total` (totaalprijs, niet per persoon)
- **Provider**: Bureau Vlieland (`provider_id`: `bureau-vlieland` of NULL voor bureau-eigen items)

---

## Te importeren bouwstenen

### Vrijdag 12 juni - Festivaldiner Lange Paal

| ID | Naam | Prijs incl. BTW | BTW | Categorie |
|----|------|-----------------|-----|-----------|
| `locatiehuur-lange-paal` | Locatiehuur Lange Paal | € 1.815,00 | 21% | activiteiten |
| `stretchtent-opbouw` | Stretchtent incl. op- en afbouw | € 2.541,00 | 21% | activiteiten |
| `easy-up-tenten` | Easy-up tenten | € 363,00 | 21% | activiteiten |
| `catering-burger-festival` | Catering Zuiver Traiteur – Build Your Own Burger Festival | € 12.507,75 | 9% | catering |
| `barfaciliteiten-glaswerk` | Barfaciliteiten & glaswerk | € 1.815,00 | 21% | catering |
| `live-muziek` | Live muziek | € 544,50 | 21% | activiteiten |
| `drank-stelpost-avond` | Drank (stelpost o.b.v. nacalculatie 18:00–23:00) | € 8.000,00 | 21% | catering |

### Zaterdag 13 juni - Diner & Feestavond De Bolder

| ID | Naam | Prijs incl. BTW | BTW | Categorie |
|----|------|-----------------|-----|-----------|
| `zaalhuur-de-bolder` | Zaalhuur De Bolder (gehele dag) | € 1.101,10 | 21% | activiteiten |
| `keukenhuur-de-bolder` | Keukenhuur De Bolder | € 544,50 | 21% | catering |
| `schoonmaak-zaal` | Schoonmaak zaal | € 302,50 | 21% | activiteiten |
| `catering-3-gangen-diner` | Catering Zuiver Traiteur – 3-gangen diner | € 14.633,25 | 9% | catering |
| `bediening-diner` | Bediening diner (stelpost) | € 2.420,00 | 21% | catering |
| `koffiebar-omzetgarantie` | Koffiebar (omzetgarantie) | € 907,50 | 9% | catering |
| `drankafkoop-avond` | Drankafkoop (19:00–01:00) | € 8.076,75 | 21% | catering |
| `techniek-installatie` | Techniek & installatie | € 600,00 | 21% | activiteiten |
| `dj-timothy` | DJ Timothy | € 665,50 | 21% | activiteiten |

### Overige onderdelen

| ID | Naam | Prijs incl. BTW | BTW | Categorie |
|----|------|-----------------|-----|-----------|
| `personeelskosten-bureau` | Personeelskosten Bureau Vlieland (productie, uitvoering, ombouw, projectleiding) | € 6.479,55 | 21% | activiteiten |
| `fietshuur-weekend` | Fietshuur vrijdag t/m zondag | € 3.090,50 | 21% | vervoer |
| `vliehors-expres` | Vliehors Expres | € 2.238,50 | 21% | vervoer |
| `bootretour-doeksen-groep` | Bootretour Doeksen (groepstarief 150 pax) | € 4.674,00 | 9% | vervoer |

---

## Technische implementatie

Voor elk item wordt een INSERT uitgevoerd naar de `building_blocks` tabel:

```sql
INSERT INTO building_blocks (
  id,
  name,
  description,
  category,
  block_type,
  price_type,
  price_adult,
  price_includes_vat,
  vat_rate,
  is_from_price,
  is_published,
  is_active,
  provider_id
) VALUES (
  'locatiehuur-lange-paal',
  'Locatiehuur Lange Paal',
  'Locatiehuur voor evenement op Lange Paal',
  'activiteiten',
  'bureau',
  'total',
  1815.00,
  true,
  21,
  false,
  false,  -- Niet direct publiceren, admin kan dit later doen
  true,
  NULL    -- Bureau Vlieland eigen item
);
```

---

## Totaal: 20 bouwstenen

De bouwstenen worden toegevoegd met:
- `is_published = false` (niet zichtbaar in publieke configurator, alleen voor maatwerk-offertes)
- `is_active = true`
- `price_type = 'total'`
- `block_type = 'bureau'`

Na toevoeging zijn deze direct beschikbaar voor admins om toe te voegen aan maatwerkprogramma's.

