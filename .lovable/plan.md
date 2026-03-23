

## Plan: Prijsconfiguratie "Per persoon per dag" toevoegen

### Overzicht

Een nieuw prijstype `per_person_per_day` toevoegen aan bouwstenen. Dit type vermenigvuldigt de eenheidsprijs met zowel het aantal personen als het aantal dagen.

### Aanpassingen

**1. Database migratie — enum uitbreiden**

```sql
ALTER TYPE building_block_price_type ADD VALUE 'per_person_per_day';
```

**2. `src/types/buildingBlock.ts` — TypeScript type + labels**

- `BuildingBlockPriceType` uitbreiden met `"per_person_per_day"`
- `priceTypeLabels`: nieuw entry `per_person_per_day: "Per persoon per dag"`
- `formatPriceNote`: case toevoegen → `"p.p.p.d."`
- `calculateIndicativeTotal`: case toevoegen → `price_adult * numberOfPeople` (dagen niet bekend op bouwsteenniveau, dus zelfde als per_person als indicatie)

**3. `src/lib/portalPricing.ts` — prijsberekening**

- `isPerPersonItem`: ook `per_person_per_day` opnemen (wordt vermenigvuldigd met personen)
- Nieuwe helper `isPerDayItem` of de `getItemLineTotal` aanpassen zodat bij `per_person_per_day` ook het aantal dagen wordt meegenomen
- Aantal dagen afleiden uit het programma: `selected_dates.length` of `numberOfDays` parameter toevoegen aan functies

**4. Admin formulieren — select opties**

- `BuildingBlockSheet.tsx` (regel 672-674): `<SelectItem value="per_person_per_day">Per persoon per dag</SelectItem>` toevoegen
- Zod schema (regel 75): enum uitbreiden
- Kind/huisdier secties ook tonen voor dit type (zelfde als `per_person`)

**5. `AdminQuotePriceEditor.tsx` — weergave**

- Props type uitbreiden met `"per_person_per_day"`
- Label tonen als `"p.p.p.d."` en totaalberekening aanpassen (personen × dagen)
- `numberOfDays` prop toevoegen

**6. Overige bestanden die `price_type` verwerken**

- `AdminAddActivitySheet.tsx`: price_type doorvoeren
- `AdminAiProgramDialog.tsx`, `ApplyTemplateDialog.tsx`: al generiek, werkt automatisch
- `PartnerBlockSheet.tsx`: select opties + zod uitbreiden
- `PartnerItemSheet.tsx`, `PartnerItemCard.tsx`: display label aanpassen
- `CheckoutContactForm.tsx`, `RequestFormModal.tsx`: al generiek
- `PriceSummaryCard.tsx`: multiplier aanpassen (personen × dagen)
- `AccommodationWizard.tsx`: label `"p.p.p.d."` toevoegen

**7. Aantal dagen beschikbaar maken in prijsberekening**

Het aantal dagen wordt afgeleid uit `selected_dates` (array van datums op `program_requests`). In de portal/admin detail is dit al beschikbaar. De `portalPricing` functies krijgen een optionele `numberOfDays` parameter; als die niet meegegeven wordt, valt het terug op 1.

### Samenvatting

- 1 database migratie (enum value)
- ~12 bestanden aanpassen voor type, labels, berekeningen en UI

