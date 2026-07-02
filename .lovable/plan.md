## Doel

In de dialog **"Inkoopfactuur toevoegen"** wil je de 31 gescande orderregels rechtstreeks als factuurregels op het gekozen programma-onderdeel boeken, zonder dat je onderaan nog handmatig bedragen per BTW-tarief hoeft in te vullen.

## Wat er nu gebeurt

- Er staat al een checkbox **"Neem factuurregels over op programma-onderdeel"** (`copyToBillingLines`).
- Maar de dialog dwingt je nog steeds om zelf de **allocaties** in te vullen (bedrag excl. BTW per tarief), omdat de header-controle daarop leunt.
- Pas als alles klopt worden de scanregels naar `program_item_billing_lines` gekopieerd.

Kortom: de scan-info wordt wél gebruikt, maar je moet 'm alsnog dubbel invoeren als allocatie.

## Voorstel

Voeg één shortcut toe: **"Alle orderregels op dit programma-onderdeel boeken"**.

1. Bovenaan bij Project/Onderdeel: knop **"Vul allocaties uit orderregels"** (alleen actief als er precies één programma-onderdeel gekozen is en er gescande regels zijn).
2. Die knop groepeert de scanregels per BTW-tarief en vult automatisch de allocatie-tabel (bedrag excl + BTW% per tarief). Je hoeft dan niets meer te typen.
3. `copyToBillingLines` blijft aan (default) — dus alle 31 regels landen 1-op-1 als billing lines op het onderdeel, met `use_actual_costs = true` en `final_billing_locked_at`.
4. Werkt ook voor **extra projecten** (verdeelfactuur): per extra dezelfde knop.
5. Bij verschillen tussen header en somregels wordt de bestaande auto-rebalance (sub-cent) gebruikt; grotere afwijkingen tonen we als waarschuwing zoals nu.

## Waar

- `src/components/admin/AddPurchaseInvoiceDialog.tsx`
  - Nieuwe helper `deriveAllocationsFromLines(lines, itemId)` → array per unieke `vat_rate`.
  - Knop naast het allocaties-blok (regel ~1322) en per extra (regel ~1296).
  - Geen wijzigingen aan de kopieerlogica zelf (regel 917-975) — die pakt de scanregels al correct op zodra `copyToBillingLines` + één target-item.

## Buiten scope

- AI-scan / OCR zelf.
- Verdeling over meerdere onderdelen automatisch raden (blijft handmatig; shortcut werkt alleen bij één gekozen onderdeel).