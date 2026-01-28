
# Plan: Pro Forma Commissie Workflow met BTW-Berekening

## Samenvatting

Automatische commissie-opvolging waarbij:
1. Na afronding van activiteit/logies wordt commissie berekend over bedrag **excl. BTW**
2. Partner krijgt pro forma email met 7 dagen om afwijkingen te melden
3. Geen reactie = akkoord, commissie wordt definitief
4. Bureau Vlieland kan dan commissiefactuur versturen

---

## BTW-Berekening Logic

### Activiteiten (21% BTW)
```
geoffreerd_incl_btw = €500,00
bedrag_excl_btw = €500 / 1.21 = €413,22
commissie_15% = €413,22 × 0.15 = €61,98
```

### Logies (9% BTW)
```
geoffreerd_incl_btw = €2.500,00
bedrag_excl_btw = €2.500 / 1.09 = €2.293,58
commissie_10% = €2.293,58 × 0.10 = €229,36
```

### Code Implementatie
```typescript
// Haal BTW-tarief uit app_settings of building block
const vatRate = item.vat_rate ?? (isAccommodation ? 9 : 21);

// Bereken bedrag excl. BTW
const amountExclVat = quotedAmount / (1 + vatRate / 100);

// Bereken commissie over excl. BTW bedrag
const commissionAmount = amountExclVat * (commissionPercentage / 100);
```

---

## Workflow Diagram

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     PRO FORMA COMMISSIE WORKFLOW                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRIGGER                                                                     │
│  ────────                                                                    │
│  • Activiteit: status = 'executed'                                           │
│  • Logies: departure_date verstreken + status = 'selected'                   │
│                                                                              │
│         │                                                                    │
│         ▼                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  AUTOMATISCHE BEREKENING                                               │  │
│  │                                                                        │  │
│  │  1. Geoffreerd bedrag ophalen (quoted_price / price_total)             │  │
│  │  2. BTW-tarief bepalen (21% activiteit / 9% logies)                    │  │
│  │  3. Bedrag excl. BTW berekenen                                         │  │
│  │  4. Commissie berekenen over excl. BTW                                 │  │
│  │  5. Email versturen naar partner                                       │  │
│  │  6. Status → 'pending_confirmation'                                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│         │                                                                    │
│         ▼                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  EMAIL NAAR PARTNER                                                    │  │
│  │                                                                        │  │
│  │  "De activiteit voor [klant] is afgerond.                              │  │
│  │                                                                        │  │
│  │   Geoffreerd bedrag:     €500,00 incl. BTW                             │  │
│  │   Bedrag excl. BTW:      €413,22                                       │  │
│  │   Commissie (15%):       €61,98                                        │  │
│  │                                                                        │  │
│  │   Afwijkend gefactureerd? Meld binnen 7 dagen via [link]"              │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│         │                                                                    │
│         │  7 dagen                                                           │
│         ▼                                                                    │
│  ┌───────────────────────┬────────────────────────┐                          │
│  │  Partner meldt        │  Geen reactie          │                          │
│  │  afwijking            │                        │                          │
│  │         │             │         │              │                          │
│  │         ▼             │         ▼              │                          │
│  │  Registreer           │  Status → 'confirmed'  │                          │
│  │  werkelijk bedrag     │  Commissie definitief  │                          │
│  │  Herbereken commissie │  Admin todo: factureer │                          │
│  └───────────────────────┴────────────────────────┘                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Wijzigingen

### Nieuwe kolommen op `program_request_items`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| `proforma_sent_at` | timestamp | Wanneer pro forma email verstuurd |
| `proforma_amount_excl_vat` | numeric | Berekend bedrag excl. BTW |
| `proforma_commission` | numeric | Berekende commissie |
| `proforma_deadline` | date | Deadline voor reactie (7 dagen) |
| `actual_invoiced_excl_vat` | numeric | Door partner gemeld afwijkend bedrag |

### Nieuwe kolommen op `accommodation_quotes`

Dezelfde kolommen als hierboven.

### Uitbreiding commission_status

Toevoegen van `'pending_confirmation'` als geldige waarde.

---

## Edge Functions

### 1. `process-completed-items` (Dagelijks)

**Doel:** Vindt afgeronde items, berekent commissie, stuurt pro forma

```typescript
// Pseudo-code
async function processCompletedItems() {
  // 1. Vind afgeronde activiteiten zonder pro forma
  const activities = await supabase
    .from('program_request_items')
    .select('*, program_requests(*)')
    .eq('status', 'executed')
    .is('proforma_sent_at', null)
    .not('quoted_price', 'is', null);

  for (const item of activities) {
    // 2. Haal BTW-tarief (standaard 21% voor activiteiten)
    const vatRate = item.vat_rate ?? 21;
    
    // 3. Bereken excl. BTW
    const amountExclVat = item.quoted_price / (1 + vatRate / 100);
    
    // 4. Bereken commissie
    const commissionRate = item.commission_percentage ?? 15;
    const commissionAmount = amountExclVat * (commissionRate / 100);
    
    // 5. Update record
    await supabase
      .from('program_request_items')
      .update({
        proforma_sent_at: new Date().toISOString(),
        proforma_amount_excl_vat: amountExclVat,
        proforma_commission: commissionAmount,
        proforma_deadline: addDays(new Date(), 7),
        commission_status: 'pending_confirmation'
      })
      .eq('id', item.id);
    
    // 6. Stuur email
    await sendProformaEmail(item, amountExclVat, commissionAmount);
  }

  // Zelfde logica voor accommodation_quotes...
}
```

### 2. `confirm-pending-commissions` (Dagelijks)

**Doel:** Bevestigt commissies na verstrijken deadline

```typescript
async function confirmPendingCommissions() {
  const today = new Date().toISOString().split('T')[0];
  
  // Vind items met verlopen deadline
  const { data: expiredItems } = await supabase
    .from('program_request_items')
    .select('*')
    .eq('commission_status', 'pending_confirmation')
    .lt('proforma_deadline', today)
    .is('actual_invoiced_excl_vat', null); // Geen afwijking gemeld

  for (const item of expiredItems) {
    // Bevestig commissie o.b.v. pro forma
    await supabase
      .from('program_request_items')
      .update({
        commission_status: 'confirmed',
        invoiced_amount: item.proforma_amount_excl_vat,
        commission_amount: item.proforma_commission
      })
      .eq('id', item.id);

    // Maak admin todo
    await createAdminTodo({
      title: `Commissie factureren: ${item.provider_name}`,
      type: 'commission_ready_to_invoice',
      entity_id: item.id
    });
  }
}
```

---

## Partner UI: Afwijking Melden

Nieuwe component `ConfirmCommissionCard.tsx` in Partner Portal:

```text
┌─────────────────────────────────────────────────────────────────┐
│  💰 Commissie-opgave bevestigen                                 │
│  Deadline: 5 februari 2026                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Klant:          Districon BV                                   │
│  Activiteit:     Strandzeil workshop                            │
│  Uitgevoerd:     28 januari 2026                                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Geoffreerd bedrag:     €500,00 incl. BTW                       │
│  Bedrag excl. BTW:      €413,22                                 │
│  Commissie (15%):       €61,98                                  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ○ Bedrag klopt - geen afwijkingen                              │
│                                                                 │
│  ○ Werkelijk gefactureerd bedrag afwijkend:                     │
│    Bedrag excl. BTW:  [____________]                            │
│    Toelichting:       [________________________]                │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [Bevestigen]                                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Email Template

**Template ID:** `proforma_commission_notification`

```html
Onderwerp: Commissie-opgave voor [customer_name] - [block_name]

Beste [partner_name],

De activiteit "[block_name]" voor [customer_name] is uitgevoerd.

═══════════════════════════════════════════════════════════════
COMMISSIE-OPGAVE
═══════════════════════════════════════════════════════════════

Geoffreerd bedrag:       €[quoted_amount_incl] incl. BTW
Bedrag excl. BTW:        €[amount_excl_vat]
BTW-tarief:              [vat_rate]%

Commissiepercentage:     [commission_percentage]%
Commissiebedrag:         €[commission_amount]

═══════════════════════════════════════════════════════════════

Wij gaan uit van bovenstaand geoffreerd bedrag voor onze 
commissiefactuur.

▸ Is het werkelijk gefactureerde bedrag afwijkend?
  Geef dit vóór [deadline_date] door via uw partneromgeving:
  [partner_portal_link]

▸ Geen afwijkingen?
  Dan ontvangt u na de deadline onze commissiefactuur van €[commission_amount].

Met vriendelijke groet,
Bureau Vlieland
```

---

## Admin Overzicht

Nieuwe widget op Admin Dashboard: **"Commissies te factureren"**

| Partner | Type | Klant | Excl. BTW | Commissie | Status |
|---------|------|-------|-----------|-----------|--------|
| Seeduyn | Logies | Districon | €2.293,58 | €229,36 | Bevestigd ✓ |
| Outdoor Vlieland | Activiteit | RMD | €413,22 | €61,98 | Wacht (3 dgn) |

---

## Te Wijzigen/Maken Bestanden

| Bestand | Actie | Beschrijving |
|---------|-------|--------------|
| Database | Migratie | Nieuwe pro forma kolommen |
| `supabase/functions/process-completed-items/index.ts` | Nieuw | Dagelijkse pro forma generatie |
| `supabase/functions/confirm-pending-commissions/index.ts` | Nieuw | Dagelijkse deadline check |
| `src/components/partner-portal/ConfirmCommissionCard.tsx` | Nieuw | UI voor afwijking melden |
| `src/components/admin/PendingCommissionsCard.tsx` | Nieuw | Admin overzicht |
| `src/pages/PartnerDashboard.tsx` | Wijzigen | Integratie ConfirmCommissionCard |
| `src/pages/PartnerFinance.tsx` | Wijzigen | Toon pending confirmations |
| Email templates (DB) | Insert | Nieuwe proforma template |

---

## Configureerbare Parameters (app_settings)

| Setting | Default | Beschrijving |
|---------|---------|--------------|
| `proforma_deadline_days` | 7 | Dagen om afwijking te melden |
| `default_vat_rate` | 21 | Standaard BTW voor activiteiten |
| `accommodation_vat_rate` | 9 | BTW voor logies |

---

## Implementatie Volgorde

1. **Database migratie** - Nieuwe kolommen toevoegen
2. **Email template** - Pro forma notificatie in database
3. **Edge Function: process-completed-items** - Pro forma generatie
4. **Edge Function: confirm-pending-commissions** - Deadline checks  
5. **Partner UI: ConfirmCommissionCard** - Afwijking melden
6. **Admin UI: PendingCommissionsCard** - Overzicht commissies
7. **Scheduling** - Dagelijkse cron jobs activeren
