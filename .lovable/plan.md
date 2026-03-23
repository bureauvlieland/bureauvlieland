

## Plan: Per-onderdeel aantal deelnemers

### Wat er verandert

Een nieuw optioneel veld `override_people` op elk programma-onderdeel. Standaard `null` = gebruik het groepstotaal. Wanneer gevuld, wordt dat aantal gebruikt voor alle prijsberekeningen.

### 1. Database migratie

```sql
ALTER TABLE program_request_items
ADD COLUMN override_people integer DEFAULT NULL;
```

Geen constraints nodig — null betekent "gebruik programma-totaal".

### 2. TypeScript type updaten

**`src/types/programRequest.ts`** — `ProgramRequestItem` interface:
```typescript
override_people: number | null;
```

### 3. Centrale prijslogica updaten

**`src/lib/portalPricing.ts`** — alle functies krijgen een extra parameter-strategie:

```typescript
function getEffectivePeople(item: ProgramRequestItem, programPeople: number): number {
  return item.override_people ?? programPeople;
}
```

In `getItemUnitPrice`, `getItemLineTotal`, `getItemEffectivePrice`, en `calculateDayTotal` wordt `numberOfPeople` vervangen door `getEffectivePeople(item, numberOfPeople)` voor de per-person berekening. De functie-signatures blijven hetzelfde (backwards compatible).

### 4. Admin UI — bewerkbaar veld per item

**`src/pages/admin/AdminRequestDetail.tsx`**:
- In de items-tabel een nieuwe kolom "Deelnemers" toevoegen naast de prijskolom
- Een compact number-input met placeholder die het programma-totaal toont
- Bij wijziging: `supabase.update({ override_people })` op het item
- Visuele indicator (bijv. oranje tekst) als het afwijkt van het groepstotaal

### 5. Admin offerte-preview en factuur-preview

**`src/pages/admin/AdminQuotePreview.tsx`** en **`src/pages/admin/AdminInvoicePreview.tsx`**:
- `getItemTotal()` gebruikt `item.override_people ?? request.number_of_people`
- In de tabel het afwijkende aantal tonen als dat verschilt van het totaal

### 6. Klantportaal — tonen (niet bewerkbaar)

**`src/components/customer-portal/PriceSummaryCard.tsx`**:
- `ppMultiplier` berekening: `item.override_people ?? numberOfPeople`
- Bij afwijkend aantal een label tonen: "(25 deelnemers)" naast het item

**`src/components/customer-portal/DesktopProgramView.tsx`** en **`MobileProgramView.tsx`**:
- `getItemEffectivePrice(i, program.number_of_people)` → pricing helpers gebruiken automatisch `override_people` via de aangepaste `portalPricing.ts`
- Optioneel: klein label bij items met afwijkend aantal

### 7. Edge functions

**`send-quote-request`**, **`get-customer-program`**, **`accept-quote-proposal`**:
- Waar `number_of_people` wordt gebruikt voor prijsberekeningen per item, controleren of `override_people` beschikbaar is en dat gebruiken

### 8. Financieel overzicht

**`src/components/admin/FinancialOverviewCard.tsx`**:
- Gebruikt al `centralLineTotal(item, numberOfPeople)` — werkt automatisch mee via de aangepaste `portalPricing.ts`

### Samenvatting bestanden

| Bestand | Wijziging |
|---|---|
| Database migratie | `ADD COLUMN override_people` |
| `src/types/programRequest.ts` | Veld toevoegen |
| `src/lib/portalPricing.ts` | `getEffectivePeople()` helper, alle functies aanpassen |
| `src/pages/admin/AdminRequestDetail.tsx` | Kolom + input per item |
| `src/pages/admin/AdminQuotePreview.tsx` | Gebruik override_people |
| `src/pages/admin/AdminInvoicePreview.tsx` | Gebruik override_people |
| `src/components/customer-portal/PriceSummaryCard.tsx` | Gebruik override_people |
| `src/components/customer-portal/DesktopProgramView.tsx` | Label bij afwijkend aantal |
| `src/components/customer-portal/MobileProgramView.tsx` | Label bij afwijkend aantal |
| Edge functions (3-4 stuks) | override_people meenemen in berekeningen |

