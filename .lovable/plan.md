

# Projectoverzicht verrijken met uitklap-detailrij

## Wat verandert er

De tabelweergave op `/admin/projecten` krijgt een **uitklapbare rij** per project. Klik op de rij → extra detailpanel verschijnt eronder met alle relevante informatie in een compact grid. De hoofdrij blijft compact zoals nu.

## Nieuwe data die opgehaald wordt

De query wordt uitgebreid met:
1. **Accommodation quotes** — per logiesaanvraag: welke partners benaderd, hun status (pending/submitted/declined/selected), en de `valid_until` deadline
2. **Program item details** — per programma: items met `skip_partner_notification`, `status`, `provider_name` voor een compacte samenvatting

## Detailpanel layout (uitklapbaar)

```text
┌─────────────────────────────────────────────────────────────────┐
│ ▼ BV-2603-0001 | Bedrijf ABC | 25 personen | 5 jun 2026       │  ← hoofdrij (bestaand, + chevron)
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LOGIES (LOG-2603-0003)                     ACTIVITEITEN        │
│  ┌──────────────────────────┐               ┌────────────────┐ │
│  │ ⏳ Hotel De Wadden       │  deadline:    │ 3/5 bevestigd  │ │
│  │ ⏳ Badhotel Bruin        │  23 mrt       │ 1 in afwacht.  │ │
│  │ ✅ Zeezicht (offerte)    │               │ 1 nog niet     │ │
│  │ ❌ Seeduyn               │               │   verstuurd    │ │
│  │ ❌ Donia Huys            │               │                │ │
│  │ ❌ Vlielandhotel         │               │ Partners:      │ │
│  └──────────────────────────┘               │ Outdoor Vliel. │ │
│                                             │ Zeehondentocht │ │
│                                             └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Implementatie

### 1. Data ophalen — `AdminProjects.tsx` queryFn uitbreiden

Naast de bestaande queries, twee extra queries toevoegen:

```typescript
// Accommodation quotes met partner info
const { data: accQuotes } = await supabase
  .from("accommodation_quotes")
  .select("request_id, status, valid_until, accommodation_name, partner_id");

const { data: partners } = await supabase
  .from("partners")
  .select("id, name");
```

Resultaat mappen naar een `accommodationQuotesByRequest: Record<string, QuoteSummary[]>` en meegeven aan het Project interface.

### 2. Project interface uitbreiden

```typescript
interface AccommodationQuoteSummary {
  partner_name: string;
  status: string;  // pending | submitted | declined | selected
  valid_until: string | null;
}

interface Project {
  // ...bestaande velden...
  accommodation_quotes: AccommodationQuoteSummary[];
  // items detail voor uitklap
  items_not_sent: number;  // skip_partner_notification === true
}
```

### 3. Uitklapbare rij — Collapsible per TableRow

Elke rij wordt wrapped met een `Collapsible`. De bestaande `TableRow` is de trigger; een tweede `TableRow` met `CollapsibleContent` bevat het detailpanel.

Detailpanel bevat twee kolommen:
- **Links — Logies**: lijst van benaderde partners met status-icoon (⏳/✅/❌/📩), vroegste deadline prominent als die nadert (< 3 dagen = rood)
- **Rechts — Activiteiten**: samenvatting (X bevestigd, Y in afwachting, Z nog niet verstuurd), lijst van unieke partnernamen

### 4. Deadline-indicator in hoofdrij

In de bestaande "Logies" kolom, naast de status badge, een kleine deadline-indicator toevoegen als er pending quotes zijn:
```tsx
{earliestDeadline && <span className="text-xs text-amber-600">⏰ {format(deadline, "d MMM")}</span>}
```

Rood kleuren als deadline < 3 dagen.

### 5. Chevron-icoon

Een `ChevronDown` icoon toevoegen aan het begin of einde van de rij, die roteert bij uitklappen.

## Bestanden

- `src/pages/admin/AdminProjects.tsx` — query uitbreiden, Project interface uitbreiden, tabelrijen uitklapbaar maken met detailpanel

Geen database-wijzigingen nodig. Alle data is al beschikbaar.

