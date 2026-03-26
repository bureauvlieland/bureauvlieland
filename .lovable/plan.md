

## Plan: Duidelijkere statuslabels voor klant + actie-hints

### Probleem
Klant ziet "Bevestigd" en denkt dat alles geregeld is. Maar "Bevestigd" betekent dat de **partner** beschikbaarheid heeft bevestigd — de klant moet nog op "Akkoord" klikken. De terminologie is verwarrend.

### Voorstel

**1. Statuslabel aanpassen voor klant** — `src/types/programRequest.ts`

Het label "Bevestigd" voor `confirmed` status wijzigen naar **"Beschikbaar ✓"** in de klantcontext. Dit maakt duidelijk dat de aanbieder beschikbaar is, maar dat de klant nog actie moet ondernemen.

| Status | Huidig label | Nieuw klantlabel |
|---|---|---|
| `confirmed` | Bevestigd | Beschikbaar |
| `alternative` | Alternatief | Alternatief voorstel |

**2. Actie-hint onder de badge** — `src/components/customer-portal/CustomerProgramItem.tsx`

Wanneer een item `confirmed` of `alternative` is en de klant nog geen akkoord heeft gegeven, een korte hint-tekst tonen:

> ℹ️ De aanbieder heeft bevestigd. Klik op 'Akkoord' om deze activiteit definitief te boeken.

Dit verschijnt als een subtiele tekstregel (blauw info-achtig) boven de actieknoppen.

**3. Akkoord-knop prominenter**

De "Akkoord" knop iets meer opvallen laten: toevoegen van een subtle pulse/ring animatie of een lichtgroene achtergrond-highlight rond de hele kaart wanneer akkoord nog nodig is.

### Wijzigingen

**`src/components/customer-portal/CustomerProgramItem.tsx`**:
1. Override het statuslabel: als status `confirmed` is en `!item.customer_accepted_at`, toon "Beschikbaar" i.p.v. "Bevestigd"
2. Voeg info-hint toe na de meta-rij wanneer akkoord vereist is
3. Voeg subtiele highlight border toe aan kaarten die actie vereisen

**`src/types/programRequest.ts`**:
- Geen wijziging nodig — we overriden het label in de component via de bestaande `overrideLabel` prop van `ItemStatusBadge`

### Bestanden
1. `src/components/customer-portal/CustomerProgramItem.tsx`

