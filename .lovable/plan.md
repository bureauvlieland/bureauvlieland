

## Plan: Klantportaal en Admin financieel gelijktrekken

### Huidige discrepanties

De klantpagina (PriceSummaryCard) telt **6 kostenregels** die de admin (FinancialOverviewCard + ProjectProfitSummary) **niet** meeneemt:

| Kostenregel | Klantportaal | Admin Financieel | Admin Marge |
|---|---|---|---|
| Programma-items | ✅ | ✅ | ✅ |
| Coördinatiefee | ✅ | ✅ | ✅ |
| **Toeristenbelasting** | ✅ (€270,90) | ❌ | ❌ |
| **Natuurbijdrage** | ✅ (€35,00) | ❌ | ❌ |
| **Opslag centrale facturatie** | ✅ (€87,50) | ❌ | ❌ |
| **Logies** | ✅ (geselecteerde offerte) | ❌ | ❌ |

Hierdoor toont de klant een totaal van ~€7.489,60 terwijl de admin een lager totaal ziet. De marge-berekening mist ook deze omzetregels.

### Oplossing

**1. FinancialOverviewCard.tsx — ontbrekende regels toevoegen**
- Props uitbreiden met: `touristTax`, `natureContribution`, `centralSurcharge`, `accommodationTotal`
- Deze regels toevoegen aan de itemlijst en het grandTotal
- BTW-breakdown aanpassen (toeristenbelasting/natuurbijdrage = 0% BTW, logies = 9% BTW)

**2. AdminRequestDetail.tsx — ontbrekende waarden berekenen en doorgeven**
- Toeristenbelasting: `appSettings.tourist_tax_pp_per_day × personen × dagen`
- Natuurbijdrage: `appSettings.nature_contribution_pp × personen`
- Centrale opslag: `appSettings.bureau_central_surcharge_pp × personen` (als bureau_central)
- Logies: geselecteerde accommodatie-offerte prijs ophalen
- Al deze waarden doorgeven aan zowel FinancialOverviewCard als ProjectProfitSummary

**3. ProjectProfitSummary.tsx — omzet corrigeren**
- `bureauInvoicedAmount` moet nu ook toeristenbelasting, natuurbijdrage, opslag en logies bevatten
- Zodat het totaal overeenkomt met wat de klant ziet en gefactureerd wordt

### Resultaat
- Admin "Financieel Overzicht" toont exact dezelfde regels en totalen als de klantpagina
- Marge-berekening gebaseerd op het werkelijke gefactureerde bedrag
- Geen verwarring meer over welk bedrag "het totaal" is

### Bestanden
1. `src/pages/admin/AdminRequestDetail.tsx` — extra berekeningen + props
2. `src/components/admin/FinancialOverviewCard.tsx` — 4 extra kostenregels + BTW
3. `src/components/admin/ProjectProfitSummary.tsx` — aangepaste omzet

