

## Plan: Extra's consistent doorvoeren in partner-portal en e-mails

### Probleem
Logies-extra's (bijv. "Ontbijt" €139,50) worden wél getoond in het klantportaal, maar ontbreken in:
1. **E-mail naar partner** (offerte geaccepteerd) — `select-accommodation-quote`: `price_total` is alleen de logisprijs, extra's niet opgeteld
2. **E-mail naar admin** (nieuwe offerte ontvangen) — `notify-accommodation-quote`: zelfde probleem, totaalprijs mist extra's
3. **Commissieberekening** — `select-accommodation-quote` en `process-completed-items`: commissie wordt berekend over `price_total` zonder extra's
4. **Admin commissie-overzicht** — `get-admin-commissions`: `priceTotal` is alleen `quote.price_total`

### Aanpassingen

**1. `supabase/functions/select-accommodation-quote/index.ts`**
- Na het ophalen van de quote, ook `accommodation_quote_extras` ophalen voor deze `quote_id`
- Extra's totaal optellen bij `price_total` voor:
  - Commissieberekening (regel 183)
  - E-mail template variabele `price_total` (regel 278)
  - Fallback HTML totaalprijs (regel 308)
- Extra's als aparte regels toevoegen aan de e-mail (zowel template variabelen als fallback HTML)

**2. `supabase/functions/notify-accommodation-quote/index.ts`**
- Na het ophalen van de quote, ook `accommodation_quote_extras` ophalen
- Extra's totaal optellen bij de weergegeven totaalprijs (regel 98)
- Extra's als regels toevoegen in de offerte-e-mail aan de admin/klant
- Template variabele `price_total` updaten naar grand total

**3. `supabase/functions/process-completed-items/index.ts`**
- Bij commissieberekening voor logies (regel 249): ook extra's ophalen en optellen bij `priceTotal`

**4. `supabase/functions/get-admin-commissions/index.ts`**
- Bij het mappen van accommodation items (regel 197): extra's ophalen en optellen bij `priceTotal`

### Technische aanpak (herbruikbaar)
Maak een gedeelde helper functie in de edge functions:
```typescript
// In elke edge function die het nodig heeft:
async function getQuoteGrandTotal(supabase, quoteId: string, basePrice: number) {
  const { data: extras } = await supabase
    .from('accommodation_quote_extras')
    .select('unit_price, quantity, pricing_type')
    .eq('quote_id', quoteId);
  
  const extrasTotal = (extras || []).reduce((sum, e) => 
    sum + (e.pricing_type === 'fixed' ? e.unit_price : e.unit_price * e.quantity), 0);
  
  return { grandTotal: basePrice + extrasTotal, extrasTotal, extras: extras || [] };
}
```

### Geen database-wijzigingen nodig
De `accommodation_quote_extras` tabel bestaat al; de data is al correct opgeslagen.

