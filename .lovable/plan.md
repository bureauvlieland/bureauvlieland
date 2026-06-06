## Doel

Huisregel vastleggen: **alle invoervelden en primaire bedragweergaven tonen incl. BTW**. Excl. BTW mag alleen als secundaire afleiding (bv. "Excl. BTW: €x · BTW 9%: €y") of op formele factuur-PDF's.

## Concrete fixes (partner-facing)

1. **`PartnerItemSheet.tsx` (i-popover bij programma-onderdeel) — regel 825-855**
   - Label "Bedrag:" → "Bedrag incl. BTW:" en waarde tonen als `invoiced_amount × (1 + vat_rate/100)`.
   - Eronder kleine grijze regel: `Excl. BTW: €x · BTW {vat_rate}%: €y` zodat onderbouwing zichtbaar blijft.
   - Commissieregel ongewijzigd (blijft over excl., gelabeld "Commissie ({pct}% over excl. BTW)").

2. **`AccommodationInvoiceDialog.tsx` (logies-partner registreert factuur)**
   - Label "Factuurbedrag (excl. BTW)" → "Factuurbedrag incl. BTW *".
   - Prefill = `priceTotal` (offerte is al incl.) — blijft correct.
   - Onder veld: live afgeleide regel `Excl. BTW: €x · BTW {rate}%: €y`.
   - Commissie berekend over **excl. BTW** in plaats van over invoer.
   - Convert client-side naar excl. en stuur excl-bedrag naar edge function (edge function blijft ongewijzigd, slaat `invoiced_amount` excl. op zoals nu).
   - Nieuwe props: `vatRate`, `priceIncludesVat` doorgeven vanuit `PartnerAccommodationQuoteSheet.tsx` (regel 1121-1133).

## Audit — al correct, geen wijziging

- `InvoiceRegistrationDialog` (programma-partner) — al "Bedrag incl. BTW *".
- `RegisterCollectivePartnerInvoiceDialog` — al incl. invoer, excl. als breakdown.
- `ConfirmCommissionCard` — vorige beurt al omgezet.
- Customer-portal `PriceSummaryCard`, `Mobile/DesktopProgramView` — tonen primair incl., excl. enkel als secundaire toelichting → blijft.

## Admin — buiten scope voor deze beurt, ter discussie

Onderstaande admin-flows tonen/vragen nog primair excl. BTW. Strikt genomen valt dit ook onder "applicatiebreed", maar ze raken boekhoudkundige uitvoerdocumenten waar excl./BTW/incl. allebei zichtbaar móéten zijn (NL factuurplicht). Voorstel: laat invoer ook hier incl. worden, met automatische excl-splitsing per BTW-tarief.

- `RegisterBureauInvoiceDialog` — input "Bedrag excl. BTW *" + "BTW bedrag *" (handmatige split).
- `AddPurchaseInvoiceDialog` — toast "Bedrag excl. BTW is verplicht" (label zelf staat elders al op incl.); ook check op extra projectsplits (€-grens).
- `AdminCommissionInvoiceCreate` — labels "Grondslag (excl. BTW)" en "Commissie excl. BTW" op de inputregels.
- `ForwardToAccountingDialog` / `ForwardBureauInvoiceDialog` — "Bedrag excl:" als secundaire regel naast incl./BTW — feitelijk al breakdown, label kan blijven.
- `AdminInvoicePreview` / `FinancialOverviewCard` — invoice-PDF subtotalen "Subtotaal excl. BTW" → blijven (wettelijk).
- `AdminFinancialDashboard` — KPI "Omzet excl. BTW" → behouden, want financiële rapportage werkt standaard ex-BTW.

Wil je dat ik ook de admin-invoervelden (RegisterBureauInvoiceDialog, AdminCommissionInvoiceCreate, AddPurchaseInvoiceDialog-toast) meeneem in dezelfde slag?

## Memory-update

Voeg toe aan `mem://index.md` Core:
> Alle invoer en primaire weergave van bedragen is incl. BTW. Excl. BTW alleen als afgeleide breakdown of op formele factuur-PDF.

## Technische details

- `PartnerItemSheet`: helper `inclFromExcl(excl, rate) = excl * (1 + rate/100)` lokaal; vat_rate is al beschikbaar op `item` (kolom bestaat).
- `AccommodationInvoiceDialog`: gebruik bestaande `calculateFromInclVat` uit `src/lib/vatCalculation.ts`. Stuur `amountExclVat` naar edge function; commissie = `amountExclVat × pct/100`.
- Geen DB-migratie nodig; alleen UI/conversie.
