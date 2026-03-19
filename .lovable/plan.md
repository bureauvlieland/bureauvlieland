

## Problemen in klantportaal actieknoppen

Er zijn drie problemen zichtbaar in de screenshot:

### 1. Dubbele "Akkoord" knoppen
**Oorzaak**: Bij "Zaalhuur Brouwerij Fortuna" (status `confirmed` + `item_quote_status = "bevestigd"`) matchen twee aparte condities tegelijk:
- Regel 278: quote-mode akkoord (`item_quote_status === "bevestigd"` + niet `customer_approved_at`)
- Regel 299: partner-bevestiging akkoord (`status === "confirmed"` + niet `customer_accepted_at`)

**Fix**: De quote-mode akkoord (regel 278) moet voorrang krijgen. Voeg aan de partner-akkoord conditie (regel 299) toe: `&& !isQuoteMode`, zodat in quote-mode alleen de quote-akkoord knop getoond wordt.

### 2. "Tijd wijzigen" bij pending items
**Oorzaak**: Regel 333 toont "Tijd wijzigen" voor `status === "pending"` — de partner heeft nog niet gereageerd. Het heeft geen zin om dan als klant de tijd te willen wijzigen.

**Fix**: Verwijder `item.status === "pending"` uit de conditie op regel 333. "Tijd wijzigen" moet alleen beschikbaar zijn bij:
- Items die de klant al geaccepteerd heeft (`customer_accepted_at`) — via counter-proposal flow
- Items met status `unavailable` — om een alternatieve tijd voor te stellen

### 3. "Verwijderen" altijd zichtbaar
**Observatie**: De verwijder-knop is altijd zichtbaar, ongeacht status. Dit is mogelijk gewenst (klant kan altijd een item annuleren), maar het kan verwarrend zijn bij reeds bevestigde items. Dit laat ik voor nu ongemoeid tenzij je dit ook wilt aanpassen.

### Wijzigingen

**Bestand: `src/components/customer-portal/CustomerProgramItem.tsx`**

1. **Regel 299** — Voeg `&& !isQuoteMode` toe:
```typescript
{!isQuoteMode && (item.status === "confirmed" || item.status === "alternative") && !item.customer_accepted_at && onAccept && (
```

2. **Regel 320** — Voeg `&& !isQuoteMode` toe (de "Andere tijd" knop hoort bij dezelfde flow):
```typescript
{!isQuoteMode && (item.status === "confirmed" || item.status === "alternative") && !item.customer_accepted_at && onCounterProposal && (
```

3. **Regel 333** — Verwijder `item.status === "pending"` uit de conditie:
```typescript
{(item.status === "unavailable" || item.customer_accepted_at) && !isSelfArranged && (
```

