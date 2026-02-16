
# Prijsnotities en prijstype tonen in klantportaal

## Probleem
1. De prijsnotitie (`admin_price_notes`, bijv. "Per schip (12 personen)") wordt niet getoond in het klantportaal -- niet bij de individuele items en niet in het facturatie-overzicht.
2. In het onderdeel "Facturatie per onderdeel" (`InvoiceProvidersCard`) ontbreekt de aanduiding of een prijs per persoon of een totaalprijs is.

## Wat verandert

### 1. CustomerProgramItem -- prijsnotitie tonen
Bij de prijsweergave in de meta-rij (regel 170-187) wordt de `admin_price_notes` als extra tekst getoond wanneer aanwezig, direct onder of naast de prijs. Dit is de notitie die de admin instelt bij de bouwsteen (bijv. "Per schip (12 personen)").

### 2. InvoiceProvidersCard -- prijsnotitie en prijstype per item
Het huidige overzicht toont alleen de naam van items per aanbieder. Dit wordt uitgebreid:
- Per item wordt het prijstype getoond: "p.p." of "totaal"
- Als er een `admin_price_notes` bij het item hoort, wordt deze als subtekst getoond
- De itemlijst per provider wordt gedetailleerder: naam + prijs + prijstype + notitie

## Technische details

### Bestanden die worden aangepast

1. **`src/components/customer-portal/CustomerProgramItem.tsx`** (regel ~170-187)
   - Na de prijsweergave: als `item.admin_price_notes` bestaat, toon dit als kleine grijze tekst
   - Voorbeeld: `€425,00 totaal` gevolgd door `Per schip (12 personen)` in tekst eronder

2. **`src/components/customer-portal/InvoiceProvidersCard.tsx`** (regel ~154-196)
   - De itemlijst per provider (`provider.itemNames`) wordt vervangen door een gedetailleerde lijst
   - Per item worden getoond: naam, prijs met prijstype-label ("p.p." of "totaal"), en eventuele prijsnotitie
   - Hiervoor worden de individuele items gefilterd per provider in plaats van alleen namen op te slaan
   - De `ProviderInfo` interface wordt uitgebreid met items-referenties voor detailweergave
