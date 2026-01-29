
# Plan: Admin Omgeving Uitbreidingen voor Partner Functionaliteiten

## Context

De nieuwe partner-functionaliteiten (beschikbaarheidsblokkering, maandomzet grafiek, stats kaarten navigatie, aankomende activiteiten widget) hebben gevolgen voor de admin-workflows. Dit plan beschrijft de aanpassingen en uitbreidingen die nodig zijn om optimaal gebruik te maken van deze data.

---

## Deel 1: Partner Beschikbaarheid Integratie

### 1.1 Waarschuwingsindicator in Partners Overzicht
**Locatie**: `AdminPartners.tsx`

Voeg een visuele indicator toe in de partnerslijst wanneer een partner momenteel niet beschikbaar is of binnenkort geblokkeerd is.

```text
┌──────────────────────────────────────────────────────────────┐
│ Partner            │ Type       │ Contact    │ Status       │
├──────────────────────────────────────────────────────────────┤
│ 🚢 Zeehonden Tochten│ Activiteiten│ info@...  │ ⚠️ Niet besch│
│ 🏨 Hotel de Wadden │ Logies     │ boek@...   │ ✓ Actief     │
└──────────────────────────────────────────────────────────────┘
```

**Wijzigingen**:
- Query `partner_unavailability` tabel voor alle partners
- Toon `AlertTriangle` icon + badge wanneer partner actief geblokkeerd is
- Tooltip met reden en periode

### 1.2 Conflict Detectie bij Toewijzingen
**Locatie**: `AdminRequestDetail.tsx` + nieuwe component

Wanneer een admin een aanvraag bekijkt, controleer of betrokken partners beschikbaar zijn op de geplande datums.

- Toon een waarschuwingsbanner boven de items-lijst als er conflicten zijn
- Markeer specifieke items met een indicator als hun provider niet beschikbaar is
- Klik opent de partner-detail met beschikbaarheidsinfo

---

## Deel 2: Dashboard Verbeteringen

### 2.1 Partner Beschikbaarheid Widget op Dashboard
**Locatie**: `AdminDashboard.tsx` + nieuw component

Nieuwe "Geblokkeerde Partners" kaart die toont:
- Aantal partners met actieve blokkering
- Lijst van komende blokkeringen (7 dagen vooruit)
- Link naar volledige partnerslijst gefilterd op beschikbaarheid

```text
┌─────────────────────────────────────────┐
│  🚫  Partner Beschikbaarheid           │
├─────────────────────────────────────────┤
│  2 partners momenteel niet beschikbaar  │
│  ──────────────────────────────────────  │
│  Zeehonden Tochten: 15-22 feb           │
│  Strandtent De Baken: 1-10 mrt          │
└─────────────────────────────────────────┘
```

### 2.2 Partner Performance Inzichten
**Locatie**: Nieuwe kaart op `AdminDashboard.tsx`

Toon top-performing partners gebaseerd op:
- Omzet dit jaar (via partner items)
- Aantal uitgevoerde activiteiten
- Gemiddelde responstijd op aanvragen

---

## Deel 3: Projecten & Aanvragen Workflows

### 3.1 Partner Conflict Waarschuwingen in Projecten
**Locatie**: `AdminProjects.tsx` tabel

Voeg een indicator kolom toe die laat zien of er beschikbaarheidsproblemen zijn met een van de providers in het project.

### 3.2 Snelle Partner Status Check
**Locatie**: `AdminRequestDetail.tsx`

Per item in de activiteitenlijst:
- Badge "Niet beschikbaar" als provider een blokkering heeft op die datum
- Hover-tooltip met details van de blokkering
- Quick-action om alternatieve partner te zoeken

---

## Deel 4: Partner Beheer Uitbreidingen

### 4.1 Admin-gestuurde Beschikbaarheidsblokkering
**Locatie**: `AdminPartnerUnavailability.tsx` uitbreiden

Voeg de mogelijkheid toe voor admins om periodes te blokkeren namens partners:
- "Periode toevoegen" knop naast de bestaande viewer
- Formulier met datum-range, reden, en optionele notitie
- Loggen naar `admin_activity_log`

### 4.2 Partner Omzet Overzicht in Admin
**Locatie**: Nieuw tabblad of sectie in `AdminPartnerDetail.tsx`

Integreer dezelfde maandomzet grafiek die partners zien in hun eigen portal:
- Hergebruik van `PartnerMonthlyRevenueChart` component (of variant)
- Admin-specifieke filters (datumbereik, vergelijking)
- Export mogelijkheid (CSV)

---

## Deel 5: Commissie & Financieel Beheer

### 5.1 Verwachte Commissie op Partner Niveau
**Locatie**: `AdminPartnerDetail.tsx`

Toon een financiële samenvatting per partner:
- YTD omzet en commissie
- Openstaande commissies
- Laatste factuurregistratie

### 5.2 Partner Filter in Commissie Overzicht
**Locatie**: `AdminCommissions.tsx`

Voeg een extra filter toe om commissies per partner te bekijken, naast de bestaande maand en type filters.

---

## Deel 6: Todo's & Notificaties

### 6.1 Auto-Todo's voor Partner Conflicten
**Locatie**: `autoTodoCreator.ts` uitbreiden

Nieuw auto-todo type: `availability_conflict`
- Automatisch aanmaken wanneer een aanvraag wordt ingediend voor een partner die geblokkeerd is
- Prioriteit: "high"
- Link naar betreffende aanvraag

### 6.2 Notificatie bij Nieuwe Blokkering
**Locatie**: Database trigger of cron-check

Wanneer een partner een nieuwe beschikbaarheidsblokkering toevoegt die overlapt met bestaande aanvragen:
- Creëer automatisch een admin-todo
- Optioneel: stuur email naar admin

---

## Deel 7: CRM & Logging

### 7.1 Partner Activiteit Timeline
**Locatie**: Nieuw component voor `AdminPartnerDetail.tsx`

Toon een chronologische timeline van:
- Ontvangen aanvragen
- Statuswijzigingen
- Beschikbaarheidsblokkeringen toegevoegd/verwijderd
- Factuurregistraties

### 7.2 Uitgebreide Partner Logs
**Locatie**: `AdminLogs.tsx` uitbreiden

Filter-optie om alleen partner-gerelateerde activiteiten te tonen:
- Beschikbaarheidsmutaties
- Instellingswijzigingen
- Commissie-updates

---

## Implementatie Prioriteit

### Fase 1 - Direct (Hoge impact, lage complexiteit)
| Item | Component | Geschatte tijd |
|------|-----------|----------------|
| Beschikbaarheidsindicator in partnerslijst | `AdminPartners.tsx` | 1-2 uur |
| Geblokkeerde partners widget op dashboard | `AdminDashboard.tsx` | 2-3 uur |
| Partner conflict detectie in aanvragen | `AdminRequestDetail.tsx` | 2-3 uur |

### Fase 2 - Op korte termijn
| Item | Component | Geschatte tijd |
|------|-----------|----------------|
| Admin-gestuurde beschikbaarheidsblokkering | `AdminPartnerUnavailability.tsx` | 2-3 uur |
| Partner omzet grafiek in admin | `AdminPartnerDetail.tsx` | 1-2 uur |
| Partner filter in commissie overzicht | `AdminCommissions.tsx` | 1-2 uur |

### Fase 3 - Later
| Item | Component | Geschatte tijd |
|------|-----------|----------------|
| Auto-todo's voor beschikbaarheidsconflicten | `autoTodoCreator.ts` + trigger | 3-4 uur |
| Partner activiteit timeline | Nieuw component | 4-5 uur |
| Uitgebreide partner logs filtering | `AdminLogs.tsx` | 2-3 uur |

---

## Technische Details

### Data Queries

**Partners met actieve blokkering ophalen:**
```typescript
const { data: unavailablePartners } = await supabase
  .from("partner_unavailability")
  .select(`
    partner_id,
    start_date,
    end_date,
    reason,
    partners!inner (name, id)
  `)
  .lte("start_date", today)
  .gte("end_date", today);
```

**Conflictdetectie query:**
```typescript
// Check of partner beschikbaar is op bepaalde datum
const { data: conflicts } = await supabase
  .from("partner_unavailability")
  .select("*")
  .eq("partner_id", partnerId)
  .lte("start_date", activityDate)
  .gte("end_date", activityDate);
```

### Nieuwe Component Structuur

```text
src/components/admin/
├── AdminPartnerUnavailability.tsx (bestaand - uitbreiden)
├── AdminPartnerConflictBanner.tsx (nieuw)
├── AdminPartnerRevenueChart.tsx (nieuw - wrapper)
├── AdminUnavailabilityWidget.tsx (nieuw - dashboard)
└── AdminPartnerTimeline.tsx (nieuw - fase 3)
```

---

## Samenvatting

| Verbetering | Admin Sectie | Complexiteit | Impact |
|-------------|--------------|--------------|--------|
| Beschikbaarheid indicator partners | Partners lijst | Laag | Hoog |
| Conflict detectie in aanvragen | Aanvragen detail | Medium | Hoog |
| Dashboard beschikbaarheid widget | Dashboard | Laag | Medium |
| Admin blokkering toevoegen | Partner detail | Medium | Medium |
| Partner omzet grafiek | Partner detail | Laag | Medium |
| Partner filter commissies | Commissies | Laag | Medium |
| Auto-todo's conflicten | Systeem | Hoog | Hoog |
| Partner timeline | Partner detail | Hoog | Medium |

Deze verbeteringen zorgen ervoor dat de admin-omgeving volledig gebruik maakt van de nieuwe partner-functionaliteiten en proactief conflicten en beschikbaarheidsproblemen kan signaleren.
