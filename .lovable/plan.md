## Probleem

**1. "Prijs gewijzigd" / amber banner staat bij álle items**
In `CustomerProgramItem.tsx` (regel 87-89) wordt `priceChangeNeedsAttention` berekend op basis van een ruwe vergelijking tussen `admin_price_override_updated_at` en `customer_approved_at`. Daardoor:
- triggert het ook als de admin het veld ooit heeft aangeraakt zónder werkelijke prijswijziging,
- triggert het ook als de partner de wijziging al heeft geaccepteerd (= `quoted_price` is gelijk aan `admin_price_override`-totaal),
- triggert het ook nadat de klant het al opnieuw heeft geaccordeerd in een eerdere ronde.

In de screenshot zie je "Strandspektakel" met badge **Prijs gewijzigd** + amber banner + groene check "U hebt akkoord gegeven op dit voorstel" — drie tegenstrijdige signalen tegelijk.

**2. Banner zegt "Bekijk de nieuwe prijs hieronder"**
De prijs staat juist in de header bóven de banner. Tekst klopt niet meer met de UI-volgorde.

**3. "(voorlopig)" verschijnt onlogisch in kostenspecificatie**
In `PriceSummaryCard.tsx` regel 111-113:
```ts
const hasOpenChange = hasOpenAdminPriceChange(item);
const hasQuotedPrice = item.quoted_price != null && !hasOpenChange;
const isPreliminary = !hasQuotedPrice && item.admin_price_override != null;
```
Hierdoor krijgt élk item met een openstaande admin-prijswijziging het label **(voorlopig)**, ook als de partner al een definitieve `quoted_price` had. Dat is verwarrend: vanuit de klant gezien is de admin-prijs juist leidend (zie eerder vastgelegde regel) — niet "voorlopig". Echt voorlopig hoort alleen te zijn: er is *nog nooit* een door de partner bevestigde prijs geweest.

## Oplossing

### A. `priceChangeNeedsAttention` herijken op één bron van waarheid
In `src/components/customer-portal/CustomerProgramItem.tsx`:
- Vervang de eigen tijdstempel-vergelijking door `hasOpenAdminPriceChange(item)` uit `@/lib/portalPricing`. Dat is dezelfde helper die `getDisplayLineTotal/UnitPrice` gebruiken om admin-overschrijving leidend te maken — zo zijn signaal en weergave gegarandeerd consistent.
- Resultaat: badge **Prijs gewijzigd**, amber banner én knop-label "Akkoord met nieuwe prijs" verschijnen alleen als er werkelijk een onbevestigde admin-wijziging openstaat.

### B. Bannertekst corrigeren
- Verwijder "hieronder" → nieuwe tekst:
  > "De prijs van dit onderdeel is door Bureau Vlieland aangepast. Geef opnieuw uw akkoord op de nieuwe prijs."
- De prijs staat al duidelijk in de header (groen) plus de excl. BTW-regel daaronder; geen extra UI-aanpassing nodig.

### C. "(voorlopig)" beperken tot écht voorlopige items
In `src/components/customer-portal/PriceSummaryCard.tsx`:
- `isPreliminary` betekent voortaan: "er is nog geen door de partner bevestigde groepsprijs (`quoted_price == null`) — admin heeft een richtprijs ingevuld". Dus:
  ```ts
  const isPreliminary = item.quoted_price == null && item.admin_price_override != null;
  ```
- De aparte logica voor open admin-wijzigingen blijft via `getDisplayLineTotal` (die toont automatisch het admin-totaal). Alleen het label "(voorlopig)" verdwijnt voor items waar wél een eerder bevestigde `quoted_price` bestond.
- Bijwerken van de "Pending notice" (regel 479-492): `hasPreliminaryItems` blijft werken volgens deze nieuwe definitie.

### D. QA-uitbreiding
Aan `src/lib/__tests__/portalPricing.consistency.test.ts` toevoegen:
1. Item met `quoted_price` + `admin_price_override` waar `partner_price_change_acknowledged_at >= admin_price_override_updated_at` ⇒ `hasOpenAdminPriceChange = false` ⇒ in UI géén "Prijs gewijzigd"-state.
2. Item zonder `quoted_price`, met `admin_price_override` ⇒ "voorlopig" terecht.
3. Item met `quoted_price` + open admin-wijziging ⇒ admin-totaal wint in display, maar item is **niet** "voorlopig".

(De tests zelf raken alleen `portalPricing` helpers; voor de UI-conditie volstaat documentatie van de nieuwe regel in de testcase-naam.)

### E. Memory-update
[Pricing Rules](mem://business/pricing-and-vat-rules) aanvullen:
- Banner "Prijs gewijzigd" en label "(voorlopig)" zijn twee verschillende signalen:
  - **Prijs gewijzigd** ⇔ `hasOpenAdminPriceChange()` (open admin-update wachtend op klant/partner ack).
  - **(voorlopig)** ⇔ er is nog geen door de partner bevestigde `quoted_price`.

## Niet in scope
- Geen DB-wijzigingen.
- Geen wijzigingen aan partner-portaal of admin-overrides.
- Geen wijziging aan totaalberekening (admin-override blijft leidend voor klanttotalen).
