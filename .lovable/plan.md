
## Wat er nu mis gaat

Bij **Extra project 1** mist precies wat het hoofdproject wel heeft:

- Geen checkbox **"Direct overnemen als factuurregels"** — daardoor wordt de inkoop niet automatisch als verkoopregel (`program_item_billing_lines`) op het programma-onderdeel gezet, ook niet wanneer alle BTW-regels naar hetzelfde onderdeel wijzen.
- De BTW-splitsing op één onderdeel (jouw 9% + 21% op "Italiaanse shared dining @ Oliva") werkt visueel en wordt opgeslagen als allocaties op de extra inkoopfactuur, maar er wordt niets gekopieerd naar de verkoopfactuur van project BV-2602-0002.

## Wat het groene kader betekent (en waarom het onduidelijk is)

Het groene kader is een **balanscheck van de hele inkoopfactuur** zodra je 'm splitst over meerdere projecten:

```
Hoofdproject-aandeel        €1702,89 excl · €1882,84 incl   ← rest die overblijft voor hoofdproject
Extra project 1 (gemengd)   €600,08  excl · €660,56  incl   ← aandeel naar BV-2602-0002
✓ Klopt — sluit aan op …    €2302,97 excl · €2543,40 incl   ← totaal = factuurkopbedrag
```

Bedoeling: je ziet of de som van hoofdproject + extra('s) exact gelijk is aan het ingevulde factuurtotaal in de header. "Klopt" = totaal valt te splitsen zonder afrondingsverschil. Tekst is alleen niet zelfverklarend.

## Plan

### 1. Extra project: checkbox "Direct overnemen als factuurregels"
- In `ExtraProjectSplitBlock` toevoegen onder de allocatielijst, met **dezelfde zichtbaarheidsregel** als bij het hoofdproject:
  - Zichtbaar wanneer alle ingevulde allocaties naar **hetzelfde `item_id`** wijzen (1+ regels, ook bij meerdere BTW-tarieven op dat onderdeel).
  - Anders een grijze infoblok: "Niet beschikbaar bij verdeling over meerdere programma-onderdelen".
- Nieuw veld `copyToBillingLines: boolean` op `ExtraProjectSplit`.

### 2. Submit-logica in `AddPurchaseInvoiceDialog`
- Na `createInvoice.mutateAsync(...)` voor elke extra (`for (const e of validExtras)`):
  - Als `e.copyToBillingLines === true` én er één unieke `item_id` is in `e.allocations`:
    1. `delete from program_item_billing_lines where item_id = <target>`
    2. Per allocatie een `program_item_billing_lines`-rij invoegen (excl, vat_rate, vat_amount, incl) — identiek aan de bestaande hoofdproject-logica (regels 740–780).
    3. `update program_request_items set use_actual_costs = true, final_billing_locked_at = now() where id = <target>`
  - Toast: "Factuurregels overgenomen op programma-onderdeel (extra project)".
- De hoofdproject-tak in lijnen 731–791 blijft ongewijzigd.

### 3. Groen kader verduidelijken
In de balanssamenvatting (regels 1269–1291):
- Korte introzin boven de rijen: *"Controle: zo wordt deze inkoopfactuur over projecten verdeeld."*
- Labels iets duidelijker:
  - `Hoofdproject-aandeel` → `Hoofdproject (rest van factuurtotaal)`
  - `Extra project 1` → `Extra project 1 — <ref of klantnaam>` (we hebben de project-info al via `projects`/`split.requestId`).
  - Totaalregel: `✓ Klopt — sluit aan op factuurtotaal` blijft, maar label krijgt prefix `Factuurtotaal:` aan de rechterkant zodat duidelijk is dat dat het kopbedrag is.

### 4. Geen DB-wijzigingen
`program_item_billing_lines` en `purchase_invoice_allocations` ondersteunen dit al. Alleen frontend + bestaande mutation worden gebruikt.

## Te wijzigen bestanden
- `src/components/admin/purchase-invoices/ExtraProjectSplitBlock.tsx` — checkbox + nieuwe prop `copyToBillingLines` + `onChange`.
- `src/components/admin/AddPurchaseInvoiceDialog.tsx` — submit-tak voor extras uitbreiden + labels groen kader verduidelijken + intro zin.
