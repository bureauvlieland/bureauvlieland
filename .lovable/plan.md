

# Plan: Activiteiten Toevoegen in Klantportaal

## Overzicht

Klanten kunnen momenteel alleen activiteiten verwijderen/annuleren, maar niet toevoegen. Deze functionaliteit is nodig wanneer een activiteit niet door kan gaan en er iets anders voor in de plaats moet komen.

## Huidige situatie

- De `PendingChange` interface heeft al een `"added"` type (regel 41 in `useCustomerProgram.ts`)
- De edge function heeft een label voor `"added"` (regel 96-97), maar geen INSERT logica
- De `usePublishedBuildingBlocks` hook is beschikbaar voor het ophalen van beschikbare bouwstenen
- Er zijn geen UI-componenten voor het toevoegen van activiteiten

## Voorwaarden voor toevoegen

Klanten kunnen alleen activiteiten toevoegen als:
- De voorwaarden nog niet zijn geaccepteerd (`terms_accepted_at === null`)
- Het programma niet is geannuleerd
- Het programma niet is verlopen

## Technische wijzigingen

### 1. Nieuw component: `AddActivitySheet.tsx`

Een sheet-component waarmee klanten kunnen zoeken en selecteren uit beschikbare bouwstenen:

- Zoekfunctionaliteit op naam
- Categoriefilters (Activiteiten, Catering, Vervoer)
- Lijst met beschikbare bouwstenen (die nog niet in het programma zitten)
- Per bouwsteen: afbeelding, naam, prijs, aanbieder, "Toevoegen" knop
- Bij toevoegen: keuze voor dag (als meerdaags programma) en optionele tijd/opmerking

### 2. Nieuw component: `AddActivityCard.tsx`

Een compacte kaart voor weergave van een bouwsteen in de AddActivitySheet:

- Afbeelding (klein)
- Naam en korte beschrijving
- Prijs-indicatie
- Aanbieder naam
- "Toevoegen" knop

### 3. Hook uitbreiden: `useCustomerProgram.ts`

Nieuwe functies toevoegen:

- `addItem(blockId, dayIndex, preferredTime?, notes?)` - voegt een nieuw item toe aan lokale state
- `addedItems` state - houdt nieuwe items bij die nog niet in de database staan
- `getPendingChanges()` uitbreiden - detecteert ook nieuwe items (items die niet in `originalItems` voorkomen)

### 4. Views aanpassen: `DesktopProgramView.tsx` en `MobileProgramView.tsx`

- "Activiteit toevoegen" knop toevoegen naast de "X activiteiten" badge
- Knop alleen tonen als `!termsAccepted`
- Knop opent de `AddActivitySheet`

### 5. Edge function uitbreiden: `update-customer-program/index.ts`

Logica toevoegen voor `"added"` change type:

- Bouwsteen data ophalen uit `building_blocks` tabel
- Nieuw item inserten in `program_request_items` met:
  - `status: 'pending'`
  - `version: 1`
  - Alle block-informatie gekopieerd (naam, categorie, prijs, aanbieder, etc.)
- E-mail sturen naar de betreffende aanbieder
- Historie-record aanmaken

---

## Bestandsoverzicht

| Bestand | Actie |
|---------|-------|
| `src/components/customer-portal/AddActivitySheet.tsx` | Nieuw |
| `src/components/customer-portal/AddActivityCard.tsx` | Nieuw |
| `src/hooks/useCustomerProgram.ts` | Uitbreiden met `addItem` en state |
| `src/components/customer-portal/DesktopProgramView.tsx` | "Toevoegen" knop toevoegen |
| `src/components/customer-portal/MobileProgramView.tsx` | "Toevoegen" knop toevoegen |
| `supabase/functions/update-customer-program/index.ts` | INSERT logica voor nieuwe items |

---

## UI-ontwerp

### "Toevoegen" knop in programma-header

```text
┌─────────────────────────────────────────────────────────┐
│ 📅 Je Programma                                         │
│                                      [+ Toevoegen]  [5] │
└─────────────────────────────────────────────────────────┘
```

### AddActivitySheet

```text
┌──────────────────────────────────────────────────────────┐
│ Activiteit toevoegen                                  X  │
├──────────────────────────────────────────────────────────┤
│ [🔍 Zoeken...]                                           │
│                                                          │
│ [Alle] [Activiteiten] [Catering] [Vervoer]              │
├──────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────┐   │
│ │ [img] Zeehondensafari                              │   │
│ │       €25 p.p. • Door: Rederij Vlieland           │   │
│ │       Spot zeehonden in hun natuurlijke habitat   │   │
│ │                                    [+ Toevoegen]  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [img] Strandactiviteiten                           │   │
│ │       €15 p.p. • Door: Vlieland Outdoor            │   │
│ │       Teambuilding op het strand                   │   │
│ │                                    [+ Toevoegen]  │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Bij toevoegen (als meerdaags programma)

```text
┌──────────────────────────────────────────────────────────┐
│ Zeehondensafari toevoegen                                │
├──────────────────────────────────────────────────────────┤
│ Op welke dag?                                            │
│ [○ Dag 1 - 15 maart] [○ Dag 2 - 16 maart]               │
│                                                          │
│ Voorkeurstijd (optioneel)                                │
│ [___:___]                                                │
│                                                          │
│ Opmerking (optioneel)                                    │
│ [_________________________________]                      │
│                                                          │
│ [Annuleren]                         [Toevoegen]          │
└──────────────────────────────────────────────────────────┘
```

---

## Workflow

1. Klant klikt op "+ Toevoegen" in programma-sectie
2. Sheet opent met beschikbare bouwstenen (gefilterd op items die nog niet in programma zitten)
3. Klant zoekt/filtert en selecteert een bouwsteen
4. (Bij meerdaags) Klant kiest dag en optioneel tijd/opmerking
5. Item wordt lokaal toegevoegd aan de items-lijst met status "nieuw"
6. Item verschijnt in het programma met "Nieuw" badge
7. "Wijzigingen doorvoeren" balk toont het nieuwe item
8. Bij bevestigen: edge function insert het item en e-mailt de aanbieder

---

## Volgorde van implementatie

1. **AddActivityCard.tsx** - Compacte bouwsteen-kaart component
2. **AddActivitySheet.tsx** - Sheet met zoeken, filteren en selecteren
3. **useCustomerProgram.ts** - `addItem` functie en state-logica
4. **DesktopProgramView.tsx & MobileProgramView.tsx** - "Toevoegen" knop
5. **update-customer-program/index.ts** - INSERT logica voor nieuwe items

