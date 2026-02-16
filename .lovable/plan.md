

# Prijsnotities en per-item detail in overzichten

## Probleem

1. In het **Prijsoverzicht** (PriceSummaryCard) worden activiteiten alleen als totaal getoond ("Activiteiten €X"), zonder individuele items, prijstype of notities zoals "Per schip (12 personen)".
2. In het **Facturatie per onderdeel** (InvoiceProvidersCard) toont het Bureau Vlieland-blok ook geen individuele items met notities -- alleen een samenvatting.
3. Het "Gemiddeld per persoon"-bedrag toont alleen incl. BTW. De klant wil ook de kosten per persoon excl. BTW zien.

## Wat verandert

### 1. PriceSummaryCard -- individuele items met notities en prijstype

In de secties "Factuur Bureau Vlieland" en "Facturen aanbieders" worden de samenvattende regels ("Activiteiten" / "Activiteiten aanbieders") vervangen door een lijst van individuele items met:
- Naam van de activiteit
- Prijs met label "p.p." of "totaal"
- `admin_price_notes` als subtekst (bijv. "Per schip (12 personen)")

De component krijgt hiervoor toegang tot de individuele `items` array (die al als prop binnenkomt) om per confirmed item de details te tonen.

### 2. InvoiceProvidersCard -- Bureau Vlieland individuele items

Het Bureau Vlieland-blok (regels 127-151) krijgt dezelfde detailweergave als de partner-blokken: individuele items met prijs, prijstype-label en eventuele `admin_price_notes`.

### 3. Kosten per persoon excl. BTW toevoegen

In het grand total blok van PriceSummaryCard wordt naast "Gemiddeld per persoon" (incl. BTW) ook een regel "Per persoon excl. BTW" toegevoegd.

## Technische details

### Bestanden die worden aangepast

1. **`src/components/customer-portal/PriceSummaryCard.tsx`**
   - In de Bureau Vlieland sectie (regel ~349-354): vervang de samenvattende regel door een loop over confirmed bureau items met naam, prijs + prijstype, en `admin_price_notes`
   - Idem voor de partner sectie (regel ~414-417) en bureau_central partner items (regel ~357-362)
   - In het grand total blok (regel ~453-458): voeg een extra regel toe: "Per persoon excl. BTW" = `totalExclVat / numberOfPeople`

2. **`src/components/customer-portal/InvoiceProvidersCard.tsx`**
   - In het Bureau Vlieland blok (regel ~127-151): voeg een itemlijst toe vergelijkbaar met de partner-blokken, met bureau-items gefilterd uit de `items` prop, inclusief prijs, prijstype en `admin_price_notes`

