
# Plan: Applicatie-Instellingen & Centrale Business Rules

## Status: ✅ Volledig Geïmplementeerd

---

## Wat is geïmplementeerd

### Fase 1: Database Structuur ✅
- Nieuwe tabel `app_settings` met RLS policies
- Kolommen: `id`, `category`, `label`, `description`, `value_type`, `value`, `updated_at`, `updated_by`
- Initiële settings ingevoerd:
  - `coordination_fee_tiers` - JSON staffel
  - `default_vat_rate` - 21%
  - `accommodation_vat_rate` - 9%
  - `default_partner_commission` - 15%
  - `default_accommodation_commission` - 10%
  - `request_expiry_days` - 90 dagen

### Fase 2: Centrale Business Constants Library ✅
- **`src/types/appSettings.ts`** - TypeScript types voor settings
- **`src/lib/appSettings.ts`** - Centrale utility library met:
  - `FALLBACK_FEE_TIERS` - Fallback waarden
  - `getCoordinationFee()` - Fee berekening
  - `getVatRate()` - BTW tarief ophalen
  - `getCommissionRate()` - Commissie percentage
  - `calculateExclVat()` / `calculateVatAmount()` - BTW berekeningen
  - `DEFAULT_GROUP_SIZE` - Initiële groepsgrootte constant

### Fase 3: React Hook ✅
- **`src/hooks/useAppSettings.ts`** - Hook met React Query caching
  - 5 minuten staleTime voor performance
  - Fallback waarden bij DB issues
  - Helper functies: `getCoordinationFee()`, `getVatRate()`, `getCommissionRate()`
  - Mutation voor updates

### Fase 4: Admin Instellingen Pagina ✅
- **`src/pages/admin/AdminSettings.tsx`** - Nieuwe admin pagina
- Gegroepeerd per categorie (Prijzen, BTW, Commissies, Systeem)
- Inline editing met Save/Cancel
- Speciaal component voor fee tier editing
- Laatst gewijzigd timestamp per setting
- Route: `/admin/instellingen`

### Fase 5: Navigatie Update ✅
- "Instellingen" toegevoegd aan admin sidebar met Settings icon
- Route toegevoegd aan App.tsx

### Fase 6: Code Refactoring ✅
Alle hardcoded waarden vervangen door centrale functies:

| Component | Wijziging |
|-----------|-----------|
| `PriceSummaryCard.tsx` | Gebruikt `useAppSettings` hook, removed local fee function |
| `InvoiceProvidersCard.tsx` | Gebruikt `useAppSettings` hook, removed local fee function |
| `FinancialOverviewCard.tsx` | Gebruikt `useAppSettings` hook |
| `AdminInvoicing.tsx` | Gebruikt `useAppSettings` hook |
| `CartContext.tsx` | Gebruikt `DEFAULT_GROUP_SIZE` constant |

### Fase 7: Type Safety ✅
- `numberOfPeople` prop is nu required (niet optional) in:
  - `PriceSummaryCard`
  - `InvoiceProvidersCard`
- Voorkomt verborgen bugs door default waarden

---

## Setting Categories

| Category | Label | Settings |
|----------|-------|----------|
| `pricing` | Prijzen | Coördinatiefee Staffel |
| `vat` | BTW Tarieven | Standaard BTW, Logies BTW |
| `commission` | Commissies | Partner, Logies commissie |
| `system` | Systeem | Geldigheidsduur aanvragen |

---

## Fee Tier Format (JSON)

```json
[
  {"maxPeople": 10, "fee": 50},
  {"maxPeople": 25, "fee": 100},
  {"maxPeople": 100, "fee": 250},
  {"maxPeople": 150, "fee": 350},
  {"maxPeople": 999999, "fee": 500}
]
```

---

## Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/types/appSettings.ts` | TypeScript types |
| `src/lib/appSettings.ts` | Centrale utilities en fallbacks |
| `src/hooks/useAppSettings.ts` | React hook met caching |
| `src/pages/admin/AdminSettings.tsx` | Admin instellingen UI |

---

## Aangepaste Bestanden

- `src/components/admin/AdminLayout.tsx` - Nav item toegevoegd
- `src/App.tsx` - Route toegevoegd
- `src/components/customer-portal/PriceSummaryCard.tsx` - Centrale functies
- `src/components/customer-portal/InvoiceProvidersCard.tsx` - Centrale functies
- `src/components/admin/FinancialOverviewCard.tsx` - Centrale functies
- `src/pages/admin/AdminInvoicing.tsx` - Centrale functies
- `src/contexts/CartContext.tsx` - DEFAULT_GROUP_SIZE constant

---

## Technische Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│                    Database (app_settings)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ coordination_fee_tiers | default_vat_rate | etc.    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              useAppSettings Hook (React Query)               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • 5 min cache │ getCoordinationFee() │ getVatRate() │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ PriceSummaryCard │ │ InvoiceProviders │ │ AdminInvoicing   │
│                  │ │ Card             │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Fallback Mechanisme

Als database niet bereikbaar is, worden fallback waarden gebruikt:

```typescript
export const FALLBACK_SETTINGS: AppSettingsMap = {
  coordination_fee_tiers: FALLBACK_FEE_TIERS,
  default_vat_rate: 21,
  accommodation_vat_rate: 9,
  default_partner_commission: 15,
  default_accommodation_commission: 10,
  request_expiry_days: 90,
};
```

Dit zorgt ervoor dat de applicatie altijd functioneel blijft.
