
# Plan: Realtime Updates, Tijdsortering en Logies-aanmaakknop voor AdminRequestDetail

## Samenvatting
Drie verbeteringen voor de admin projectdetail-pagina:
1. **Realtime updates** - Pagina updatet automatisch wanneer klanten wijzigingen maken
2. **Tijdsortering** - Activiteiten worden gesorteerd op dag EN tijd
3. **Logies aanmaken** - Admin kan direct een logiesaanvraag koppelen aan een project

## Overzicht wijzigingen

```text
┌─────────────────────────────────────────────────────────────┐
│              AdminRequestDetail.tsx Wijzigingen             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. REALTIME SUBSCRIPTION                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useEffect (on mount)                                 │   │
│  │    ├─ fetchRequestData()                              │   │
│  │    └─ Subscribe to Supabase channel                   │   │
│  │        ├─ program_request_items → refetch            │   │
│  │        └─ program_requests → refetch                  │   │
│  │                                                        │   │
│  │  useEffect (on unmount)                               │   │
│  │    └─ Unsubscribe from channel                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  2. SORTERING                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Query: .order("day_index").order("preferred_time")   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  3. LOGIES AANMAKEN                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Als linkedAccommodation = null:                      │   │
│  │  ├─ Toon CTA card met "Logies aanvragen" knop        │   │
│  │  └─ Link naar /logies-aanvragen met parameters:       │   │
│  │      ├─ arrival (eerste datum)                        │   │
│  │      ├─ departure (laatste datum)                     │   │
│  │      ├─ guests (aantal personen)                      │   │
│  │      └─ programToken (customer_token)                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technische Details

### Bestand: `src/pages/admin/AdminRequestDetail.tsx`

#### Wijziging 1: Realtime subscription toevoegen

**Locatie: useEffect (regels 178-187)**

Huidige code:
```typescript
useEffect(() => {
  if (id) {
    fetchRequestData();
    logAdminActivity({
      action: AdminActions.REQUEST_VIEWED,
      entityType: EntityTypes.REQUEST,
      entityId: id,
    });
  }
}, [id]);
```

Nieuwe code:
```typescript
useEffect(() => {
  if (!id) return;
  
  fetchRequestData();
  logAdminActivity({
    action: AdminActions.REQUEST_VIEWED,
    entityType: EntityTypes.REQUEST,
    entityId: id,
  });
  
  // Subscribe to realtime changes for live updates
  const channel = supabase
    .channel(`admin-request-${id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'program_request_items',
        filter: `request_id=eq.${id}`,
      },
      () => fetchRequestData()
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'program_requests',
        filter: `id=eq.${id}`,
      },
      () => fetchRequestData()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [id]);
```

#### Wijziging 2: Items sorteren op dag + tijd

**Locatie: fetchRequestData query (regel 213)**

Huidige code:
```typescript
.order("day_index", { ascending: true });
```

Nieuwe code:
```typescript
.order("day_index", { ascending: true })
.order("preferred_time", { ascending: true, nullsFirst: false });
```

#### Wijziging 3: Logies aanmaken CTA

**Locatie: Na linkedAccommodation card (rond regel 711)**

Toevoegen:
```typescript
{/* Logies CTA when no accommodation linked */}
{!linkedAccommodation && (request.selected_dates as string[]).length > 1 && (
  <Card className="border-dashed border-2 border-indigo-300 bg-indigo-50/30">
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <Hotel className="h-5 w-5 text-indigo-600" />
        Logies regelen
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Dit is een meerdaags programma. Wilt u logies aanvragen voor deze groep?
      </p>
      <Button asChild>
        <Link to={buildLogiesUrl()}>
          <Plus className="h-4 w-4 mr-2" />
          Logiesaanvraag maken
        </Link>
      </Button>
    </CardContent>
  </Card>
)}
```

**Helper functie toevoegen:**
```typescript
const buildLogiesUrl = () => {
  const params = new URLSearchParams();
  const dates = request.selected_dates as string[];
  
  if (dates.length > 0) {
    // Sort dates and use first as arrival, last as departure
    const sorted = [...dates].sort();
    params.set("arrival", format(new Date(sorted[0]), "yyyy-MM-dd"));
    params.set("departure", format(new Date(sorted[sorted.length - 1]), "yyyy-MM-dd"));
  }
  
  params.set("guests", request.number_of_people.toString());
  params.set("programToken", request.customer_token);
  
  return `/logies-aanvragen?${params.toString()}`;
};
```

## Database vereisten

De tabellen `program_request_items` en `program_requests` moeten aan de realtime publication zijn toegevoegd. Dit is al gedaan voor het klantportaal, maar als dit nog niet het geval is:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_request_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.program_requests;
```

## Resultaat

Na implementatie:
- Admin ziet wijzigingen van klanten direct zonder pagina te verversen
- Activiteiten worden gesorteerd op dag EN tijd (bijv. 09:00 voor 12:00)
- Admin kan direct een logiesaanvraag maken voor meerdaagse projecten zonder naar klantpagina te hoeven
- Logiesaanvraag wordt automatisch gekoppeld via `programToken` parameter
