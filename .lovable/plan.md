
# Plan: Logies Commissie Systeem ✅ VOLTOOID

## Geïmplementeerde Onderdelen

### Fase 1: Commissie Berekening bij Quote Selectie ✅
- `select-accommodation-quote` berekent nu automatisch commissie bij selectie
- Haalt partner commissie percentage op (default 10%)
- Zet `commission_status` op "pending"

### Fase 2: Partner Factuurregistratie voor Logies ✅
- Nieuwe edge function: `register-accommodation-invoice`
- Nieuwe UI component: `AccommodationInvoiceDialog.tsx`
- `PartnerAccommodationQuoteSheet.tsx` uitgebreid met factuurregistratie
- Partners zien "Factuur registreren" knop bij geaccepteerde quotes

### Fase 3: Admin Commissie Overzicht Uitbreiden ✅
- `get-admin-commissions` haalt nu zowel activiteiten als logies commissies op
- UI toont type-indicator (Logies badge vs Activiteit badge)
- Gecombineerd overzicht met totalen voor beide types

### Fase 4: Update Commission Status ✅
- `update-commission-status` ondersteunt nu `itemType: 'activity' | 'accommodation'`
- Admin kan beide types markeren als gefactureerd/betaald

---

## Commissie Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│ QUOTE SELECTIE (Klant kiest accommodatie)                       │
│ → Automatisch commissie berekenen (partner % of default 10%)   │
│ → commission_status = "pending"                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PARTNER PORTAAL (Na uitvoering verblijf)                        │
│ → Partner registreert factuur (bedrag, nummer, datum)          │
│ → invoiced_amount, invoiced_number etc. worden ingevuld        │
│ → Commissie wordt herberekend op basis van factuurbedrag       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN COMMISSIE OVERZICHT                                       │
│ → Logies commissies verschijnen naast activiteit commissies    │
│ → Type indicator: 🏠 Logies vs ⚡ Activiteit                    │
│ → Admin kan markeren als gefactureerd/betaald                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Gewijzigde Bestanden

| Bestand | Status |
|---------|--------|
| `supabase/functions/select-accommodation-quote/index.ts` | ✅ Commissie berekening toegevoegd |
| `supabase/functions/get-admin-commissions/index.ts` | ✅ Logies quotes ophalen + combineren |
| `supabase/functions/update-commission-status/index.ts` | ✅ itemType parameter toegevoegd |
| `supabase/functions/register-accommodation-invoice/index.ts` | ✅ Nieuwe edge function |
| `supabase/config.toml` | ✅ JWT verification uitgeschakeld voor nieuwe functie |
| `src/pages/admin/AdminCommissions.tsx` | ✅ Type badges en gecombineerde data |
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | ✅ Factuurregistratie UI |
| `src/components/partner-portal/AccommodationInvoiceDialog.tsx` | ✅ Nieuwe component |
| `src/pages/PartnerAccommodation.tsx` | ✅ partnerToken doorgestuurd |
