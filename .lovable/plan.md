

# Fix klantportaal labels voor bureau_central projecten

## Probleem

Het klantportaal (`/mijn-programma/:token`) houdt op drie plekken geen rekening met het facturatiemodel:

1. **ItemStatusBadge**: Toont "Aangevraagd" voor pending items, terwijl de klant bij een maatwerk-project nog helemaal niets heeft "aangevraagd" -- Bureau Vlieland stelt het programma samen.
2. **InvoiceProvidersCard**: Toont individuele partnerregels met "je ontvangt afzonderlijke facturen", terwijl bij `bureau_central` alles door Bureau Vlieland wordt gefactureerd.
3. **PriceSummaryCard**: Splitst prijzen op in "bureau" en "partner" categorieen, terwijl de klant dat onderscheid niet hoeft te zien bij centraal factureren.

## Oplossing

### Stap 1: `invoicing_mode` beschikbaar maken in het klantportaal

**Bestand:** `src/hooks/useCustomerProgram.ts`

De `program` data bevat al `invoicing_mode` vanuit de edge function `get-customer-program` (die `SELECT *` doet op `program_requests`). Dit veld is dus al beschikbaar in `program.invoicing_mode`.

### Stap 2: `invoicing_mode` doorgeven aan child-componenten

**Bestanden:** `MobileProgramView.tsx`, `DesktopProgramView.tsx`

Deze componenten moeten `invoicing_mode` doorgeven aan `InvoiceProvidersCard`, `PriceSummaryCard`, en `CustomerProgramItem`.

### Stap 3: InvoiceProvidersCard aanpassen

**Bestand:** `src/components/customer-portal/InvoiceProvidersCard.tsx`

- Nieuwe prop: `invoicingMode?: string`
- Als `invoicingMode === "bureau_central"`:
  - Verander introductietekst naar: "Bureau Vlieland verzorgt de volledige facturatie voor uw programma."
  - Alle items groeperen onder een enkele "Bureau Vlieland" regel (geen aparte partnerregels)
  - Totaalbedrag tonen als een gecombineerd bedrag

### Stap 4: PriceSummaryCard aanpassen

**Bestand:** `src/components/customer-portal/PriceSummaryCard.tsx`

- Nieuwe prop: `invoicingMode?: string`
- Als `invoicingMode === "bureau_central"`:
  - Geen opsplitsing in "bureau" en "partner" categorieen
  - Alles onder een enkele "Bureau Vlieland" noemer tonen

### Stap 5: ItemStatusBadge / CustomerProgramItem context-afhankelijk

**Bestand:** `src/components/customer-portal/CustomerProgramItem.tsx`

- Nieuwe prop: `invoicingMode?: string`
- Als `invoicingMode === "bureau_central"` en `status === "pending"`:
  - Toon "In voorbereiding" in plaats van "Aangevraagd" (klantgericht label)
  - Dit is beter dan "Nog niet verstuurd" (admin-taal) -- de klant hoeft niet te weten dat er partners zijn

## Samenvatting wijzigingen

| Bestand | Wijziging |
|---|---|
| `src/components/customer-portal/InvoiceProvidersCard.tsx` | Alles onder Bureau Vlieland bij bureau_central |
| `src/components/customer-portal/PriceSummaryCard.tsx` | Geen bureau/partner splitsing bij bureau_central |
| `src/components/customer-portal/CustomerProgramItem.tsx` | "In voorbereiding" i.p.v. "Aangevraagd" bij bureau_central |
| `src/components/customer-portal/DesktopProgramView.tsx` | invoicingMode prop doorvoeren |
| `src/components/customer-portal/MobileProgramView.tsx` | invoicingMode prop doorvoeren |

Geen database- of edge function-wijzigingen nodig -- `invoicing_mode` zit al in de `program_requests` data.

