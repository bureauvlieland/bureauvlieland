

# Plan: Klant Tegenvoorstel Flow

## Samenvatting
Naast het accepteren van een partner-voorstel, kan de klant ook een **tegenvoorstel** doen door zelf een andere tijd voor te stellen. Dit wordt expliciet als onderhandelings-flow vormgegeven in plaats van alleen "wijziging".

---

## Huidige situatie

Wanneer de partner een voorstel doet (status `confirmed` of `alternative`), kan de klant:
- ✅ **Akkoord** geven → status wordt `accepted`
- ⚠️ Tijd/dag aanpassen → status gaat terug naar `pending` (maar dit is niet duidelijk als "tegenvoorstel" gepresenteerd)

## Gewenste situatie

```
┌─────────────────────────────────────────────────────┐
│ 🎯 Zeehondentocht                    [Alternatief]  │
│                                                     │
│ 💬 Reactie aanbieder:                               │
│ "We kunnen wel op 15:00 in plaats van 10:00"        │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Voorgestelde tijd: 15:00    Prijs: €450,00      │ │
│ │                                                 │ │
│ │ [✓ Akkoord]     [Andere tijd voorstellen]       │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

       ↓ Klant klikt "Andere tijd voorstellen" ↓

┌─────────────────────────────────────────────────────┐
│ Andere tijd voorstellen                         ✕   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ De voorgestelde tijd (15:00) past niet?             │
│ Geef hieronder aan welke tijd jou beter uitkomt.    │
│                                                     │
│ Gewenste tijd                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 11:00                                         ▼ │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Toelichting (optioneel)                             │
│ ┌─────────────────────────────────────────────────┐ │
│ │ We hebben om 13:00 al de Vliehors Expres...     │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Tegenvoorstel versturen]              [Annuleren]  │
└─────────────────────────────────────────────────────┘
```

---

## Deel 1: Database - Klant Tegenvoorstel Velden

### Nieuwe kolommen in program_request_items

```sql
ALTER TABLE program_request_items 
ADD COLUMN customer_counter_time text DEFAULT NULL,
ADD COLUMN customer_counter_note text DEFAULT NULL,
ADD COLUMN customer_counter_at timestamp with time zone DEFAULT NULL;
```

- `customer_counter_time`: De tijd die de klant voorstelt
- `customer_counter_note`: Toelichting van de klant
- `customer_counter_at`: Wanneer het tegenvoorstel is gedaan

### Nieuwe status: "counter_proposed"

De status-flow wordt uitgebreid:

```
pending → confirmed/alternative → (klant kiest):
                                   ├── accepted (akkoord)
                                   ├── counter_proposed (tegenvoorstel) → partner reageert opnieuw
                                   └── cancelled (annuleren)
```

---

## Deel 2: UI - Tegenvoorstel Dialog

### Nieuw component: CounterProposalDialog.tsx

```tsx
interface CounterProposalDialogProps {
  item: ProgramRequestItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (time: string, note: string) => Promise<boolean>;
  blockedTimeSlots: TimeSlot[]; // Voor conflict-check
}
```

Bevat:
- Dropdown met beschikbare tijdslots (exclusief geblokkeerde tijden)
- Tekstveld voor toelichting
- Verstuur/Annuleer knoppen

### CustomerProgramItem.tsx Aanpassen

Naast de "Akkoord" knop, een tweede knop toevoegen:

```tsx
{(item.status === "confirmed" || item.status === "alternative") && !item.customer_accepted_at && (
  <div className="flex gap-2">
    <Button onClick={handleAccept}>
      <Check className="h-4 w-4 mr-2" />
      Akkoord
    </Button>
    <Button variant="outline" onClick={() => setShowCounterDialog(true)}>
      Andere tijd voorstellen
    </Button>
  </div>
)}
```

---

## Deel 3: Backend - Edge Function Updates

### update-customer-program/index.ts

Nieuwe actie: `counterProposal`

```typescript
interface CounterProposal {
  itemId: string;
  counterTime: string;
  counterNote: string;
}

// Handle counter proposal
if (counterProposal) {
  const { itemId, counterTime, counterNote } = counterProposal;
  
  // Update item
  await supabase
    .from("program_request_items")
    .update({
      status: "counter_proposed",
      customer_counter_time: counterTime,
      customer_counter_note: counterNote,
      customer_counter_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  
  // Log to history
  await supabase.from("program_request_history").insert({...});
  
  // Email partner about counter proposal
  emailMessages.push({...});
}
```

### Email naar Partner

```
┌─────────────────────────────────────────────────────┐
│ 📧 Tegenvoorstel van klant                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Beste [Partner],                                    │
│                                                     │
│ De klant heeft een tegenvoorstel gedaan voor:       │
│ [Activiteit Naam]                                   │
│                                                     │
│ Jouw voorstel: 15:00                                │
│ Klant wil liever: 11:00                             │
│                                                     │
│ Toelichting klant:                                  │
│ "We hebben om 13:00 al de Vliehors Expres..."       │
│                                                     │
│ [Reageren in Partner Portal]                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Deel 4: Partner Portal - Counter Proposal Weergave

### PartnerItemSheet.tsx

Wanneer status = `counter_proposed`:
- Toon klant-tegenvoorstel prominent
- Partner kan kiezen:
  - Akkoord met klant-voorstel → status naar `confirmed` met klant-tijd
  - Eigen alternatief → status naar `alternative`
  - Niet beschikbaar → status naar `unavailable`

```
┌─────────────────────────────────────────────────────┐
│ 🔄 Tegenvoorstel van klant                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Jouw voorstel was: 15:00                            │
│ Klant wil liever: 11:00                             │
│                                                     │
│ 💬 Toelichting klant:                               │
│ "We hebben om 13:00 al de Vliehors Expres..."       │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Jouw reactie:                                       │
│                                                     │
│ ○ Akkoord met 11:00                                 │
│ ○ Alternatief voorstellen                           │
│ ○ Niet beschikbaar                                  │
│                                                     │
│ [Versturen]                                         │
└─────────────────────────────────────────────────────┘
```

---

## Deel 5: Status Configuratie Uitbreiden

### src/types/programRequest.ts

```typescript
export type ItemStatus = 
  | "pending" 
  | "confirmed" 
  | "accepted" 
  | "unavailable" 
  | "alternative" 
  | "cancelled" 
  | "executed" 
  | "invoiced"
  | "counter_proposed"; // NIEUW

export const itemStatusConfig: Record<ItemStatus, ItemStatusInfo> = {
  // ... bestaande statussen
  counter_proposed: {
    label: "Tegenvoorstel",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-950/50",
    icon: "ArrowLeftRight",
    description: "Je hebt een andere tijd voorgesteld",
  },
};
```

---

## Deel 6: Klant Weergave na Tegenvoorstel

### CustomerProgramItem.tsx - Counter Proposed Status

```
┌─────────────────────────────────────────────────────┐
│ 🎯 Zeehondentocht                  [Tegenvoorstel]  │
│    Zeehondentochten Vlieland                        │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔄 Jouw tegenvoorstel: 11:00                    │ │
│ │    "We hebben om 13:00 al de Vliehors Expres"   │ │
│ │                                                 │ │
│ │    Wachten op reactie van aanbieder...          │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Bestanden die worden aangepast

### Database
| Actie | Wijziging |
|-------|-----------|
| Migratie | `customer_counter_time`, `customer_counter_note`, `customer_counter_at` kolommen |

### Types
| Bestand | Wijziging |
|---------|-----------|
| `src/types/programRequest.ts` | `counter_proposed` status toevoegen |

### Nieuwe Componenten
| Bestand | Beschrijving |
|---------|--------------|
| `src/components/customer-portal/CounterProposalDialog.tsx` | Dialog voor tegenvoorstel invoeren |

### Bestaande Componenten
| Bestand | Wijziging |
|---------|-----------|
| `CustomerProgramItem.tsx` | "Andere tijd voorstellen" knop + counter_proposed weergave |
| `PartnerItemSheet.tsx` | Counter proposal sectie + reactie-opties |
| `ItemStatusBadge.tsx` | Nieuwe status badge |

### Edge Functions
| Bestand | Wijziging |
|---------|-----------|
| `update-customer-program/index.ts` | counterProposal handling + partner email |
| `update-partner-item-status/index.ts` | Reageren op counter_proposed |

---

## Flow Samenvatting

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   PARTNER    │     │    KLANT     │     │   PARTNER    │
│  bevestigt   │────▶│   bekijkt    │────▶│  reageert    │
│  (confirmed) │     │   voorstel   │     │   opnieuw    │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Akkoord  │  │ Tegen-   │  │Annuleren │
        │ (accept) │  │ voorstel │  │(cancel)  │
        └──────────┘  └────┬─────┘  └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   counter_   │
                    │   proposed   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Partner  │ │ Partner  │ │ Partner  │
        │ akkoord  │ │alternatief│ │ niet     │
        │(confirmed)│ │          │ │beschikbaar│
        └──────────┘ └──────────┘ └──────────┘
```

---

## Implementatievolgorde

1. **Database migratie** - Nieuwe kolommen voor klant-tegenvoorstel
2. **Types** - `counter_proposed` status toevoegen
3. **CounterProposalDialog.tsx** - Nieuwe dialog component
4. **CustomerProgramItem.tsx** - Knop en tegenvoorstel-weergave
5. **update-customer-program** - Backend handling
6. **PartnerItemSheet.tsx** - Partner-reactie op tegenvoorstel
7. **update-partner-item-status** - Backend voor partner-reactie

