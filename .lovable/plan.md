

# Losse facturabele kosten toevoegen aan projecten

## Wat verandert
Admins kunnen "overige kosten" toevoegen aan een project die niet bij het dagprogramma horen, zoals gewerkte uren, toeristenbelasting, of huur van materiaal. Deze items verschijnen in het financieel overzicht maar niet in de programma-planning.

## Aanpak
We gebruiken de bestaande `program_request_items` tabel met een conventie: items met `day_index = -1` zijn "overige kosten" en worden niet in het programma getoond. Hiervoor is een kleine databasewijziging nodig (`block_id` nullable maken) zodat ad-hoc kosten geen bouwsteen hoeven te refereren.

## Wijzigingen

### 1. Database migratie
- `block_id` kolom nullable maken (was `NOT NULL`) zodat ad-hoc kosten geen bouwsteen-referentie nodig hebben
- Bestaande data wordt niet geraakt

### 2. Nieuw component: AdminAddCostSheet
Een apart, simpel formulier (Sheet) voor het toevoegen van losse kosten met:
- **Omschrijving** (vrij tekstveld, verplicht)
- **Bedrag** (verplicht, in EUR)
- **BTW-tarief** (dropdown: 21%, 9%, 0%)
- **Toelichting** (optioneel, voor klant zichtbaar)
- **Gefactureerd door** (Bureau Vlieland of partner-keuze)

Technisch wordt een `program_request_item` aangemaakt met:
- `block_id = null`
- `day_index = -1`
- `block_type = "bureau"`
- `block_category = "overig"`
- `status = "confirmed"`
- `admin_price_override` = het ingevoerde bedrag
- `skip_partner_notification = true`

### 3. Aanpassing AdminRequestDetail
- Nieuwe knop "Kosten toevoegen" naast de bestaande "Activiteit toevoegen"
- Items met `day_index = -1` uitsluiten uit de programmatabel (dagindeling)
- Nieuw blok "Overige kosten" onderaan de financiele sectie met een overzicht van deze items (met edit/delete opties)

### 4. Aanpassing FinancialOverviewCard
- Items met `day_index = -1` apart tonen onder een kopje "OVERIGE KOSTEN" boven de subtotalen
- Meenemen in de totaalberekening

### 5. Klantportaal: uitsluiten uit programma
- In `CustomerProgramItem`, `DesktopProgramView`, en `MobileProgramView`: items met `day_index = -1` filteren uit de dagweergave
- In `PriceSummaryCard`/`CompactBillingSection`: deze kosten wel meenemen en apart tonen

### 6. Partnerportaal
- Overige kosten (day_index = -1) uitsluiten uit partneroverzichten, aangezien ze altijd door Bureau Vlieland worden afgehandeld

## Technisch

### Migratie SQL
```sql
ALTER TABLE program_request_items ALTER COLUMN block_id DROP NOT NULL;
```

### Bestanden die worden aangemaakt
- `src/components/admin/AdminAddCostSheet.tsx` -- formulier voor losse kosten

### Bestanden die worden gewijzigd
- `src/pages/admin/AdminRequestDetail.tsx` -- knop + overzicht overige kosten + filter programma
- `src/components/admin/FinancialOverviewCard.tsx` -- overige kosten in financieel overzicht
- `src/components/customer-portal/ProgramSection.tsx` -- filter day_index=-1 uit programma
- `src/components/customer-portal/PriceSummaryCard.tsx` -- toon overige kosten apart
- `src/types/programRequest.ts` -- block_id nullable maken in interface
