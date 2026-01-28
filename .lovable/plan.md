
# Plan: Pro Forma Commissie Overzicht in Admin Commissie Beheer

## Probleem

De huidige Admin Commissie pagina toont alleen items die al gefactureerd zijn (`invoiced_number IS NOT NULL`). Dit betekent dat:
- Items die nog uitgevoerd moeten worden (zoals Hotel Seeduyn booking voor juni 2026) niet zichtbaar zijn
- De admin geen overzicht heeft van **verwachte commissies** voor lopende projecten
- Er geen "pro forma" inzicht is in toekomstige commissie-inkomsten

## Oplossing

Uitbreiden van de Admin Commissie pagina met een nieuwe filter/tab "Verwacht" die:
1. Alle items toont waar commissie te verwachten is (nog niet gefactureerd door partner)
2. De verwachte commissie berekent o.b.v. geoffreerd bedrag excl. BTW
3. Een pro forma overzicht biedt per partner met geplande projectdata

## Nieuwe Status Filter

| Filter | Beschrijving |
|--------|--------------|
| **Verwacht** (nieuw) | Items met geoffreerd bedrag, nog niet gefactureerd |
| Te factureren | Partner heeft gefactureerd, BV moet commissie factureren |
| Gefactureerd | Commissie gefactureerd door BV |
| Betaald | Commissie ontvangen |

## Technische Wijzigingen

### 1. Edge Function: `get-admin-commissions`

Uitbreiden met nieuwe status `expected` die haalt:

```typescript
// ACTIVITEITEN - Verwacht
if (statusFilter === "expected") {
  const { data: items } = await adminClient
    .from("program_request_items")
    .select(`*, program_requests!inner(...)`)
    .in("status", ["confirmed", "accepted", "executed"])
    .is("invoiced_number", null)
    .not("quoted_price", "is", null);
    
  // Bereken verwachte commissie per item
  for (const item of items) {
    const vatRate = 21;
    const amountExclVat = item.quoted_price / (1 + vatRate / 100);
    const commissionRate = item.commission_percentage ?? partner.commission_percentage;
    item.expected_commission = amountExclVat * (commissionRate / 100);
    item.amount_excl_vat = amountExclVat;
  }
}

// LOGIES - Verwacht
if (statusFilter === "expected") {
  const { data: quotes } = await adminClient
    .from("accommodation_quotes")
    .select(`*, accommodation_requests!inner(...)`)
    .eq("status", "selected")
    .is("invoiced_number", null);
    
  // Bereken verwachte commissie per quote
  for (const quote of quotes) {
    const vatRate = quote.vat_rate ?? 9;
    const amountExclVat = quote.price_includes_vat 
      ? quote.price_total / (1 + vatRate / 100)
      : quote.price_total;
    const commissionRate = quote.commission_percentage ?? partner.accommodation_commission_percentage ?? 10;
    quote.expected_commission = amountExclVat * (commissionRate / 100);
    quote.amount_excl_vat = amountExclVat;
  }
}
```

### 2. UI: AdminCommissions.tsx

Nieuwe weergave voor "Verwacht" status met pro forma stijl:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Commissie Beheer                                              [Vernieuwen]    │
│  Beheer partner commissies en facturatie                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ 🕐 Verwacht     │  │ € Totaal verwacht│  │ 📅 Komende maand│                │
│  │ 2               │  │ € 349,62        │  │ 1 project       │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │
│                                                                                 │
│  [Verwacht ▼] [Te factureren] [Gefactureerd] [Betaald]                         │
│                                                                                 │
│  ════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  📋 VOORLOPIGE COMMISSIE OPGAVE                                                │
│  ════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🏨 Hotel Seeduyn                                            € 344,04   │   │
│  │  hotel@seeduyn.nl • KvK: 12345678                                       │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │  Type     │ Naam            │ Klant         │ Datum      │ Excl. BTW   │   │
│  │  ─────────┼─────────────────┼───────────────┼────────────┼─────────────│   │
│  │  🏠 Logies│ Hotel Seeduyn   │ Jan de Vries  │ 15-17 jun  │ € 3.440,37  │   │
│  │           │ Test Bedrijf BV │               │ 2026       │ Comm: 10%   │   │
│  │           │                 │               │            │ = € 344,04  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  🚴 Vlieland Outdoor Center                                    € 5,58   │   │
│  │  info@vlielandoutdoor.nl • KvK: 87654321                                │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │  🏃 Activiteit │ E-bike Tour   │ Jan de Vries  │ 15 jun   │ € 37,19    │   │
│  │                │ Test Bedrijf  │               │ 2026     │ Comm: 15%  │   │
│  │                │               │               │          │ = € 5,58   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ════════════════════════════════════════════════════════════════════════════  │
│  TOTAAL VERWACHTE COMMISSIE                                       € 349,62    │
│  ════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Summary Cards Aanpassen

Voor "Verwacht" filter andere metrics tonen:

| Card | Inhoud |
|------|--------|
| Verwacht | Aantal items met verwachte commissie |
| Totaal verwacht | Som van alle berekende verwachte commissies |
| Komende maand | Items met uitvoerdatum binnen 30 dagen |

### 4. Berekening Logic (Client + Server)

Dezelfde BTW-berekening als in Partner Portal:

```typescript
// Activiteiten: 21% BTW
const activityAmountExclVat = quotedPrice / 1.21;
const activityCommission = activityAmountExclVat * (commissionPercentage / 100);

// Logies: 9% BTW (of specifiek vat_rate)
const vatRate = quote.vat_rate ?? 9;
const accommodationAmountExclVat = priceIncludesVat 
  ? priceTotal / (1 + vatRate / 100)
  : priceTotal;
const accommodationCommission = accommodationAmountExclVat * (commissionPercentage / 100);
```

## Bestanden te Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/get-admin-commissions/index.ts` | Nieuwe "expected" status met commissie berekening |
| `src/pages/admin/AdminCommissions.tsx` | Nieuwe filter optie, aangepaste UI voor pro forma weergave |

## Extra Features

1. **Pro forma PDF export**: Optie om een voorlopige commissie-opgave te downloaden per partner
2. **Tijdlijn indicator**: Wanneer project gepland staat (vandaag, deze week, deze maand, later)
3. **Status indicator**: Of klant al akkoord heeft gegeven (terms_accepted_at)
4. **Quick link**: Direct naar project detail pagina

## Implementatie Volgorde

1. Edge function uitbreiden met "expected" status query
2. Client-side berekening van verwachte commissie
3. UI aanpassen met nieuwe filter optie
4. Pro forma styling toevoegen
5. Summary cards updaten voor verwacht-modus
