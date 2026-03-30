

## Plan: Fix — Goedgekeurd items tonen nog steeds "klik op Akkoord" hint

### Probleem
Wanneer een klant in quote-modus op "Akkoord" klikt, wordt `customer_approved_at` gezet. Maar:
1. Het blauwe hint-blok ("klik op Akkoord om te boeken") verdwijnt niet — het controleert `customer_accepted_at` (een ander veld)
2. De partner ziet het item niet als "geaccepteerd" — de partner portal leidt de effectieve status af uit `customer_accepted_at`
3. De Akkoord-knop verdwijnt wel (via `isQuoteItemAwaitingCustomerApproval`), maar de visuele inconsistentie blijft

### Oorzaak
Er zijn twee aparte velden: `customer_accepted_at` (niet-quote flow) en `customer_approved_at` (quote flow). De `needsCustomerAction` logica en de partner portal kijken alleen naar `customer_accepted_at`.

### Oplossing
Bij het goedkeuren van een quote-item moet ook `customer_accepted_at` gezet worden zodat de rest van de applicatie (partner portal, admin, blauwe hint) correct reageert.

### Wijzigingen

**1. Edge function `approve-quote-item/index.ts`**
In het non-admin_override pad: naast `customer_approved_at` ook `customer_accepted_at` meezetten in de update payload.

```ts
// Was:
{ customer_approved_at: approvalTimestamp, updated_at: approvalTimestamp }
// Wordt:
{ customer_approved_at: approvalTimestamp, customer_accepted_at: approvalTimestamp, updated_at: approvalTimestamp }
```

Idem voor het admin_override pad.

**2. Customer portal `CustomerProgramItem.tsx`**
De `needsCustomerAction` check uitbreiden met `customer_approved_at` als extra veiligheid (belt-and-suspenders):

```ts
const needsCustomerAction = !isSelfArranged 
  && (item.status === "confirmed" || item.status === "alternative") 
  && !item.customer_accepted_at 
  && !item.customer_approved_at;
```

### Effect
- Blauwe hint verdwijnt direct na akkoord
- Partner portal toont item als "Geaccepteerd"
- Admin ziet correcte status
- Bestaande niet-quote items blijven ongewijzigd

### Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/approve-quote-item/index.ts` | `customer_accepted_at` meezetten |
| `src/components/customer-portal/CustomerProgramItem.tsx` | `needsCustomerAction` check uitbreiden |

Twee kleine wijzigingen, geen migratie nodig.

