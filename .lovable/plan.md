

## Plan: per_person_per_day prijsberekening fixen in offerte & financieel overzicht

### Probleem
Drie plekken houden geen rekening met `per_person_per_day`:
1. **`AdminQuotePreview.tsx`** — `getItemTotal()` vermenigvuldigt niet met dagen; prijslabel toont alleen "p.p." of "totaal", niet "p.p.p.d."
2. **`AdminInvoicePreview.tsx`** — zelfde `getItemTotal()` probleem
3. **`FinancialOverviewCard.tsx`** — roept `centralLineTotal(item, numberOfPeople)` aan maar geeft `numberOfDays` niet mee (terwijl die als prop beschikbaar is)

### Aanpassingen

**1. `src/pages/admin/AdminQuotePreview.tsx`**
- `getItemTotal()`: voeg `per_person_per_day` toe aan de per-person check, en vermenigvuldig met `request.selected_dates.length`
- Prijslabel (regel ~748): voeg `per_person_per_day` → "p.p.p.d." toe

**2. `src/pages/admin/AdminInvoicePreview.tsx`**
- Zelfde fix in `getItemTotal()`: vermenigvuldig met aantal dagen bij `per_person_per_day`

**3. `src/components/admin/FinancialOverviewCard.tsx`**
- `getLineTotal` wrapper: geef `numberOfDays` door als tweede parameter → `centralLineTotal(item as any, n, days)`
- `formatItemPrice`: toon "p.p.p.d." label bij `per_person_per_day` items
- Alle plekken waar `getLineTotal(item, numberOfPeople)` wordt aangeroepen updaten naar `getLineTotal(item, numberOfPeople, numberOfDays)`

### Geen database-wijzigingen nodig
De `portalPricing.ts` functies ondersteunen `numberOfDays` al correct — het probleem zit puur in de aanroepen.

