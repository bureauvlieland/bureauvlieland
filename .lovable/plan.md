# Uitgesloten kostenposten ook respecteren op de klantpagina

## Wat er misgaat

De uitsluiting is wél goed opgeslagen. Voor BV-2608-0001 staan alle vier posten (toeristenbelasting, natuurbijdrage, coördinatiefee, opslag centrale facturatie) als uitgesloten in de database, en het admin-financieel overzicht rekent er dan ook niet meer mee.

Het klantportaal negeert die uitsluiting echter volledig: de kostenspecificatie berekent de vier posten altijd opnieuw uit de algemene instellingen (tarief × personen × dagen) en weet niet dat er per project uitsluitingen bestaan. Daarom staan de regels er nog, en is het klanttotaal (€1.431,66) hoger dan het admintotaal (€1.004,00). Publiceren verandert hier niets aan — het is geen sync-probleem maar een rekenfout in de klantweergave.

## Wat we bouwen

1. **Kostenspecificatie klantportaal** — de vier automatische posten worden alleen nog getoond en meegerekend als ze voor dit project niet zijn uitgesloten. Uitgesloten posten verdwijnen uit de regels, uit de BTW-opbouw, uit het totaal en uit het "per persoon incl. BTW"-bedrag.

2. **Toelichtingsblokken in de zijbalk** — de uitlegkaartjes over toeristenbelasting en natuurbijdrage verdwijnen wanneer die post is uitgesloten, zodat de klant geen kosten uitgelegd krijgt die niet in rekening worden gebracht.

3. **Doorgeven van de projectinstelling** — de uitsluitingslijst wordt vanuit het opgehaalde project doorgegeven aan alle klantweergaven (desktop, mobiel, facturatietab), zodat er één waarheid is voor admin én klant.

4. **Tests** — nieuwe tests die vastleggen dat elke afzonderlijke uitsluiting de bijbehorende regel en het totaal verlaagt, dat de BTW-verdeling meebeweegt, en dat zonder uitsluitingen het gedrag exact gelijk blijft aan nu.

## Technische details

- Bron van waarheid: kolom `excluded_fees` (text[]) op `program_requests`, met de bestaande sleutels uit `src/lib/excludedFees.ts` (`tourist_tax`, `nature_contribution`, `coordination_fee`, `central_surcharge`). De helper `isFeeExcluded` wordt hergebruikt.
- `src/components/customer-portal/PriceSummaryCard.tsx`: nieuwe prop `excludedFees?: string[]`; in de `summary`-berekening worden `touristTax`, `natureContribution`, `coordinationFee` en `centralSurcharge` op 0 gezet bij uitsluiting, de bijbehorende regels worden niet gerenderd, en de posten vallen uit `addVat`/`addZeroVat` en uit `grandTotalInclVat`. De prop gaat mee in de `useMemo`-deps.
- `src/components/customer-portal/ProgramSidebar.tsx`: zelfde prop; de twee uitlegblokken worden conditioneel gerenderd.
- Doorgeven via `CustomerProgram.tsx` → `DesktopProgramView.tsx` / `MobileProgramView.tsx` → `ProgramSidebar` en `CompactBillingSection.tsx` → `PriceSummaryCard`. `get-customer-program` levert het veld al mee (`select *`), dus er is geen backend-wijziging nodig.
- `src/lib/invoiceTotals.ts`: `InvoiceTotalsRequestLike` krijgt `excluded_fees?: string[] | null` zodat de doorgifte naar `calculateAdminInvoicingTotals` (die de uitsluiting al ondersteunt) ook typematig klopt.
- Tests in `src/components/customer-portal/__tests__/` of `src/lib/__tests__/` op de samenvattingsberekening, plus behoud van de bestaande suite.
