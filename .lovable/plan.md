## Doel

Bouwsteen-prijs **"Totaal in staffels op groepsgrootte"** toevoegen — naast bestaande `per_person`, `per_person_per_day`, `total`, `on_request`. Voorbeeld Vliehors Expres: 0-29 → €750, 30-39 → €850, …, 130-140 → €1.850.

## Datamodel

Geen nieuwe tabel nodig — uitbreiden bestaande enum en hergebruiken `price_extras` jsonb op `building_blocks`:

- **Nieuwe enum-waarde** op `building_block_price_type`: `tiered_total`
- **Veld `price_extras.tiers`** (jsonb-array op het blok):
  ```json
  [
    { "min_people": 0,   "max_people": 29,  "price": 750 },
    { "min_people": 30,  "max_people": 39,  "price": 850 },
    ...
    { "min_people": 130, "max_people": 140, "price": 1850 }
  ]
  ```
  Sortering op `min_people`. Boven de laatste tier → val terug op hoogste tier of "Op aanvraag" (instelbaar via `price_extras.tiers_above_max`: `"highest"` of `"on_request"`, default `"highest"`).

Geen migratie van `program_request_items` nodig — de berekende totaalprijs landt in het bestaande `quoted_price` veld (incl BTW).

## Berekenings­logica (`src/lib/tieredPricing.ts`)

```ts
resolveTier(tiers, people)   → kies eerste tier waar min≤people≤max
calculateTieredTotal(block, people) → tier.price, of null bij geen match
formatTieredPriceLabel(block) → "vanaf €750 (0-29 pers)" voor cards/lists
```

Integratie met bestaande prijslogica:
- `formatBlockPrice` / `formatPriceNote` → tonen "vanaf €X" + tier-tabel link
- `calculateIndicativeTotal` (CartContext) → gebruikt `calculateTieredTotal(block, numberOfPeople)`
- `portalPricing.ts` (klant- en partner-portal) → idem; voor `tiered_total` items wordt `quoted_price` direct getoond als totaal (geen × personen)
- Admin programma-detail / financiële regel: behandelen als `total` met dynamische prijs uit tier

## Auto-berekening op program_request_items

Bij toevoegen van een `tiered_total` blok via:
- **AdminAddActivitySheet** — `admin_price_override` blijft leeg, `quoted_price` wordt gevuld met `calculateTieredTotal(block, numberOfPeople)`, `price_type = 'total'` (zodat downstream-rekenmodules niets hoeven te weten van tiers)
- **Configurator/cart-handoff** — idem bij conversie naar `program_request_items`
- **Personenwijziging op project** — bestaande hook herberekent: detecteer `block_id` → lookup tiers → herzet `quoted_price`. Alleen voor items waar admin geen handmatige override op `quoted_price` heeft gezet.

## Admin UI (BuildingBlockSheet → tab "Prijzen")

Nieuwe optie in de `price_type`-selector: **"Totaal in staffels (groepsgrootte)"**.

Wanneer geselecteerd:
- Verberg `price_adult` veld
- Toon **tier-editor**:
  - Tabel met kolommen: Vanaf • T/m • Prijs (€)
  - Rij toevoegen / verwijderen / drag-sort op `min_people`
  - "Plak vanuit lijst" helper: textarea waarin gebruiker `0-29  750` per regel kan plakken → wordt geparsed naar tiers (handig voor Vliehors-lijst)
  - Validatie: ranges niet overlappend, oplopend, prijs > 0
- Dropdown **Boven laatste staffel**: "gebruik hoogste tier-prijs" / "Op aanvraag"
- Live preview: "Bij 45 personen → €950"

Opgeslagen in `price_extras` jsonb (al ondersteund door bestaande update-hook).

## Display

- **Configurator card / bouwsteen-detail** (`/activiteit/vliehors-expres-exclusief`): "vanaf €750" met klik-pop-up of accordion die de volledige staffel-tabel toont.
- **Cart / programma overzicht**: live bedrag o.b.v. huidige `numberOfPeople` + voetnoot "prijs valt in staffel 30-39 pers".
- **Customer portal**: zelfde toon "€X – staffelprijs (groep)". Bij personenwijziging via admin → updated.

## Technical sections

1. **Migratie**: `ALTER TYPE building_block_price_type ADD VALUE IF NOT EXISTS 'tiered_total';`
2. **`src/types/buildingBlock.ts`**: voeg `'tiered_total'` toe aan union + label.
3. **`src/lib/tieredPricing.ts`**: nieuwe util.
4. **`src/components/admin/BuildingBlockSheet.tsx`**: nieuwe `TierEditor` sub-component in Prijzen-tab.
5. **`src/lib/portalPricing.ts`** + bestaande price-rekenfuncties: respecteer `tiered_total`.
6. **`src/contexts/CartContext.tsx`** (`calculateIndicativeTotal` in `buildingBlockUtils`): tier-aware.
7. **`AdminAddActivitySheet.tsx`** + composite-expansion (in `useBlockComponents`): bij insert `tiered_total` → bereken & vul `quoted_price`, zet item-`price_type='total'`.
8. **Headcount-recalc hook** (bestaand): trigger update bij `numberOfPeople` change.
9. **Seed Vliehors Expres** doe je zelf via nieuwe admin-UI (of ik kan via insert-tool een eenmalige seed doen — laat weten).

## Out of scope (later)

- Staffels per persoon (bv. €40 bij 10-19 pers, €35 bij 20+) — kan later met variant `tiered_per_person`
- Staffels per dag / per kamer — niet nu
- Migratie bestaande "Op aanvraag"-items met handmatig ingevoerde prijzen

## Open vraag

1. Bij **groepen onder de eerste tier** (bv. 0 personen) — terugvallen op de eerste tier-prijs of "Op aanvraag"? Voorstel: eerste tier-prijs gebruiken (Vliehors voorbeeld heeft `0-29` dus dat dekt het al).
2. Wil je ook een variant **per-persoon-staffel** (volume-korting per persoon) nu meenemen, of pas later?
