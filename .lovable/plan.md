
# Plan: Maandselectie en Verbeterde Partner Groepering in Commissie Beheer

## Huidige Situatie

De Admin Commissie pagina:
- Groepeert items al per partner ✓
- Toont "Verwacht" met verwachte commissies ✓
- **Mist**: maand/periode selectie om te filteren op projectdatums

## Gewenste Uitbreiding

1. **Maand picker** toevoegen om commissies te filteren op uitvoermaand
2. **Alle maanden** optie (huidige gedrag)
3. **Verbeterde metrics** per geselecteerde periode

## Visueel Ontwerp

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Commissie Beheer                                              [Vernieuwen]    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [Verwacht ▼]  [Type: Alle ▼]  [📅 Februari 2026 ▼]                            │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ 🕐 Verwacht     │  │ € Totaal        │  │ 📅 Deze maand   │                 │
│  │ 1               │  │ € 344,04        │  │ 0 project(en)   │                 │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                 │
│                                                                                 │
│  ════════════════════════════════════════════════════════════════════════════  │
│  📋 COMMISSIE OVERZICHT - FEBRUARI 2026                                        │
│  ════════════════════════════════════════════════════════════════════════════  │
│                                                                                 │
│  🏨 Hotel Seeduyn                                               € 0,00         │
│  ───────────────────────────────────────────────────────────────────────────   │
│  (geen projecten in februari)                                                  │
│                                                                                 │
│  🏨 Hotel Seeduyn                                               € 344,04       │
│  ───────────────────────────────────────────────────────────────────────────   │
│  🏠 Logies │ Hotel Seeduyn │ Test Bedrijf │ 15-17 jun 2026 │ € 344,04         │
│                                                                                 │
│  ═══════════════════════════════════════════════════════════════════════════   │
│  TOTAAL FEBRUARI 2026                                           € 0,00        │
│  ═══════════════════════════════════════════════════════════════════════════   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Maand Picker Opties

| Optie | Beschrijving |
|-------|--------------|
| Alle maanden | Geen datumfilter (huidige gedrag) |
| Huidige maand | Januari 2026 |
| Komende maand | Februari 2026 |
| Specifieke maand | Dropdown met maanden waar projecten zijn |

## Technische Wijzigingen

### 1. Edge Function: `get-admin-commissions`

Uitbreiden met maand parameter:

```typescript
// Nieuwe filter parameter
let monthFilter: string | null = null; // Format: "2026-06" of null voor alle

try {
  const body = await req.json();
  if (body.status) statusFilter = body.status;
  if (body.type) typeFilter = body.type;
  if (body.month) monthFilter = body.month; // Nieuw!
} catch {}

// Bij ophalen items, filter op projectdatum
if (monthFilter) {
  const [year, month] = monthFilter.split("-");
  const startDate = `${year}-${month}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
  
  // Voor accommodations: filter op arrival_date
  // Voor activities: filter op selected_dates[0]
}
```

### 2. UI: AdminCommissions.tsx

Nieuwe state en picker toevoegen:

```typescript
const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
// null = alle maanden
// "2026-02" = februari 2026

// Maand opties genereren
const getMonthOptions = () => {
  const months = [];
  const now = new Date();
  // Huidige maand + 12 komende maanden
  for (let i = 0; i < 13; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: nl }),
    });
  }
  return months;
};
```

### 3. Filter UI Component

```tsx
<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
  {/* Status Filter */}
  <Select value={statusFilter} onValueChange={...}>
    ...
  </Select>
  
  {/* Type Filter (optioneel) */}
  <Select value={typeFilter} onValueChange={...}>
    <SelectTrigger className="w-40">
      <SelectValue placeholder="Type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Alle types</SelectItem>
      <SelectItem value="activity">Activiteiten</SelectItem>
      <SelectItem value="accommodation">Logies</SelectItem>
    </SelectContent>
  </Select>
  
  {/* Maand Filter - NIEUW */}
  <Select 
    value={selectedMonth || "all"} 
    onValueChange={(val) => setSelectedMonth(val === "all" ? null : val)}
  >
    <SelectTrigger className="w-48">
      <CalendarIcon className="h-4 w-4 mr-2" />
      <SelectValue placeholder="Selecteer maand" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Alle maanden</SelectItem>
      {monthOptions.map((opt) => (
        <SelectItem key={opt.value} value={opt.value}>
          {opt.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 4. API Call Aanpassen

```typescript
const { data, isLoading } = useQuery<CommissionsResponse>({
  queryKey: ["admin-commissions", statusFilter, typeFilter, selectedMonth],
  queryFn: async () => {
    const response = await supabase.functions.invoke("get-admin-commissions", {
      body: { 
        status: statusFilter,
        type: typeFilter,
        month: selectedMonth, // Nieuw!
      },
    });
    return response.data;
  },
});
```

### 5. Header Updaten

Voor gekozen maand:
```tsx
{isExpectedView && selectedMonth && (
  <div className="border-t-4 border-purple-500 bg-purple-50/50 rounded-lg p-4">
    <div className="flex items-center gap-2 text-purple-800">
      <FileText className="h-5 w-5" />
      <span className="font-semibold text-lg">
        COMMISSIE OVERZICHT - {format(new Date(selectedMonth + "-01"), "MMMM yyyy", { locale: nl }).toUpperCase()}
      </span>
    </div>
  </div>
)}
```

## Bestanden te Wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/get-admin-commissions/index.ts` | Maand filter parameter toevoegen |
| `src/pages/admin/AdminCommissions.tsx` | Maand picker en type filter UI |

## Filter Logica in Edge Function

### Activiteiten
```typescript
// Filter op eerste datum in selected_dates array
// PostgreSQL: selected_dates->0 as text
if (monthFilter) {
  query = query.gte("program_requests.selected_dates->>0", startOfMonth)
               .lt("program_requests.selected_dates->>0", startOfNextMonth);
}
```

### Logies
```typescript
// Filter op arrival_date
if (monthFilter) {
  query = query.gte("accommodation_requests.arrival_date", startOfMonth)
               .lt("accommodation_requests.arrival_date", startOfNextMonth);
}
```

## Extra Optie: Type Filter

Naast maand ook filteren op type:
- **Alle types** (default)
- **Activiteiten** - alleen program_request_items
- **Logies** - alleen accommodation_quotes

## Implementatie Volgorde

1. Edge function uitbreiden met month + type parameters
2. UI filters toevoegen (maand picker, type filter)
3. Query key updaten met nieuwe filters
4. Header tekst dynamisch maken op basis van geselecteerde maand
5. Testen met verschillende maand/type combinaties
