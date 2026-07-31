## Wat er mis gaat

De werklijst (Commissie Beheer) en de pagina "Commissiefactuur maken" rekenen **onafhankelijk van elkaar** de grondslag en het percentage uit. De werklijst gebruikt de edge function `get-commission-reconciliation` (inclusief inkoopfactuur-allocaties); de factuurpagina haalt zelf ruwe rijen op en rekent opnieuw. Daardoor lopen de bedragen uiteen.

Concreet voor je selectie van 5 regels bij Zeehondentochten Vlieland:

| Regel | Werklijst | Concept BVC-2607-0002 |
|---|---|---|
| Artcadia / Katalys | 10% van € 715,60 = € 71,56 | € 715,60 → € 71,56 ✔ |
| Salure B.V. | 10% van € 931,19 = € 93,12 | € 931,20 → € 93,12 (centen weg) |
| OVM Partners | 10% van € 330,28 = € 33,03 | € 330,30 → € 33,03 (centen weg) |
| van der Velden Interieur | 10% van € 389,91 = € 38,99 | € 389,90 → € 38,99 (centen weg) |
| Regio Deal De Waddeneilanden | 10% van € 389,91 = **€ 38,99** | **€ 425,00 × 15% = € 63,75** ✘ |

**Juiste totaal: € 275,69 excl. btw** (btw 21% € 57,89 → € 333,58 incl.). Het concept staat nu op € 300,45 / € 363,54: **€ 24,76 te hoog**.

Drie bugs in `AdminCommissionInvoiceCreate.tsx` verklaren dit — alle op de Regio Deal-regel (BV-2606-0020) tegelijk:

1. **Percentage-fallback is 15%** (`Number(row.commission_percentage) || 15`) terwijl het item nog geen eigen percentage heeft. De werklijst valt terug op het partnerpercentage (Zeehondentochten = 10%). Voor logies is de fallback 10% i.p.v. het partner-logiespercentage.
2. **Inkoopfactuur via allocatie wordt genegeerd.** De pagina leidt de inkoopgrondslag af uit `commission_amount / pct` of `invoiced_amount` op het item zelf. Bij dit item staan die leeg; de inkoopfactuur 2026058 (€ 389,91 excl.) hangt via `partner_purchase_invoice_allocations` aan het item. De pagina valt dan terug op de verkoopwaarde.
3. **Btw wordt niet afgehaald als `vat_rate` leeg is.** `Number(null)` = 0, dus 0% i.p.v. de bedoelde 21%: € 425,00 blijft € 425,00 in plaats van € 351,24. Precies daarom zie je "425" in het veld Grondslag.
4. Bijkomend: terugrekenen via `commission_amount / pct` verliest centen (931,19 → 931,20 etc.).

De werklijst zelf is dus correct; de factuurpagina is het probleem. Het concept BVC-2607-0001 (Vlieland Outdoor Center) is met dezelfde logica gemaakt en moet ook nagerekend worden.

## Wat ik ga bouwen

**1. Eén bron van waarheid**
`AdminCommissionInvoiceCreate.tsx` haalt de regels niet meer zelf uit `program_request_items` / `accommodation_quotes`, maar roept `get-commission-reconciliation` aan (dezelfde edge function als de werklijst), filtert op de meegegeven `itemIds` / `quoteIds` / `invoiceIds` en zet elke `ReconRow` om naar een factuurregel met `basisAmountForBasis(row, basis)` en `commissionForBasis(row, basis)` uit `src/lib/commissionReconciliation.ts`. De grondslag-keuze (`basis`-parameter uit de URL) blijft gerespecteerd; handmatig aanpassen van grondslag en percentage per regel blijft gewoon werken.

Partner- en adresgegevens voor de factuurkop blijven uit `partners` komen.

**2. Vangnet in de werklijst**
Bij het doorklikken geef ik naast de basis ook de door de werklijst berekende grondslag mee (`amounts=<id>:<grondslag>`), zodat de factuurpagina kan valideren. Wijkt de herberekening meer dan € 0,02 af, dan verschijnt een waarschuwing boven de regels ("grondslag herberekend, controleer") in plaats van stilzwijgend een ander bedrag.

**3. Kleine correcties**
- Btw-strip helper: leeg/ongeldig `vat_rate` → 21% (activiteiten) resp. 9% (logies), niet 0%.
- Grondslag afronden op 2 decimalen vanuit het bronbedrag, niet vanuit `commission_amount`.

**4. Tests**
- `src/lib/__tests__/commissionInvoiceLines.test.ts`: regressietest met exact deze 5 Zeehondentochten-regels → totaal € 275,69; en een regel met leeg `commission_percentage` + leeg `vat_rate` + allocatie-gekoppelde inkoopfactuur → 10% van € 389,91.
- Test dat werklijst-totaal en factuur-totaal voor dezelfde selectie identiek zijn.

**5. Bestaande concepten**
Beide concepten (BVC-2607-0002 en BVC-2607-0001) zijn nog niet verstuurd. Na de fix verwijder je ze en maak je ze opnieuw aan uit de werklijst; ik meld in de chat de verwachte nieuwe bedragen zodat je kunt vergelijken. Zeg je liever dat ik ze automatisch herberekend bijwerk, dan doe ik dat in plaats van opnieuw aanmaken.

## Technische details

- Bestanden: `src/pages/admin/AdminCommissionInvoiceCreate.tsx` (hoofdmoot), `src/components/admin/CommissionWorklist.tsx` (extra `amounts`-parameter), nieuwe testfile onder `src/lib/__tests__/`.
- Geen databasewijziging nodig; `commission_invoice_lines` heeft al `commission_basis` en `purchase_invoice_id`.
- `get-commission-reconciliation` wordt aangeroepen met de partner-id die uit de eerste geselecteerde rij volgt, zodat de payload klein blijft.
