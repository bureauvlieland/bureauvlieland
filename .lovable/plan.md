
# Plan: Data Koppeling tussen Configurator en Logies Wizard

## Samenvatting
De geselecteerde datums en groepsgrootte uit de programma-configurator automatisch doorgeven aan de logies aanvraag wizard, zodat gebruikers niet opnieuw dezelfde gegevens hoeven in te vullen.

## Wat wordt aangepast

### 1. LogiesSuggestionBanner
De banner genereert een URL met query parameters gebaseerd op de cart data:
- `arrival` - eerste geselecteerde datum
- `departure` - laatste geselecteerde datum  
- `guests` - aantal personen

**Van:**
```
/logies-aanvragen
```

**Naar:**
```
/logies-aanvragen?arrival=2025-06-01&departure=2025-06-03&guests=25
```

### 2. LogiesAanvragen pagina
De pagina leest de URL parameters uit en geeft deze door aan de AccommodationWizard.

### 3. AccommodationWizard
De wizard accepteert optionele initiële waarden en gebruikt deze om de form data voor te vullen.

## Technische details

### Stap 1: Banner aanpassen
Update `src/components/configurator/LogiesSuggestionBanner.tsx`:
- Accepteer `selectedDates` en `numberOfPeople` als props
- Genereer URL met query parameters via `URLSearchParams`

### Stap 2: ProgrammaSamenstellen aanpassen
Update `src/pages/ProgrammaSamenstellen.tsx`:
- Geef de cart data door aan de LogiesSuggestionBanner

### Stap 3: LogiesAanvragen pagina aanpassen
Update `src/pages/LogiesAanvragen.tsx`:
- Gebruik `useSearchParams` om query parameters uit te lezen
- Parse datums en groepsgrootte
- Geef door aan AccommodationWizard als `initialData` prop

### Stap 4: AccommodationWizard aanpassen
Update `src/components/accommodation/AccommodationWizard.tsx`:
- Accepteer optionele `initialData` prop
- Merge met defaults bij initialisatie
- Toon eventueel een melding dat data is overgenomen

## Gebruikerservaring na implementatie

```text
┌─────────────────────────────────────────────────────────────┐
│  CONFIGURATOR                                               │
│  ✓ 3 dagen geselecteerd: 1-3 juni 2025                     │
│  ✓ 25 personen                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛏️ Meerdaags verblijf geselecteerd                  │   │
│  │ Wilt u dat wij ook passende logies regelen?         │   │
│  │                         [Logies laten regelen →]    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (klik)
┌─────────────────────────────────────────────────────────────┐
│  LOGIES AANVRAGEN                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Data overgenomen uit uw programma                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Aankomst: 1 juni 2025  ✓                                  │
│  Vertrek:  3 juni 2025  ✓                                  │
│  Personen: 25           ✓                                  │
│                                                             │
│  → Klaar om door te gaan naar stap 2!                      │
└─────────────────────────────────────────────────────────────┘
```

## Randgevallen
- **Directe URL bezoek**: Wizard start met defaults (huidige gedrag)
- **Ongeldige datums in URL**: Fallback naar defaults
- **Eendaags programma**: Banner verschijnt niet (geen wijziging)
