
# Plan: Logies Commissie Systeem Voltooien

## Huidige Situatie

De logies commissie-flow is **onvolledig geïmplementeerd**. De database heeft de velden (`commission_percentage`, `commission_amount`, `commission_status`), maar:
- Commissie wordt niet berekend bij quote selectie
- Partners kunnen geen factuur registreren voor logies
- Admin ziet geen logies commissies in het overzicht

---

## Te Implementeren Onderdelen

### Fase 1: Commissie Berekening bij Quote Selectie

**Bestand:** `supabase/functions/select-accommodation-quote/index.ts`

Wanneer een klant een offerte selecteert, de commissie automatisch berekenen:

```typescript
// Na het updaten van de quote status naar "selected":
// 1. Haal partner commissie percentage op
const { data: partner } = await supabase
  .from("partners")
  .select("accommodation_commission_percentage")
  .eq("id", quote.partner_id)
  .single();

const commissionPercentage = partner?.accommodation_commission_percentage || 10;
const commissionAmount = (quote.price_total * commissionPercentage) / 100;

// 2. Update quote met commissie data
await supabase
  .from("accommodation_quotes")
  .update({
    status: "selected",
    selected_at: new Date().toISOString(),
    commission_percentage: commissionPercentage,
    commission_amount: commissionAmount,
    commission_status: "pending", // Wacht op factuurregistratie
  })
  .eq("id", quoteId);
```

---

### Fase 2: Partner Factuurregistratie voor Logies

**Nieuwe bestanden/aanpassingen:**

1. **Partner Portaal UI**: Uitbreiden van `PartnerAccommodationQuoteSheet.tsx` met factuurregistratie mogelijkheid voor "selected" quotes

2. **Nieuwe Edge Function**: `register-accommodation-invoice/index.ts`
   - Valideert partner token
   - Registreert factuurbedrag, nummer en datum
   - Update `commission_status` van "not_applicable" naar "pending"

3. **UI Flow**: Wanneer quote status = "selected", toon een "Factuur registreren" knop

---

### Fase 3: Admin Commissie Overzicht Uitbreiden

**Bestand:** `supabase/functions/get-admin-commissions/index.ts`

De functie moet nu twee bronnen combineren:
1. `program_request_items` (activiteiten commissies) - bestaand
2. `accommodation_quotes` (logies commissies) - nieuw

Voorbeeld query voor logies:
```typescript
const { data: accommodationItems } = await adminClient
  .from("accommodation_quotes")
  .select(`
    *,
    accommodation_requests (
      id,
      customer_name,
      customer_company,
      arrival_date,
      departure_date
    )
  `)
  .eq("commission_status", statusFilter)
  .gt("commission_percentage", 0)
  .not("invoiced_number", "is", null)
  .order("invoiced_date", { ascending: false });
```

**Admin UI**: Uitbreiden van `AdminCommissions.tsx` om beide types te tonen met een duidelijk onderscheid (activiteit vs logies).

---

### Fase 4: Update Commission Status Edge Function

**Bestand:** `supabase/functions/update-commission-status/index.ts`

Uitbreiden om ook `accommodation_quotes` te ondersteunen naast `program_request_items`. Parameter toevoegen voor `itemType: 'activity' | 'accommodation'`.

---

## Database Impact

Geen schema wijzigingen nodig - alle benodigde kolommen bestaan al in `accommodation_quotes`:
- `commission_percentage`
- `commission_amount`
- `commission_status`
- `commission_invoiced_at`
- `invoiced_amount`
- `invoiced_number`
- `invoiced_date`
- `invoiced_file_path`

---

## Commissie Flow na Implementatie

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
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN COMMISSIE OVERZICHT                                       │
│ → Logies commissies verschijnen naast activiteit commissies    │
│ → Admin kan markeren als gefactureerd/betaald                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Te Wijzigen Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/select-accommodation-quote/index.ts` | Commissie berekening toevoegen |
| `supabase/functions/get-admin-commissions/index.ts` | Logies quotes ophalen + combineren |
| `supabase/functions/update-commission-status/index.ts` | Ondersteuning voor accommodation_quotes |
| `supabase/functions/register-accommodation-invoice/index.ts` | Nieuwe edge function |
| `src/pages/admin/AdminCommissions.tsx` | UI voor logies commissies |
| `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx` | Factuurregistratie UI |
| `src/pages/PartnerAccommodation.tsx` | Factuurregistratie flow |

---

## Resultaat

Na implementatie:
- Logies commissies worden automatisch berekend bij quote selectie
- Partners kunnen facturen registreren voor logies
- Admin ziet alle commissies (activiteiten + logies) in één overzicht
- Volledige pariteit met het activiteiten commissie-systeem
