
# Plan: Verwachte Commissie Tonen in Partner Facturatie Overzicht

## Probleem

In het Partner Portal "Facturatie Overzicht" wordt bij items "Nog te factureren" alleen het offertebedrag getoond (€3.750,00), maar **niet de verwachte commissie**. Dit maakt het voor partners onduidelijk hoeveel commissie ze uiteindelijk moeten betalen.

De commissie wordt momenteel pas zichtbaar nadat:
1. Het verblijf is afgerond (departure_date verstreken)
2. De pro forma workflow heeft gedraaid
3. Of na handmatige factuurregistratie

## Oplossing

De UI uitbreiden om **direct de verwachte commissie te berekenen en tonen** op basis van het geoffreerde bedrag, nog vóórdat de pro forma workflow loopt.

### BTW-Berekening
- **Activiteiten**: 21% BTW → `bedrag_excl = €500 / 1.21 = €413,22`
- **Logies**: 9% BTW → `bedrag_excl = €3.750 / 1.09 = €3.440,37`
- **Commissie**: `€3.440,37 × 10% = €344,04`

### Visueel Voorbeeld

**Huidige weergave "Nog te factureren":**
```
Hotel Seeduyn [Logies]
Test Bedrijf BV  |  15 jun. - 17 jun. 2026
                                    Offertebedrag
                                    €3.750,00
```

**Nieuwe weergave:**
```
Hotel Seeduyn [Logies]
Test Bedrijf BV  |  15 jun. - 17 jun. 2026
                                    Offertebedrag
                                    €3.750,00
                                    Verwachte commissie: €344,04
```

## Technische Wijzigingen

### 1. PartnerFinance.tsx - AccommodationInvoiceCard

Voeg berekening toe voor verwachte commissie bij `variant="to-invoice"`:

```typescript
const AccommodationInvoiceCard = ({ quote, variant }: AccommodationInvoiceCardProps) => {
  const request = quote.accommodation_requests;
  
  // Calculate expected commission for "to-invoice" items
  const calculateExpectedCommission = () => {
    if (variant !== "to-invoice" || !quote.price_total) return null;
    
    const vatRate = quote.vat_rate ?? 9;
    const priceTotal = quote.price_total;
    const amountExclVat = quote.price_includes_vat 
      ? priceTotal / (1 + vatRate / 100)
      : priceTotal;
    
    // Use quote's commission_percentage or partner default (10%)
    const commissionPercentage = quote.commission_percentage ?? 10;
    const commissionAmount = amountExclVat * (commissionPercentage / 100);
    
    return {
      amountExclVat,
      commissionPercentage,
      commissionAmount
    };
  };
  
  const expectedCommission = calculateExpectedCommission();
  
  // In render, bij variant="to-invoice":
  {variant === "to-invoice" ? (
    <div className="text-right">
      <p className="text-sm text-muted-foreground">Offertebedrag</p>
      <p className="font-semibold">€{quote.price_total.toLocaleString(...)}</p>
      {expectedCommission && (
        <p className="text-xs text-amber-600">
          Verwachte commissie: €{expectedCommission.commissionAmount.toFixed(2)}
        </p>
      )}
    </div>
  )}
};
```

### 2. PartnerFinance.tsx - InvoiceItemCard (Activiteiten)

Zelfde logica voor activiteit items:

```typescript
const InvoiceItemCard = ({ item, variant }: InvoiceItemCardProps) => {
  const calculateExpectedCommission = () => {
    if (variant !== "to-invoice" || !item.quoted_price) return null;
    
    const vatRate = 21; // Activities use 21% VAT
    const quotedPrice = item.quoted_price;
    const amountExclVat = quotedPrice / (1 + vatRate / 100);
    
    const commissionPercentage = item.commission_percentage ?? 15;
    const commissionAmount = amountExclVat * (commissionPercentage / 100);
    
    return { commissionAmount, commissionPercentage };
  };
  
  const expectedCommission = calculateExpectedCommission();
  // ... render with expected commission
};
```

### 3. Totaal Commissie Summary Card

Update de commissie summary card om ook verwachte commissie te tonen:

```typescript
// Bereken verwachte commissie voor items nog te factureren
const expectedActivityCommission = toBeInvoicedItems.reduce((sum, i) => {
  if (!i.quoted_price) return sum;
  const amountExcl = i.quoted_price / 1.21;
  const rate = i.commission_percentage ?? data.partner.commission_percentage;
  return sum + (amountExcl * (rate / 100));
}, 0);

const expectedAccommodationCommission = toBeInvoicedAccommodations.reduce((sum, q) => {
  const vatRate = q.vat_rate ?? 9;
  const amountExcl = q.price_includes_vat 
    ? q.price_total / (1 + vatRate / 100)
    : q.price_total;
  const rate = q.commission_percentage ?? data.partner.accommodation_commission_percentage ?? 10;
  return sum + (amountExcl * (rate / 100));
}, 0);

const totalExpectedCommission = expectedActivityCommission + expectedAccommodationCommission;
```

In de card:
```
Commissie (15% / 10%)
€0,00
€0.00 betaald • €0.00 open
Verwacht: €344,04
```

## Bestanden te Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/PartnerFinance.tsx` | Verwachte commissie berekening en weergave |

## Geen Database Wijzigingen Nodig

Dit is puur een UI-verbetering. De berekening gebeurt client-side op basis van bestaande data.

## Implementatie Volgorde

1. Helper functie toevoegen voor commissie berekening
2. AccommodationInvoiceCard updaten voor verwachte commissie
3. InvoiceItemCard updaten voor verwachte commissie
4. Summary card updaten met totaal verwachte commissie
