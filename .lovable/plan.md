## Probleem

**1. Admin overzicht toont "Nieuwe prijs (wacht op partner)" / klant ziet "Prijs gewijzigd" bij ongewijzigde prijzen**
Voorbeeld Strandspektakel: admin- en partnerprijs zijn beide €1.072,50 — toch staan badges, doorgehaalde oude prijs en banners aan. Oorzaak: `hasOpenAdminPriceChange()` kijkt alleen naar timestamps. Een eerdere "Synchroniseer"-actie (`AdminRequestDetail.tsx` regel 2022) zet `admin_price_override_updated_at = now()` zonder dat er feitelijk iets veranderde in de bedragen. Vanaf dat moment ziet de hele keten een "openstaande wijziging".

**2. Partner-portaal: items die om bevestiging vragen staan op tabblad "Akkoord" i.p.v. "Actie nodig"**
`PartnerUnifiedList.filterItem` filtert puur op `status` (`pending`, `counter_proposed`, …). Items met status=`confirmed` of `accepted` waarvoor de partner nog een nieuwe admin-prijs moet acknowledgen vallen daardoor in het "Akkoord"-tabblad. De partner ziet pas in het detail-sheet dat er actie nodig is.

## Oplossing

### A. `hasOpenAdminPriceChange` hardener — vergelijk ook bedragen
`src/lib/portalPricing.ts`:
- Naast de timestamp-check ook controleren of het **effectieve admin-totaal** materieel verschilt van `quoted_price` (>€0,01). Als ze identiek zijn, is er geen open wijziging, óngeacht timestamps.
- Berekening van het admin-totaal hergebruikt bestaande logica (`isPerPersonItem`, `isPerDayItem`, `getEffectivePeople`). Voor `total` price_type is `admin_price_override` zelf het totaal; voor `per_person`/`per_person_per_day` vermenigvuldigen met effectieve mensen/dagen. **Belangrijk**: de helper moet hiervoor optioneel `programPeople` + `numberOfDays` kunnen ontvangen. Zonder die context (oude callers) val terug op pure timestamp-vergelijking, met context (nieuwe callers in customer/partner/admin views) doe de strengere amount-check.
- Updates in alle plekken die de helper aanroepen om people/days door te geven:
  - `CustomerProgramItem.tsx` (regel 88) — heeft `numberOfPeople` en `selectedDates.length` paraat.
  - `PriceSummaryCard.tsx` (regel 111) — heeft beide al.
  - `AdminRequestDetail.tsx` (regel 2007 + waar `AdminQuotePriceEditor` `hasOpenAdminPriceChange` ontvangt) — heeft `programPeople`/`numberOfDays`.
  - `PartnerItemCard.tsx` (regel 184–187 inline) en `PartnerItemSheet.tsx` (regel 166–170 inline) — vervangen door één gedeelde helper-aanroep.

### B. Partner-portal: "Actie nodig" tab toont ook openstaande prijswijzigingen
`src/components/partner-portal/PartnerUnifiedList.tsx`:
- Op `UnifiedListItem` een nieuw boolean veld `priceChangePending` toevoegen voor activity-items, berekend met de gedeelde `hasOpenAdminPriceChange()` helper.
- `filterItem` aanpassen:
  - `action` → óók `true` als `priceChangePending`.
  - `in_progress` en `accepted` → `false` als `priceChangePending` (anders telt het item dubbel).
- `getUrgencyScore` of een lichte visuele indicator (badge "Nieuwe prijs") toevoegen aan de listrow zodat de partner direct ziet waarom het in "Actie nodig" staat. Hergebruik bestaande badge-styling (amber).
- `actionCount` op `PartnerDashboard.tsx` baseert op dezelfde `filterItem`-logica, dus telt automatisch mee.

### C. QA-uitbreiding `portalPricing.consistency.test.ts`
Nieuwe testcases:
1. `quoted_price = 1072.50`, `admin_price_override = 32.50` (per_person), `override_people = 33`, `admin_price_override_updated_at` recent, géén ack → admin-totaal = 1072,50 = quoted_price → `hasOpenAdminPriceChange(item, 33) === false`.
2. Zelfde, maar admin override naar €33 → totaal 1089 ≠ 1072,50 → `true`.
3. Backwards compat: aanroep zónder `programPeople` blijft op timestamp-only werken (oude tests blijven groen).

### D. Memory-update
[Pricing Rules](mem://business/pricing-and-vat-rules) aanvullen:
> "Prijs gewijzigd" / "Nieuwe prijs (wacht op partner)" / `priceChangePending` triggeren alleen wanneer `admin_price_override_updated_at > ack` ÉN het effectieve admin-totaal materieel (>€0,01) verschilt van `quoted_price`. Pure timestamp-aanrakingen (bv. via Synchroniseer-knop) tellen niet als wijziging.

## Niet in scope
- Geen DB-migraties.
- Geen aanpassing aan de "Synchroniseer"-knop zelf (die mag de timestamp gewoon blijven zetten — de helper filtert dat nu correct uit).
- Geen wijziging aan edge functions; alle logica is client-side.
