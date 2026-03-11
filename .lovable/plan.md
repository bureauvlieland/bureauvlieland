

# Voorkeurtijd en opmerking inline in programmakaarten

## Wat
Elke programmakaart in de builder krijgt direct bewerkbare velden voor:
1. **Voorkeurtijd** — een compact tijdselectie-dropdown (bestaande `timeSlots`)
2. **Opmerking** — een uitklapbaar notitieveld dat meegestuurd wordt bij de aanvraag

Uitgezonderd: ferry-blokken (hebben al de Doeksen picker) en fietshuur (heeft geen tijdsvoorkeur).

## Hoe

### `src/components/configurator/ProgramBuilderView.tsx`

Onder de bestaande card-content (na de category badge, maar binnen de Card), voor niet-ferry en niet-fiets blokken:

1. **Tijd-selector**: Compact inline `Select` met klok-icoon, standaard "Flexibel", dezelfde `timeSlots` als in `CartItemDetails`. Wordt getoond als kleine regel onder de metadata.

2. **Opmerking**: Een "Opmerking toevoegen" knop die een `Textarea` toont. Als er al een opmerking is, toon deze direct. Max 500 tekens met teller.

Beide gebruiken de bestaande `onUpdateItem(item.blockId, { preferredTime, notes })` callback.

### Visueel ontwerp

```text
┌──────────────────────────────────────┐
│ [img] Naam activiteit           [🗑] │
│       Korte beschrijving             │
│       ⏱ 2 uur  | Categorie          │
│       ────────────────────────       │
│       🕐 Flexibel ▾                 │
│       💬 Opmerking toevoegen         │
│       ┌─────────────────────┐        │
│       │ (textarea als open) │        │
│       └─────────────────────┘        │
└──────────────────────────────────────┘
```

### Technisch

- Hergebruik `timeSlots` uit `@/types/buildingBlock`
- Import `Select`, `Textarea` componenten (al beschikbaar)
- Geen nieuwe componenten nodig — logica direct in de kaart-render
- Ferry-blokken: overslaan (behouden FerryDeparturePicker)
- Fiets-blok: overslaan (geen tijd relevant)
- Notes worden al opgeslagen in `CartItemDetail.notes` en meegestuurd bij submission

### Bestanden

- **`src/components/configurator/ProgramBuilderView.tsx`** — tijd-selector en opmerking-veld toevoegen in de card voor reguliere blokken

