

# Fix: Template laden met stale closure probleem

## Probleem
De `loadFromTemplate` functie in CartContext geeft `addToCart` door aan de template loader, maar `addToCart` heeft een stale closure over `cartItems`. Na `clearCart()` (die `setCartItems([])` doet) bevat de closure van `addToCart` nog de **oude** cart items. Hierdoor:
- Als de oude cart al een ferry bevat, denkt `addToCart` dat het een duplicaat is en retourneert `false`
- De ferry en fiets worden niet toegevoegd
- De `useEffect` in ProgrammaSamenstellen probeert ze later alsnog toe te voegen, maar met mogelijke timing-issues

## Oplossing
Bypass `addToCart` in `loadFromTemplate`. Bouw de volledige cart items array direct op in de `loadFromTemplate` callback en zet alles in één keer via `setCartItems`.

### `src/contexts/CartContext.tsx` — `loadFromTemplate` herschrijven

In plaats van `loadTemplateToCart` met cart-functies aan te roepen, direct de state opbouwen:

```typescript
const loadFromTemplate = useCallback((
  template: ProgramTemplate,
  startDate: Date,
  numberOfPeople: number
) => {
  // 1. Build dates array
  const dates: Date[] = [];
  for (let i = 0; i < template.duration_days; i++) {
    dates.push(addDays(startDate, i));
  }

  // 2. Build cart items - start with mandatory blocks (no preferredTime)
  const lastDay = Math.max(0, template.duration_days - 1);
  const newItems: CartItemDetail[] = [
    { blockId: "boot-enkel-heen", preferredTime: null, notes: "", dayIndex: 0 },
    { blockId: "boot-enkel-terug", preferredTime: null, notes: "", dayIndex: lastDay },
    { blockId: "fiets-huur", preferredTime: null, notes: "", dayIndex: 0 },
  ];

  // 3. Add template items (skip mandatory block IDs)
  if (template.items) {
    const sorted = [...template.items].sort(...);
    for (const item of sorted) {
      if (SKIP_SET.has(item.block_id)) continue;
      if (newItems.some(i => i.blockId === item.block_id)) continue;
      newItems.push({
        blockId: item.block_id,
        preferredTime: item.preferred_time || null,
        notes: item.notes || "",
        dayIndex: item.day_index,
      });
    }
  }

  // 4. Set all state at once — no stale closures
  setCartItems(newItems);
  setSelectedDates(dates);
  setNumberOfPeople(numberOfPeople);
  setManualOrder(false);
}, [setNumberOfPeople]);  // minimal deps, no stale closure risk
```

### `src/lib/templateLoader.ts`
Geen wijzigingen nodig — de functie `loadTemplateToCart` blijft beschikbaar voor eventueel ander gebruik, maar wordt niet meer aangeroepen vanuit `loadFromTemplate`.

### Samenvatting
- **1 bestand**: `src/contexts/CartContext.tsx`
- **Kern**: Direct state opbouwen i.p.v. stapsgewijze `addToCart` calls met stale closures
- Ferry + fiets altijd aanwezig, zonder vooringestelde tijd

