## Doel

Eén "hoofd"-bouwsteen (bv. *Beach Grill Experience @ Zuiver*) sleept automatisch verplichte onderdelen mee (*BBQ-huur*, *Meubilair-set* — beide Bureau Vlieland). De klant/configurator ziet één keuze; in offerte/programma verschijnen alle losse regels (transparant, correct gefactureerd, juiste partner per regel).

## Concept

**Samengestelde bouwsteen** = gewone `building_block` met een lijst "components". Elke component verwijst naar een andere bouwsteen + hoeveelheidsregel.

```text
Beach Grill Experience (Zuiver)   ← hoofd
 ├─ [verplicht]  BBQ-huur (BV)        × 1 vast
 ├─ [verplicht]  Meubilair-set (BV)   × per 10 pers (afronden ↑)
 └─ [optioneel]  Statafels (BV)       × per 10 pers — als upsell-chip
```

## Datamodel

Nieuwe tabel `building_block_components`:

| veld | doel |
|---|---|
| parent_block_id | de samengestelde bouwsteen |
| child_block_id | het meekomende onderdeel |
| is_required | true = altijd mee, false = upsell-suggestie |
| quantity_mode | `fixed` \| `per_group` \| `per_n_people` \| `per_people_per_day` |
| quantity_value | numeriek — bij `per_n_people` = drempel (bv. 10 → "1 per 10 pers, naar boven") |
| sort_order | volgorde |
| notes | interne toelichting |

Op `program_request_items` nieuw nullable veld `parent_item_id (uuid)` zodat children gekoppeld blijven aan hun hoofd-regel.

`required_with` / `suggested_addons` jsonb blijft voor catering-wizard; geen migratie nu.

## Gedragsregels

1. **Toevoegen hoofd-bouwsteen** (configurator + admin programmabouwer):
   - alle `is_required` components worden automatisch als losse `program_request_items` toegevoegd
   - elk child houdt eigen `provider_id` / `block_type` (BBQ blijft "bureau", activiteit blijft "partner")
   - hoeveelheid berekend uit `quantity_mode` × groepsgrootte / duur, opgeslagen in `override_people` of `quoted_price`
   - `parent_item_id` verwijst naar hoofd-regel
2. **Optionele components** verschijnen als **upsell-chip** ("+ Statafels toevoegen — €X") direct onder het hoofd-item, zowel in configurator als admin. Eén klik → toegevoegd als child-regel.
3. **Verwijderen hoofd-item** → alle gekoppelde children mee verwijderd (met bevestiging "X onderdelen worden ook verwijderd").
4. **Personen-wijziging** op project: child-regels met `per_n_people` / `per_people_per_day` herberekenen automatisch (zelfde hook als bestaande prijsherberekening).
5. **Prijzen**: hoofd en children behouden eigen prijs; totaal = som. Geen dubbele facturering. `calculateIndicativeTotal` telt hoofd + verplichte children mee in templates/configurator.

## Admin UI (AdminBuildingBlocks → edit-sheet)

Nieuw tabblad **"Samenstelling"**:
- Lijst components (drag-sort)
- "+ Component toevoegen" → zoekt actieve bouwstenen
- Per regel: verplicht/optioneel toggle • hoeveelheidsmodus dropdown • value-input (bij `per_n_people` label "1 per … personen") • notitie
- Hard guard: geen recursie — child mag zelf geen components hebben (max 1 niveau)
- Op bouwsteen-overzicht: badge "🧩 samengesteld (n)" op parents

## Programma-detail (admin + customer portal + partner portal)

- Child-items visueel ingesprongen onder parent + badge "onderdeel van: *Beach Grill Experience*"
- Eén "verwijder"-knop op parent → hele groep weg
- Upsell-chip onder parent zolang er nog niet-toegevoegde optionele components zijn
- Partner ziet alleen z'n eigen regel (RLS blijft ongewijzigd; elke regel houdt eigen `provider_id`)

## Migratie & seed

- Migration: `building_block_components` (incl. GRANTs + RLS: admin full, `authenticated`/`anon` select via join op `building_blocks.status='published'`), kolom `parent_item_id` op `program_request_items` (+ index), update-trigger
- Geen backfill
- Seed van *Beach Grill Experience* doe je zelf via de nieuwe admin-UI

## Out of scope (nu niet)

- Recursie dieper dan 1 niveau
- Bundle-korting / vaste totaalprijs i.p.v. som (kan later via `price_display_override` op parent)
- Migratie bestaande `required_with` jsonb
