

# Rederij Doeksen dienstregeling API integreren

## Wat we hebben

- **API URL**: `https://api.rederij-doeksen.nl/`
- **Auth**: `Authorization: ApiKey {key}` header
- **API key**: `48-GeprakteGiraffeLiflaf-met-KriebelendeKipSchijven`
- **Relevante endpoints**:
  - `GET /departures/port/{from}/{to}` — afvaarten vandaag
  - `GET /departures/{from}/{to}/availability?date=` — afvaarten + beschikbaarheid op datum
  - Port codes: **H** = Harlingen, **V** = Vlieland, **T** = Terschelling
- **Response schema** (`TimetableDepartureWithAvailability`): departureTime, arrivalTime, vehicleName, portNameFrom, portNameTo, remainingPersonCapacity, isBookable, via (overstap)

## Plan

### Stap 1: API key opslaan als secret

De Doeksen API key moet veilig worden opgeslagen als backend secret (`DOEKSEN_API_KEY`), niet in de codebase.

### Stap 2: Edge function `get-ferry-departures`

Proxy-functie die de Doeksen API aanroept zodat de API key niet in de browser terechtkomt.

- **Input**: `portFrom`, `portTo`, `date` (optioneel, default vandaag)
- **Output**: array van afvaarten met vertrektijd, aankomsttijd, schip, beschikbaarheid
- Endpoint: `GET /departures/{from}/{to}/availability?date={date}`
- CORS headers voor browser-aanroep
- `verify_jwt = false` (publieke data)

### Stap 3: React hook `useFerryDepartures`

Hook die de edge function aanroept via `supabase.functions.invoke()`.

```typescript
useFerryDepartures({ from: "H", to: "V", date: "2025-09-15" })
// Returns: { data: Departure[], isLoading, error }
```

### Stap 4: `FerryScheduleCard` component

Een kaart die de eerstvolgende afvaarten toont voor Harlingen → Vlieland en Vlieland → Harlingen. Toont:
- Vertrektijd en aankomsttijd
- Scheepsnaam
- Beschikbare plekken (als de availability endpoint werkt)
- Link naar Rederij Doeksen voor boeken

Wordt getoond op:
- Klantportaal (programma pagina)
- Configurator (programma builder)
- Eventueel als vervanging/aanvulling van de huidige `BootticketBanner`

### Bestanden

| Actie | Bestand |
|---|---|
| Secret | `DOEKSEN_API_KEY` opslaan |
| Nieuw | `supabase/functions/get-ferry-departures/index.ts` |
| Nieuw | `src/hooks/useFerryDepartures.ts` |
| Nieuw | `src/components/FerryScheduleCard.tsx` |
| Wijzig | `supabase/config.toml` — verify_jwt = false voor nieuwe functie |

