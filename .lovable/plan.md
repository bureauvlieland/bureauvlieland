## Wat is er nog open

In de vorige rondes zijn de database-velden, de gecentraliseerde prijslogica, de admin-workflow en de partner-banners afgerond. Twee onderdelen staan nog open:

1. **Klantportaal-UI cues** als de admin een prijs aanpast nadat de klant al akkoord had gegeven (de `customer_approved_at` wordt al gereset, maar er is nog geen visuele uitleg waarom een onderdeel ineens weer "Actie vereist" is).
2. **Geautomatiseerde QA-check** die controleert of admin-, partner- en klantweergave hetzelfde totaalbedrag laten zien per onderdeel — zodat de Trattoria Oliva-discrepantie (€48,95 vs €44,50) niet meer onopgemerkt kan terugkomen.

---

## Deel 1 — Klantportaal: visuele cue bij prijswijziging

### 1a. Helper toevoegen aan `src/lib/portalPricing.ts`

Nieuwe functie `hasOpenAdminPriceChange(item)`:
- `true` als `admin_price_override_updated_at` nieuwer is dan `customer_approved_at` én er eerder al een `customer_approved_at` was, óf
- `true` als `admin_price_override_updated_at` is gezet en `item_quote_status === 'in_afstemming'` ná een eerdere bevestiging.

### 1b. Banner in `CustomerProgramItem.tsx`

Boven de bestaande "Beschikbaar / klik op akkoord"-banner:
- Amber/oranje banner met tekst:
  > "De prijs van dit onderdeel is door Bureau Vlieland aangepast. Bekijk de nieuwe prijs en geef opnieuw uw akkoord."
- Toont oude prijs (doorgestreept) versus nieuwe prijs als beide te bepalen zijn (`quoted_price` snapshot uit history, anders alleen nieuwe prijs).
- Banner verdwijnt zodra klant opnieuw akkoord geeft (`customer_approved_at > admin_price_override_updated_at`).

### 1c. Status-pill in `CustomerProgramItem.tsx`

Naast de bestaande badges een extra pill "Prijs gewijzigd" als `hasOpenAdminPriceChange` true is, zodat de klant ook in de samenvatting/header van het programma direct ziet welke onderdelen heroverweging vragen.

### 1d. Aggregatie in `useCustomerProgram.ts` / `programRequest.ts`

`calculateStatusSummary` krijgt een extra teller `priceChangedCount`. Wordt gebruikt door de status-tegels boven het programma ("X onderdelen wachten op nieuw akkoord vanwege prijsaanpassing").

### 1e. E-mail aan klant bij prijswijziging

Edge function `notify-customer-price-change` (analoog aan de partner-variant uit de vorige ronde):
- Trigger: admin bevestigt in de "prijs forceren / voorstellen"-dialog dat de klant geïnformeerd moet worden.
- Korte mail in formele "u"-stijl met link naar het klantportaal en uitleg dat de prijs is bijgewerkt.
- Logging in `email_log` zodat dossier compleet blijft.

---

## Deel 2 — Geautomatiseerde QA-check op prijsconsistentie

Doel: voorkomen dat admin / partner / klant ooit nog verschillende totalen tonen voor hetzelfde item.

### 2a. Vitest-suite `src/lib/__tests__/portalPricing.consistency.test.ts`

Per itemconfiguratie (per_person, per_person_per_day, on_request, fixed) controleren dat:
- `getDisplayUnitPrice` × `getEffectivePeople` × dagen == `getItemLineTotal`
- `quoted_price` (groepstotaal) altijd wint van `admin_price_override` (unit price)
- `override_people` overschrijft `programPeople` zowel in unit als line total
- Een `admin_price_override` van €X bij Y personen levert in alle drie de helpers hetzelfde groepstotaal.

Dekt expliciet de Trattoria-case: zelfde item, ander `override_people`-veld → unit-prijzen verschillen, maar groepstotaal blijft gelijk.

### 2b. Database-side QA-view `vw_item_price_consistency`

Migratie die een view aanmaakt die per item berekent:
- `admin_total` = afgeleid via dezelfde regels als `portalPricing.ts`
- `quoted_total` = `quoted_price` indien gezet
- `delta` = absoluut verschil

In de admin-omgeving wordt deze view niet zichtbaar gebruikt, maar wel in:

### 2c. Admin-tab "Prijscontrole" (lichtgewicht)

In `AdminRequestDetail.tsx` een kleine sectie onder "Financiën":
- Lijst items waar `delta > 0.01` of waar `hasOpenAdminPriceChange` true is.
- Met directe knop "Synchroniseer naar quoted_price" (zet `quoted_price` gelijk aan berekend totaal en stempel `admin_price_override_updated_at`).

### 2d. CI-vriendelijke run

`bunx vitest run src/lib/__tests__/portalPricing.consistency.test.ts` — geen extra config nodig; integreert met de bestaande build/test-pijplijn.

---

## Bestanden die gewijzigd / aangemaakt worden

```text
src/lib/portalPricing.ts                              (helper toevoegen)
src/lib/__tests__/portalPricing.consistency.test.ts   (nieuw)
src/components/customer-portal/CustomerProgramItem.tsx (banner + pill)
src/hooks/useCustomerProgram.ts                       (priceChangedCount)
src/types/programRequest.ts                           (StatusSummary uitbreiden)
src/pages/admin/AdminRequestDetail.tsx                (Prijscontrole-sectie)
supabase/migrations/<nieuw>.sql                       (vw_item_price_consistency)
supabase/functions/notify-customer-price-change/index.ts (nieuw)
```

Geen breaking changes; alle nieuwe velden zijn additief.

---

## Verificatie na implementatie

1. Project `BV-2603-0003` openen in klantportaal → onderdelen waar de admin de prijs heeft aangepast tonen amber banner + "Prijs gewijzigd"-pill.
2. Klant geeft opnieuw akkoord → banner en pill verdwijnen.
3. Trattoria Oliva-onderdeel: admin / partner / klant tonen exact hetzelfde groepstotaal (Vitest-check + visuele controle).
4. `bunx vitest run src/lib/__tests__/portalPricing.consistency.test.ts` slaagt.