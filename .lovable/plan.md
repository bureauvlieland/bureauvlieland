## Fix: foutieve "Prijs gewijzigd" / "Geef opnieuw uw akkoord" banner

### Wat de klant ziet
Bij de Zeehondentocht in BV-2602-0004 staat een amber waarschuwing:
> ⚠️ Prijs gewijzigd
> ⚠️ De prijs van dit onderdeel is door Bureau Vlieland aangepast. Geef opnieuw uw akkoord op de nieuwe prijs.

### Wat er werkelijk aan de hand is (database)
Voor beide Zeehondentocht-items van BV-2602-0004:
- `admin_price_override = 32.50`, `admin_price_override_updated_at = 01-04-2026` (initiële prijs)
- `quoted_price = NULL`, `quoted_at = NULL` (er is **nooit** een eerdere prijs geweest)
- `partner_price_change_acknowledged_at = NULL`
- `customer_approved_at = NULL`, `customer_accepted_at = NULL`
- `status = pending`, `skip_partner_notification = true` (nog niet eens naar partner gestuurd)

Dit is dus **de eerste prijs** voor dit onderdeel — geen wijziging.

### Bug (twee samenhangende oorzaken)

**1. `hasOpenAdminPriceChange()` in `src/lib/portalPricing.ts`** geeft een false-positive:
```ts
const ack = item.partner_price_change_acknowledged_at ?? item.quoted_at;  // null
const timestampOpen = !ack ? true : ...;                                  // → true
// daarna: bedragvergelijking wordt overgeslagen want quoted_price = null
return true;
```
De functie behandelt elke initiële admin-prijs als een "wijziging", ook als er nooit een vorige prijs was om tegen af te zetten en de partner het ook nog nooit heeft gezien.

**2. `CustomerProgramItem.tsx` toont badge + amber banner los van item-status.** De banner staat los van `needsCustomerAction` (die wel filtert op `status confirmed/alternative`), dus ook bij `pending` items waar de klant geen akkoord-knop heeft, krijgt hij toch de amber waarschuwing — een melding zonder bijbehorende actie.

### Voorgestelde fix

**A. `src/lib/portalPricing.ts` — `hasOpenAdminPriceChange`**

Voeg vroege exit toe: als er géén ack-moment is (`partner_price_change_acknowledged_at` én `quoted_at` zijn beide NULL) **én** geen `quoted_price` om tegen af te zetten, dan is dit per definitie een initiële prijsstelling, geen wijziging:

```ts
if (!ack && item.quoted_price == null) return false;
```

Effect: voor onze Zeehondentocht (en alle items die nog nooit door een partner gequoteerd zijn) verdwijnt de "Prijs gewijzigd"-status. Zodra de partner ooit `quoted_price` invult of `quoted_at` zet, gaat de normale logica weer aan: een latere admin-aanpassing die afwijkt van die quote toont alsnog de banner.

**B. (Optioneel, defensief) `CustomerProgramItem.tsx`**

Banner & badge alleen tonen wanneer item-status ook akkoord-actie toelaat:
```ts
const priceChangeNeedsAttention =
  !isSelfArranged
  && !item.customer_accepted_at
  && (item.status === "confirmed" || item.status === "alternative")
  && hasOpenAdminPriceChange(item, numberOfPeople ?? 1, selectedDates.length || 1);
```
Zo voorkomen we dat een toekomstige edge-case alsnog een waarschuwing zonder akkoord-knop toont op `pending` items.

### Bestanden

- `src/lib/portalPricing.ts` — vroege return in `hasOpenAdminPriceChange`
- `src/components/customer-portal/CustomerProgramItem.tsx` — extra status-filter op `priceChangeNeedsAttention`

### Side-effects / regressie-check

- `getDisplayUnitPrice` blijft ongewijzigd: admin override blijft de getoonde prijs.
- Andere portals (admin, partner) gebruiken dezelfde helper. Voor partner-portal betekent dit dat een initiële admin-prijs op een nog niet gequoteerd item geen "prijs gewijzigd" badge meer geeft — dat is gewenst gedrag (partner heeft niets gewijzigd).
- Items waar de partner ooit een `quoted_price` had en admin daarna corrigeert, blijven gewoon de banner tonen.

Mag ik deze twee aanpassingen doorvoeren?