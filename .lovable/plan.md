## Wat gaat er mis

### 1. Concrete data-bug die je in de screenshot ziet
Item "Vliehors Expres" (12 pers., €4.248) heeft in de database:
- `price_type = per_person`
- `admin_price_override = 354,00`
- 12 personen → 354 × 12 = **€4.248** (= €29,50 × 12 × 12 = de som die jij beoogde voor totaal)

Iemand heeft hier een **totaalbedrag** ingevuld terwijl het veld als **per persoon** geconfigureerd stond. De UI berekent dan keurig 354 × 12. Dat is een UX-valkuil die we structureel moeten dichten.

### 2. Structurele inconsistenties (meerdere plekken berekenen prijzen zelf)
De centrale helpers in `src/lib/portalPricing.ts` (`getDisplayLineTotal`, `getDisplayUnitPrice`) worden niet overal gebruikt. Op deze plekken wordt opnieuw met `× personen` gerekend — sommige negeren de dagvermenigvuldiging voor `per_person_per_day`:

| Bestand | Probleem |
|---|---|
| `PartnerItemSheet.tsx` (r. 165, 326, 504–540) | Eigen berekening; mist `× dagen` voor p.p.p.d. |
| `PartnerItemCard.tsx` (r. 166–183) | Idem, mist dagen |
| `supabase/functions/notify-partner-price-change/index.ts` | Mailt een verkeerd totaal voor p.p.p.d. |
| `supabase/functions/notify-customer-price-change/index.ts` | Idem |
| `AdminAddActivitySheet.tsx` | Geen `price_type`-keuze in UI; neemt blind `price_adult` over |
| `AdminEditActivitySheet.tsx` | Geen `price_type`-keuze; geen live-totaal preview |
| `templateLoader.ts` (`calculateTemplatePrice`) | Vermenigvuldigt altijd × personen, ook voor `total`-blokken |

### 3. UX die de bug uit (1) mogelijk maakt
- Bij **toevoegen** van een activiteit (`AdminAddActivitySheet`) is er geen keuze tussen p.p. / p.p.p.d. / totaal — de admin ziet enkel "Prijs voor klant (€)" en weet dus niet of zijn invoer × personen gaat.
- Bij **bewerken** (`AdminEditActivitySheet`) ontbreekt diezelfde keuze + preview.
- Alleen de "Prijsaanpassing"-popover (`AdminQuotePriceEditor`) heeft wél een prijstype-selector + live totaal — daar gaat het goed.

---

## Wat ik ga aanpassen

### A. Eén centrale berekening voor álle portals
1. `PartnerItemSheet.tsx` & `PartnerItemCard.tsx`: vervang de drie eigen `× effectivePeople`-blokken door `getDisplayLineTotal(item, people, days)` en `getDisplayUnitPrice(item, people)` uit `portalPricing.ts`. Toelichting (`€X p.p.p.d. × Y personen × Z dagen`) wordt afgeleid uit `isPerPersonItem` / `isPerDayItem`.
2. `notify-partner-price-change` & `notify-customer-price-change` edge functions: voeg dezelfde helper toe (TS-port in een gedeelde `_shared/pricing.ts`) en bereken `newTotal` daarmee, inclusief dagen.
3. `templateLoader.calculateTemplatePrice`: gebruik `price_type` om wél/niet × personen te doen (en `× dagen` voor p.p.p.d.).

### B. UX-guards in de admin-invoer
4. `AdminAddActivitySheet`: voeg een `price_type`-selector toe (per persoon / per persoon per dag / totaal — voorgevuld vanuit de bouwsteen) en toon onder het prijsveld een live-berekend totaal ("Totaal: € X voor Y personen × Z dagen"). Sla de gekozen `price_type` mee op bij het inserten.
5. `AdminEditActivitySheet`: zelfde toevoeging — selector + live preview, en `price_type` mee opslaan in `updateData`.
6. Validatie in beide sheets: als `price_type = per_person` én bedrag > €500, toon een waarschuwing "Weet je zeker dat dit een prijs per persoon is en geen totaalbedrag?". Geen blokkering, alleen een herinnering.

### C. Eenmalige correctie van de zichtbare data-bug
7. Het specifieke item `9429bbdf-...` ("Vliehors Expres" 12p, €4.248): laten zoals het is — admin moet via de nieuwe UI bevestigen of het 354 totaal of 29,50 p.p. moet zijn. Niet automatisch corrigeren (we weten de intentie niet zeker en er is geen quoted_price).

### D. Test-uitbreiding
8. `portalPricing.consistency.test.ts` uitbreiden met:
   - p.p.p.d.-totaal in partner-portal en mail (admin override).
   - templateLoader: total-block telt 1×, p.p.-block telt × personen.

---

## Wat ik níet aanraak
- De databaseschema's en triggers (alleen UI/lib).
- `quoted_price`-logica (die werkt correct: het IS al een groepstotaal).
- De `Synchroniseer`-knop (logica klopt — neemt `price_adult` 1-op-1 over en respecteert `quoted_price`).

## Bestanden die ik wijzig
- `src/lib/portalPricing.ts` (kleine extractie van label-helpers)
- `src/components/partner-portal/PartnerItemSheet.tsx`
- `src/components/partner-portal/PartnerItemCard.tsx`
- `src/components/admin/AdminAddActivitySheet.tsx`
- `src/components/admin/AdminEditActivitySheet.tsx`
- `src/lib/templateLoader.ts`
- `supabase/functions/_shared/pricing.ts` (nieuw)
- `supabase/functions/notify-partner-price-change/index.ts`
- `supabase/functions/notify-customer-price-change/index.ts`
- `src/lib/__tests__/portalPricing.consistency.test.ts`
