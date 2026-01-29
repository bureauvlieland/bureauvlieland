

# Fix: Partner Portal Zichtbaarheid voor Klant Tegenvoorstel

## Samenvatting
Het klant tegenvoorstel (`counter_proposed` status) is niet zichtbaar in de partner portal omdat:
1. De TypeScript types de nieuwe velden niet bevatten
2. De status badge configuratie ontbreekt
3. De dashboard filtering deze status niet meeneemt

---

## Wijziging 1: PartnerItem Type Uitbreiden

### src/types/partner.ts

Toevoegen aan de `PartnerItem` interface (rond lijn 45):

```typescript
// Customer counter proposal fields (when customer proposes alternative time)
customer_counter_time: string | null;
customer_counter_note: string | null;
customer_counter_at: string | null;
```

---

## Wijziging 2: StatusConfig Aanpassen in PartnerItemRow

### src/components/partner-portal/PartnerItemRow.tsx

Toevoegen aan `statusConfig` (lijn 15-24):

```typescript
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  // ... bestaande statussen ...
  counter_proposed: { 
    label: "Tegenvoorstel klant", 
    color: "text-purple-700 dark:text-purple-400", 
    bgColor: "bg-purple-100 dark:bg-purple-950/50" 
  },
};
```

---

## Wijziging 3: Dashboard Filtering Aanpassen

### src/pages/PartnerDashboard.tsx

De `counter_proposed` status moet in de juiste categorie komen. Aangezien dit een actie vereist van de partner, hoort het bij de "Nieuw" / "Actie vereist" tab.

**Huidige code (lijn 398):**
```typescript
const pendingItems = data.items.filter((i) => i.status === "pending");
```

**Nieuwe code:**
```typescript
const pendingItems = data.items.filter((i) => 
  i.status === "pending" || i.status === "counter_proposed"
);
```

Dit zorgt ervoor dat items met een klant tegenvoorstel in de "Nieuw" tab verschijnen waar de partner ze kan zien en beantwoorden.

---

## Wijziging 4: Visuele Indicatie voor Counter Proposals

### src/components/partner-portal/PartnerItemRow.tsx

Voeg een extra indicator toe voor counter proposals, vergelijkbaar met de bestaande `isNew` en `isModified` checks:

```typescript
// Check if customer has submitted a counter proposal
const hasCounterProposal = (item: PartnerItem): boolean => {
  return item.status === "counter_proposed";
};

// In de component:
const hasCounter = hasCounterProposal(item);

// In de render:
{hasCounter && (
  <ArrowLeftRight className="h-4 w-4 text-purple-500 shrink-0" />
)}
```

---

## Wijziging 5: PartnerItemSheet Type Cast Verwijderen

### src/components/partner-portal/PartnerItemSheet.tsx

De huidige code gebruikt `(item as any)` voor de counter proposal velden (lijn 368, 382-385). Na het updaten van de types kan dit veilig worden:

```typescript
// Van:
{(item as any).customer_counter_time}

// Naar:
{item.customer_counter_time}
```

---

## Bestanden die worden aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/types/partner.ts` | `customer_counter_*` velden toevoegen aan PartnerItem |
| `src/components/partner-portal/PartnerItemRow.tsx` | `counter_proposed` status + visuele indicator |
| `src/pages/PartnerDashboard.tsx` | Filtering aanpassen zodat counter_proposed zichtbaar is |
| `src/components/partner-portal/PartnerItemSheet.tsx` | Type cast verwijderen |

---

## Resultaat na implementatie

```
┌─────────────────────────────────────────────────────┐
│ 📋 Partner Dashboard                                │
├─────────────────────────────────────────────────────┤
│ [Nieuw (2)] [Voorstel verstuurd] [Akkoord] [Archief]│
├─────────────────────────────────────────────────────┤
│                                                     │
│ 🔄 Zeehondentocht    | TestBedrijf | 15 mrt | [Tegenvoorstel klant] │
│ ✨ Vliehors Expres   | ACME Inc.   | 16 mrt | [Nieuw]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

De partner ziet nu:
- Een paars "Tegenvoorstel klant" badge
- Een 🔄 icoon in de rij
- Bij klikken: de volledige counter proposal details met klant-tijd en toelichting

