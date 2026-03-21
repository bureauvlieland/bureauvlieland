

## Plan: Terminologie en statusbadges synchroniseren

### Probleem

Twee kaarten tonen twee verschillende database-velden met hetzelfde label "Bevestigd":
- `RequestCompletionStatus` kijkt naar `item.status` (confirmed/pending/etc.)
- `FinancialOverviewCard` in quote-mode kijkt naar `item_quote_status` (bevestigd/concept/optioneel)

4 van 7 items hebben `item.status = "pending"` maar `item_quote_status = "bevestigd"`, waardoor de admin tegenstrijdige informatie ziet.

### Oplossing

**1. FinancialOverviewCard — badge aanpassen voor quote-mode**

In quote-mode niet `item_quote_status` tonen, maar de **operationele status** (`item.status`) gebruiken, net als de voltooiingskaart. Zo wordt het consistent:
- `confirmed` → groene badge "Bevestigd"
- `pending` → amber badge "In afwachting"
- `alternative` → blauwe badge "Alternatief"
- Overige → grijze badge

**2. Alternatief: quote-mode badge-labels differentiëren**

Als je wél `item_quote_status` wilt blijven tonen in het financieel overzicht (omdat dat relevant is voor de offerte), dan de labels aanpassen:
- `item_quote_status = "bevestigd"` → badge "Prijs bevestigd" (i.p.v. "Bevestigd")
- `item.status = "confirmed"` → badge "Partner bevestigd" (in voltooiingskaart)

### Aanbeveling: optie 1

Eén consistente badge per item op basis van `item.status`. De `item_quote_status` is meer een intern offerte-veld en hoeft de admin niet te verwarren in het financieel overzicht.

### Aanpassingen

**`src/components/admin/FinancialOverviewCard.tsx`** — `getStatusBadge` functie (regel 79-93)

Verwijder de aparte quote-mode branch. Gebruik altijd `item.status` voor de badge:
- `confirmed`/`executed` → groene CheckCircle + "Bevestigd"
- `pending` → amber Clock + "In afwachting"  
- `alternative` → blauwe badge "Alternatief"
- `cancelled` → (al uitgefilterd)

**`src/components/admin/RequestCompletionStatus.tsx`** — terminologie

- "Activiteiten bevestigd" → "Partners bevestigd" (verduidelijkt dat het om partnerbevestigingen gaat)

### Resultaat

Beide kaarten tonen dezelfde status per item, gebaseerd op hetzelfde veld (`item.status`). Geen verwarring meer.

