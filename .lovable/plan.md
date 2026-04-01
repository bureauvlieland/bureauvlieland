

## Plan: Fix logiesofferte opnieuw bevestigen na herziening

### Probleem

De edge function `select-accommodation-quote` blokkeert op regel 130:

```ts
if (request.status === "accepted") {
  return error "Er is al een offerte gekozen voor deze aanvraag"
}
```

Na een herziening (gastenwijziging + quote-reset) wordt de request-status teruggezet naar `"processing"`. Maar als de partner zijn offerte opnieuw indient **zonder** dat er een formele gastenwijziging was (bijv. alleen prijs aangepast), blijft de request-status op `"accepted"`. Dan kan de klant niet opnieuw bevestigen.

Daarnaast: als een quote die eerder `"selected"` was, wordt gereset naar `"pending"` en daarna opnieuw ingediend als `"submitted"`, moet de klant deze opnieuw kunnen selecteren.

### Oplossing

**1. Edge function aanpassen** (`select-accommodation-quote/index.ts`)

De check op regel 130 versoepelen: in plaats van direct blokkeren bij `status === "accepted"`, ook controleren of de specifieke quote die geselecteerd wordt status `"submitted"` heeft. Als de quote `"submitted"` is, mag de selectie doorgaan — ongeacht de request-status. Dit dekt het scenario waarin een herziene offerte opnieuw bevestigd moet worden.

Concreet:
- Verplaats de "already accepted" check tot **na** het ophalen van de specifieke quote
- Blokkeer alleen als `request.status === "accepted"` **én** de geselecteerde quote al `"selected"` is (niet `"submitted"`)

**2. Request-status resetten bij partner-herindienst** (`PartnerAccommodation.tsx`)

Wanneer een partner een quote opnieuw indient terwijl de request-status `"accepted"` is, de request-status terugzetten naar `"processing"`. Dit zorgt ervoor dat de klantportal de quote weer als "kiesbaar" toont.

### Wijzigingen

| Bestand | Actie |
|---|---|
| `supabase/functions/select-accommodation-quote/index.ts` | "Already accepted" check versoepelen: toestaan als de specifieke quote status `submitted` heeft |
| `src/pages/PartnerAccommodation.tsx` | Bij herindienst: als request-status `accepted` is, resetten naar `processing` |

Twee bestanden, kleine logica-wijzigingen.

