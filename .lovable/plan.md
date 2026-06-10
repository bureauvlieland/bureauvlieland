
## Probleem

Op de Doeksen-PDF staat:
- Excl. BTW: € 246,61
- BTW laag: € 22,14
- **Totaal: € 268,75**

In de portal staat € 268,805 en in de mail € 268,80. Dat komt door twee bugs:

1. **VAT wordt herrekend i.p.v. overgenomen uit PDF.**
   In `src/components/admin/AddPurchaseInvoiceDialog.tsx` (`computeLineTotals`, regel ±160) en bij de scanner-prefill (`buildLinesFromScan`) gebruiken we alleen `amount_excl_vat` en `vat_rate`, en berekenen daaruit `vat = excl × rate`. Voor deze factuur wordt dat 246,61 × 9% = 22,1949 → totaal 268,8049. De leverancier rondt z'n BTW zelf af op € 22,14 (totaal € 268,75), dus onze waarde wijkt af van de échte factuur.

2. **Weergave-formattering toont 3 decimalen.**
   Op meerdere plekken (`AdminPurchaseInvoices.tsx` regel 423/525, `PurchaseInvoicesCard.tsx` regel 141, `usePurchaseInvoices.ts` regel 78, `MatchedRegistrationBanner.tsx` regel 146, …) staat `toLocaleString("nl-NL", { minimumFractionDigits: 2 })` zónder `maximumFractionDigits: 2`. Het opgeslagen getal 268,8049 verschijnt dan als "268,805" (portal) of "268,80" (mail, die wel afgekapt is).

## Oplossing

### A. PDF-totalen als waarheid gebruiken

In `buildLinesFromScan` en de submit-flow van `AddPurchaseInvoiceDialog`:

- Als de scanner een `amount_incl_vat`, `vat_amount` of `vat_breakdown[*].vat_amount` aanlevert: gebruik die letterlijk en bereken `excl = incl − vat` (i.p.v. `vat = excl × rate`).
- Voor `vat_breakdown`-rijen: gebruik de échte `vat_amount` per rate, niet `amount_excl × rate`.
- Voor de header-totalen die naar `partner_purchase_invoices` worden weggeschreven: prefer de gescande `amount_incl_vat` van de PDF; valt die weg, dan pas `excl + vat` (waarbij vat ook uit de PDF komt, niet herrekend).

In `src/lib/vatCalculation.ts` een nieuwe helper toevoegen:

```ts
calculateFromExclAndVat(excl: number, vat: number, rate: number): VatBreakdown
```

die `excl`, `vat`, en `incl = excl + vat` 1-op-1 overneemt en op 2 decimalen rondt. Deze gebruiken in de inkoopfactuur-flow.

### B. Bestaande factuur in DB corrigeren (BV-2605-0001)

Eenmalige update: voor de Doeksen-regel `amount_excl_vat = 246.61`, `vat_amount = 22.14`, `amount_incl_vat = 268.75`, zodat portal/mail/PDF gelijklopen.

### C. Weergave hard op 2 decimalen

In alle bedragweergaves voor inkoopfacturen `maximumFractionDigits: 2` toevoegen:
- `src/pages/admin/AdminPurchaseInvoices.tsx`
- `src/components/admin/PurchaseInvoicesCard.tsx`
- `src/components/admin/purchase-invoices/MatchedRegistrationBanner.tsx`
- `src/hooks/usePurchaseInvoices.ts` (duplicate-melding)
- en e-mail-template voor de doorstuurmail (Mailjet body in edge function).

Zo zien we nooit meer 3 decimalen, ook niet als er nog historische records met afwijkende precisie in de DB staan.

## Wat ik NIET aanpas

- De Bureau-Vlieland verkoopfactuur-flow (PDF/mail naar klant) — daar zit het verschil niet en de math klopt al.
- VAT-logica op verkoopzijde (`portalPricing`, `invoiceTotals`).
- Bestaande tests buiten inkoopfactuur-scope.

## Verificatie

1. Doeksen-factuur opnieuw bekijken in `/admin/purchase-invoices` → totaal moet € 268,75 zijn, geen 3 decimalen.
2. Doorstuurmail (Outlook/Mailjet) preview → € 268,75.
3. Een nieuwe scan met een PDF met "vreemde" BTW-afronding (bv. catering 9%) testen: bedrag moet exact gelijk zijn aan de PDF, niet herrekend.
