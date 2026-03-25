

## Plan: Kerninfo (tijd, deelnemers, locatie) direct zichtbaar op item-kaart

### Wat verandert
In de **meta row** (regel 152-202) van `CustomerProgramItem.tsx` worden drie extra subtiele datapunten toegevoegd die nu pas na uitklappen zichtbaar zijn:

1. **Aantal deelnemers** — klein icoon + getal, alleen tonen als `override_people` of `numberOfPeople` beschikbaar is
2. **Locatie** — `MapPin` icoon + adres (truncated), alleen als `location_address` aanwezig is

De tijd en duur staan al in de meta row — die blijven.

### Wijzigingen

**`src/components/customer-portal/CustomerProgramItem.tsx`**

In de meta row (rond regel 152-202), na het bestaande `duration` blok, twee items toevoegen:

```tsx
{/* Deelnemers - subtiel in meta row */}
{(item.override_people || numberOfPeople) && (
  <span className="flex items-center gap-1">
    <Users className="h-3.5 w-3.5" />
    {item.override_people ?? numberOfPeople} pers.
  </span>
)}

{/* Locatie - subtiel in meta row */}
{item.location_address && (
  <span className="flex items-center gap-1 truncate max-w-[200px]">
    <MapPin className="h-3.5 w-3.5 shrink-0" />
    <span className="truncate">{item.location_address}</span>
  </span>
)}
```

De edit-functionaliteit (tijd wijzigen, deelnemers aanpassen, locatie-routelink) blijft in de uitklapbare `CollapsibleContent` staan.

### Bestanden
1. `src/components/customer-portal/CustomerProgramItem.tsx`

