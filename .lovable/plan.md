

# Toeristenbelasting & Natuurbijdrage toevoegen aan kostenspecificatie

## Wat

Twee nieuwe standaard orderregels in het kostenoverzicht:
1. **Toeristenbelasting** — €2,58 p.p. per dag (configureerbaar via instellingen)
2. **Natuurbijdrage Staatsbosbeheer** — €1,00 p.p. (configureerbaar via instellingen)

Beide bedragen zijn **exclusief BTW** (0% BTW — het zijn heffingen/bijdragen, geen diensten).

## Database: 2 nieuwe app_settings rijen

Twee nieuwe rijen in `app_settings` toevoegen via de insert-tool:
- `tourist_tax_pp_per_day` — categorie `pricing`, value `2.58`, type `number`
- `nature_contribution_pp` — categorie `pricing`, value `1.00`, type `number`

## Code-wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/types/appSettings.ts` | `tourist_tax_pp_per_day: number` en `nature_contribution_pp: number` toevoegen aan `AppSettingsMap` |
| `src/lib/appSettings.ts` | Fallback-waarden: `tourist_tax_pp_per_day: 2.58`, `nature_contribution_pp: 1.00` |
| `src/components/customer-portal/PriceSummaryCard.tsx` | Nieuwe prop `numberOfDays`, twee extra orderregels vóór de coördinatiefee, opnemen in totaalberekening (0% BTW) |
| `src/components/customer-portal/CompactBillingSection.tsx` | `numberOfDays` prop doorgeven |
| `src/components/customer-portal/MobileProgramView.tsx` | `numberOfDays` prop doorgeven |
| `src/components/customer-portal/ProgramSidebar.tsx` | `numberOfDays` prop doorgeven |

De `numberOfDays` wordt berekend uit `program.selected_dates.length` op de aanroepende plekken.

### Weergave in de kostenspecificatie

```text
  Toeristenbelasting (20 pers. × 3 dgn)    € 154,80
  Natuurbijdrage Staatsbosbeheer (20 pers.) €  20,00
  Coördinatie & handling fee                € 100,00
```

Beide worden bij 0% BTW-tarief geboekt (geen BTW op heffingen). Ze tellen mee in het totaal incl. BTW en per-persoon bedrag.

