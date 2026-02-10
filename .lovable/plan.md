

# Plan: Prijstype-bewuste berekeningen doorvoeren

## Probleem
Het systeem behandelt momenteel alle prijzen als "per persoon" (p.p.), ongeacht de prijsconfiguratie van de bouwsteen. Items als "Locatiehuur Lange Paal" met prijstype "totaal" worden onterecht vermenigvuldigd met het aantal deelnemers. Daarnaast wordt overal standaard "p.p." getoond, ook bij totaalprijzen.

## Aanpak

### 1. Database: kolom `price_type` toevoegen aan `program_request_items`
Een nieuwe kolom `price_type` (text, nullable, default null) toevoegen aan de tabel `program_request_items`. Dit slaat het prijstype op als snapshot bij het aanmaken van het item, zodat het onafhankelijk is van latere wijzigingen aan de bouwsteen.

### 2. Bestaande data bijwerken
Een SQL-update die de `price_type` van alle bestaande items vult op basis van de gekoppelde `building_blocks` tabel (via `block_id`). Items zonder `block_id` (bijv. overige kosten) krijgen `price_type = 'total'`.

### 3. Code-aanpassingen

**AdminRequestDetail.tsx** (admin projectpagina)
- De `ProgramRequestItem` interface uitbreiden met `price_type`
- Het `price_type` doorgeven aan `AdminQuotePriceEditor` als `priceType` prop

**AdminQuotePriceEditor.tsx**
- Werkt al correct met `priceType` prop -- er hoeft niets te veranderen, alleen de juiste waarde moet worden doorgegeven

**FinancialOverviewCard.tsx** (financieel overzicht admin)
- Interface `ProgramRequestItem` uitbreiden met `price_type`
- Quote-totaal berekening aanpassen: alleen items met `price_type = 'per_person'` vermenigvuldigen met `numberOfPeople`; items met `price_type = 'total'` direct optellen
- Weergave per item: "p.p." alleen tonen bij `per_person` items, "totaal" tonen bij totaalitems

**PriceSummaryCard.tsx** (klantportaal prijsoverzicht)
- Berekeningen aanpassen zodat `quoted_price` alleen vermenigvuldigd wordt met `numberOfPeople` als `price_type = 'per_person'`

**BuildingBlockSheet.tsx** (bouwsteen aanmaken/bewerken)
- Standaard `price_adult_note` wijzigen van `"p.p."` naar `""` (leeg)
- Bij keuze `price_type = "per_person"` automatisch `price_adult_note` instellen op `"p.p."` als het veld leeg is

**RequestFormModal.tsx** (configurator inzending)
- Bij het aanmaken van items het `price_type` van de bouwsteen meegeven als snapshot

**AdminAddActivitySheet.tsx** (admin activiteit toevoegen)
- Bij het invoegen van een item het `price_type` van de geselecteerde bouwsteen meegeven

**AdminAddCostSheet.tsx** (admin kosten toevoegen)
- Standaard `price_type: 'total'` meegeven bij het invoegen

**send-quote-offer edge function**
- Kolom `price_type` meelezen uit de query (`select`)
- Email-kolomkop wijzigen van "Prijs p.p." naar "Prijs"
- Totaalberekening aanpassen: alleen p.p.-items vermenigvuldigen met `numberOfPeople`

**update-customer-program edge function**
- Bij het toevoegen van een nieuw item via het klantportaal het `price_type` van de bouwsteen meegeven

### 4. Bestaande projecten bijwerken
Na de migratie worden alle bestaande items automatisch bijgewerkt via de SQL-update in stap 2. Dit zorgt ervoor dat het Lexence-project en alle andere projecten direct correct worden weergegeven.

## Technische details

```text
program_request_items
+------------------+
| price_type (NEW) |  -- 'per_person' | 'total' | 'per_hour' | 'per_day' | 'on_request' | null
+------------------+

Berekeningslogica:
  per_person  --> prijs x numberOfPeople
  total       --> prijs (ongeacht deelnemers)
  per_hour    --> prijs (niet vermenigvuldigen)
  per_day     --> prijs (niet vermenigvuldigen)
  on_request  --> geen berekening
  null        --> fallback: per_person (backwards compatible)
```

Bestanden die worden aangepast:
- 1 database migratie (kolom + data-update)
- `src/pages/admin/AdminRequestDetail.tsx`
- `src/components/admin/FinancialOverviewCard.tsx`
- `src/components/admin/BuildingBlockSheet.tsx`
- `src/components/admin/AdminAddActivitySheet.tsx`
- `src/components/admin/AdminAddCostSheet.tsx`
- `src/components/customer-portal/PriceSummaryCard.tsx`
- `src/components/configurator/RequestFormModal.tsx`
- `src/types/programRequest.ts`
- `supabase/functions/send-quote-offer/index.ts`
- `supabase/functions/update-customer-program/index.ts`
