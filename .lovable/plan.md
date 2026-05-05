## Doel
Bij elke "Natuurbijdrage"-vermelding (factuur, offerte/PDF, klantportal, sidebar) een korte, vriendelijke uitleg tonen zodat klanten begrijpen waar het bedrag heen gaat.

## Voorgestelde tekst
**Korte versie (onder labels op factuur/regels):**
> "Bijdrage natuurbeheer Staatsbosbeheer"

**Uitgebreide versie (sidebar / informatieblok):**
> "Evenementenbureaus op Vlieland dragen € {bedrag} per persoon af aan Staatsbosbeheer als bijdrage voor het natuurbeheer van het recreatiegebied."

Bedrag wordt dynamisch ingevuld op basis van `appSettings.nature_contribution_pp`.

## Wijzigingen

### 1. `src/components/customer-portal/ProgramSidebar.tsx` (regel ~118)
Bestaande tekst vervangen door de uitgebreide versie hierboven (de huidige tekst "per deelnemer wordt een bijdrage afgedragen…" wordt vervangen door de meer uitleggende variant met "evenementenbureaus op Vlieland dragen … af").

### 2. `src/pages/admin/AdminInvoicePreview.tsx`
- **PDF-factuurregel** (regel ~589–596): `subDescription` wordt `"Bijdrage natuurbeheer Staatsbosbeheer · {N} personen"`.
- **Schermweergave** (regel ~1146–1158): kleine subregel onder "Natuurbijdrage": `"Bijdrage natuurbeheer Staatsbosbeheer"`.

### 3. `src/components/customer-portal/PriceSummaryCard.tsx`
- Detailregel (regel ~412–418): label + kleine subtekst `"Bijdrage natuurbeheer Staatsbosbeheer"`.
- Compacte regel (regel ~267–270): subtekst onder label.

### 4. `src/components/admin/FinancialOverviewCard.tsx` & `src/pages/admin/AdminInvoicing.tsx`
Optioneel kleine tooltip/sub-regel met dezelfde korte uitleg voor consistentie.

## Niet in scope
- Geen wijziging aan bedragen, BTW (blijft 0%) of berekeningen.
- Hardcoded NL-tekst; geen aparte instelling. Wil je het later via Instellingen kunnen aanpassen, dan voeg ik een `nature_contribution_description` setting toe.
