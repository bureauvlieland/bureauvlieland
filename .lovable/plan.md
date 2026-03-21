

## Plan: Admin Financiën-tab gelijkschakelen met klantomgeving

### Huidige situatie

De admin Financiën-tab toont twee kaarten (RequestCompletionStatus + FinancialOverviewCard) maar:
1. **FinancialOverviewCard** gebruikt lokale prijslogica i.p.v. de centrale `portalPricing.ts`
2. Quote-mode toont "p.p." label bij items die al een groepstotaal zijn (`quoted_price`)
3. **Geen compleet kostenoverzicht** — alleen bureau-items worden getoond, partner-items ontbreken
4. **ProjectProfitSummary** (marge) wordt niet getoond
5. Geen toeristenbelasting, natuurbijdrage of andere toeslagen zichtbaar

### Aanpassingen

**1. `src/components/admin/FinancialOverviewCard.tsx` — Centrale prijslogica gebruiken**

- Importeer `getItemLineTotal`, `getItemUnitPrice`, `isPerPersonItem` uit `portalPricing.ts`
- Verwijder lokale kopieën van `isPerPerson`, `getItemPrice`, `getItemLineTotal`
- Quote-mode prijsweergave per regel: toon regeltotaal + "(p.p.)" label alleen als het item een `admin_price_override` heeft met price_type per_person
- Alle items tonen (niet alleen bureau), gegroepeerd per dag, met status-badge

**2. `src/components/admin/FinancialOverviewCard.tsx` — Compleet kostenoverzicht**

- Sectie "ALLE PROGRAMMAKOSTEN" toevoegen die alle items toont (zoals de klantomgeving)
- Per item: naam, regeltotaal, status (bevestigd/voorlopig/op aanvraag)
- Onderaan: coördinatiefee + regeltotalen + BTW-uitsplitsing + totaal incl. BTW
- Dit vervangt de huidige "VOORLOPIGE PROGRAMMAKOSTEN" sectie in quote-mode

**3. `src/pages/admin/AdminRequestDetail.tsx` — ProjectProfitSummary toevoegen**

- ProjectProfitSummary kaart toevoegen aan de Financiën-tab
- `bureauInvoicedAmount` berekenen uit het totaal van alle programma-items + coördinatiefee
- Inkoopfacturen en commissies doorgeven

**4. Display-regels (consistent met klantomgeving)**

| Situatie | Weergave regelprijs |
|---|---|
| `quoted_price` aanwezig | "€1.300,00" (groepstotaal) |
| `admin_price_override` + per_person | "€30,00 p.p. = €1.050,00" |
| `admin_price_override` + total | "€300,00" |
| Geen prijs | "Op aanvraag" |

### Technische details

- Import `getItemLineTotal`, `getItemUnitPrice`, `isPerPersonItem` uit `@/lib/portalPricing`
- De `ProgramRequestItem` interface in FinancialOverviewCard moet compatible zijn met de types in portalPricing (dat is al het geval)
- ProjectProfitSummary ontvangt `bureauInvoicedAmount` = som van alle `getItemLineTotal()` + coordinationFee

