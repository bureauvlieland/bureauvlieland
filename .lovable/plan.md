
# Tabstructuur partner portal herindelen naar 5 tabs

## Huidige situatie
Het partner dashboard (`PartnerDashboard.tsx`) en de logies-pagina (`PartnerAccommodation.tsx`) hebben nu 3-4 tabs die niet goed aansluiten bij de werkelijke lifecycle. "Verlopen" en "Gekozen/Akkoord" vallen nu samen onder "Afgerond" of "In behandeling", waardoor partners ze niet goed terugvinden.

## Nieuwe tabstructuur (beide pagina's)

```text
Actie nodig | In behandeling | Verlopen | Akkoord | Afgerond
```

- **Actie nodig**: pending, counter_proposed, te factureren
- **In behandeling**: confirmed, alternative, submitted (offerte verstuurd, wacht op reactie)
- **Verlopen**: expired (offertetermijn verstreken)
- **Akkoord**: accepted, selected (klant/bureau heeft gekozen)
- **Afgerond**: executed, invoiced, cancelled, unavailable, rejected, declined

## Wijzigingen

### 1. `src/components/partner-portal/PartnerUnifiedList.tsx`
- Filter-functie uitbreiden van 3 naar 5 categorien:
  - `"expired"`: alleen `expired` status
  - `"accepted"`: `accepted` en `selected` statussen (niet te factureren)
  - `"in_progress"`: confirmed, alternative, submitted (zonder accepted/selected/expired)
  - `"completed"`: invoiced, cancelled, unavailable, rejected, executed
- Type van `filter` prop aanpassen
- Lege-state berichten toevoegen voor de twee nieuwe tabs

### 2. `src/pages/PartnerDashboard.tsx`
- `activeTab` state uitbreiden met `"expired"` en `"accepted"`
- TabsList van 3 naar 5 tabs met badges/counts
- TabsContent blokken toevoegen voor "Verlopen" en "Akkoord"
- Count-variabelen toevoegen voor de nieuwe tabs
- Grid layout aanpassen (van `grid-cols-3` naar responsive layout)

### 3. `src/pages/PartnerAccommodation.tsx`
- Tabs hernoemen/aanpassen om consistent te zijn:
  - "Te beantwoorden" wordt "Actie nodig" (pending)
  - "Offerte verstuurd" wordt "In behandeling" (submitted)
  - "Verlopen" blijft (expired)
  - Nieuwe tab "Akkoord" (selected)
  - "Afgerond" (rejected, declined)
- Count badges bij alle relevante tabs

### 4. `src/components/partner-portal/PartnerUnifiedList.tsx` (statusConfig)
- Label "Gekozen" aanpassen naar "Akkoord" voor `selected` status, zodat het consistent is met de tab-naam

## Resultaat
- Kreeft-offerte (expired) staat duidelijk in de "Verlopen" tab
- Gekozen/akkoord offertes staan apart en zijn niet meer verborgen
- "Afgerond" bevat alleen echt afgeronde zaken (uitgevoerd, gefactureerd, geannuleerd)
- Consistente structuur op zowel het dashboard als de logies-pagina
