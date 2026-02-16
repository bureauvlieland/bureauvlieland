
# Fix: Zelf-te-regelen items verschijnen onder Bureau Vlieland

## Probleem
Items die in de bouwstenen als `self_arranged` zijn gedefinieerd (zoals "Overtocht met Rederij Doeksen" en "Fietshuur") zijn bij het aanmaken van het programma opgeslagen met `block_type = "partner"`. Hierdoor verschijnen ze in de facturatieoverzichten onder Bureau Vlieland of als partneractiviteit, terwijl ze daar niet thuishoren.

De **code** is inmiddels correct: zowel `ApplyTemplateDialog` als `AdminAddActivitySheet` nemen het juiste `block_type` over van de bouwsteen. Het probleem zit in **bestaande data** die is aangemaakt voordat deze fix actief was.

## Oplossing

### 1. Database-correctie: bestaande items bijwerken
Een UPDATE-query die alle `program_request_items` corrigeert waar het `block_type` afwijkt van de bijbehorende `building_block`:

```sql
UPDATE program_request_items pri
SET block_type = bb.block_type
FROM building_blocks bb
WHERE pri.block_id = bb.id
  AND pri.block_type != bb.block_type::text
  AND bb.block_type = 'self_arranged';
```

Dit corrigeert alle programma's in een keer, niet alleen KSHU9ndXD5Ey.

### 2. Geen codewijzigingen nodig
De display-componenten (`InvoiceProvidersCard`, `PriceSummaryCard`) filteren `self_arranged` items al correct uit. Zodra de data is gecorrigeerd, werkt alles naar behoren:
- Items verschijnen niet meer onder Bureau Vlieland of partners in het facturatieoverzicht
- Items verschijnen wel in de "Zelf te regelen" sectie
- Prijzen worden niet meegenomen in de totalen
