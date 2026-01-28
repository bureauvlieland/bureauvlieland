
# Plan: Partner Portaal Herstructurering

## Analyse van het Verzoek

De gebruiker wil:
1. **Menu aanpassen o.b.v. partner type**: "Aanbod" verbergen voor logies-only partners, "Logies" verbergen voor activiteiten-only partners
2. **Dashboard aanpassen**: Relevante secties tonen o.b.v. partner type
3. **Admin patronen hergebruiken**: De strakke, uniforme opzet van `AdminProjects.tsx` als voorbeeld voor de partner pagina's

## Huidige Situatie

### PartnerLayout.tsx (Navigatie)
De sidebar toont nu al conditioneel "Logies" alleen voor accommodation partners:
```typescript
...(isAccommodationPartner ? [{ title: "Logies", ... }] : [])
```

**Maar "Mijn Aanbod" wordt altijd getoond**, ook voor logies-only partners die geen activiteiten aanbieden.

### PartnerDashboard.tsx
- Toont activiteiten tabs (Nieuw, Voorstel verstuurd, Akkoord, Afgerond)
- Toont een aparte "Logies Aanvragen" kaart voor accommodation partners
- **Probleem**: Voor een logies-only partner is de activiteitensectie leeg en irrelevant

### Admin Patronen die we kunnen hergebruiken

De `AdminProjects.tsx` heeft uitstekende patronen:
1. **Uniforme tabel-layout** met filters
2. **Stats-kaarten** met type-onderscheid
3. **Badge-systeem** voor types
4. **Zoekfunctionaliteit** met debouncing
5. **Compacte rij-weergave** i.p.v. kaarten

---

## Voorgestelde Oplossing

### Fase 1: Conditionele Navigatie Voltooien

**Bestand:** `src/components/partner-portal/PartnerLayout.tsx`

```typescript
// Voeg check toe voor activiteit partner
const isActivityPartner = partner.partner_type === "activity_provider" || partner.partner_type === "both";
const isAccommodationPartner = partner.partner_type === "accommodation" || partner.partner_type === "both";

const menuItems = [
  { title: "Overzicht", url: `/partner/dashboard${urlSuffix}`, icon: LayoutDashboard },
  // Alleen tonen als partner activiteiten levert
  ...(isActivityPartner ? [{ title: "Mijn Aanbod", url: `/partner/aanbod${urlSuffix}`, icon: Package }] : []),
  // Alleen tonen als partner logies levert
  ...(isAccommodationPartner ? [{ title: "Logies", url: `/partner/logies${urlSuffix}`, icon: BedDouble }] : []),
  { title: "Facturatie", url: `/partner/facturatie${urlSuffix}`, icon: Receipt },
  { title: "Instellingen", url: `/partner/instellingen${urlSuffix}`, icon: Settings },
];
```

### Fase 2: Adaptief Partner Dashboard

**Bestand:** `src/pages/PartnerDashboard.tsx`

De dashboard pagina wordt **type-aware** en toont alleen relevante content:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  PARTNER DASHBOARD - ADAPTIEVE LAYOUT                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  VOOR ACTIVITEITEN PARTNERS (type: activity_provider)                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Stats: YTD Omzet | Nieuw | Voorstel verstuurd | Akkoord | Te fact.  │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Tabs: Nieuw | Voorstel verstuurd | Akkoord | Afgerond              │   │
│  │  [Activiteiten tabel zoals nu]                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  VOOR LOGIES PARTNERS (type: accommodation)                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Stats: YTD Omzet | Te beantwoorden | Offerte verstuurd | Gekozen   │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Tabs: Te beantwoorden | Offerte verstuurd | Afgerond               │   │
│  │  [Logies aanvragen in uniforme tabel - hergebruik admin patronen]   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  VOOR BEIDE PARTNERS (type: both)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Stats: YTD Omzet | Activiteiten stats | Logies stats               │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  Segment Toggle: [Activiteiten] [Logies]                            │   │
│  │  [Tabel voor geselecteerd segment]                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Fase 3: Hergebruik Admin Patronen

Van `AdminProjects.tsx` nemen we over:

1. **Stats Grid Pattern**
   - Consistente Card layout met icoon + cijfer + label
   - Kleurcodering per type (amber voor logies, green voor activiteiten)

2. **Uniforme Tabel Layout**
   - Zelfde table structuur voor beide types
   - Badge systeem voor statussen
   - Compacte rij-weergave

3. **Filter & Search Pattern**
   - Zoekbalk bovenaan
   - Status filter dropdown

4. **Shared Components** (nieuw te maken):
   - `PartnerStatsGrid.tsx` - Herbruikbare stats kaarten
   - `PartnerUnifiedTable.tsx` - Tabel die zowel activiteiten als logies kan tonen

---

## Te Wijzigen Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/partner-portal/PartnerLayout.tsx` | Conditionele "Mijn Aanbod" nav item |
| `src/pages/PartnerDashboard.tsx` | Type-aware dashboard met segment toggle |
| `src/components/partner-portal/PartnerDashboardHeader.tsx` | Uitbreiden met logies stats |
| **Nieuw:** `src/components/partner-portal/PartnerUnifiedRow.tsx` | Unified row voor tabel |

---

## Resultaat

Na implementatie:
- **Logies-only partners** zien alleen "Overzicht", "Logies", "Facturatie", "Instellingen" in het menu
- **Activiteiten-only partners** zien alleen "Overzicht", "Mijn Aanbod", "Facturatie", "Instellingen"
- **Beide-partners** zien alle menu items
- **Dashboard past zich aan** aan het partner type
- **Consistente UI** met admin backend patronen

---

## Technische Details

### Type Check Logic
```typescript
const partnerType = data.partner.partner_type || "activity_provider";
const isActivityPartner = partnerType === "activity_provider" || partnerType === "both";
const isAccommodationPartner = partnerType === "accommodation" || partnerType === "both";
const isBothPartner = partnerType === "both";
```

### Stats Card Kleurschema (consistent met admin)
- **Activiteiten**: Green tints (`bg-green-100 text-green-600`)
- **Logies**: Amber tints (`bg-amber-100 text-amber-600`)
- **Gecombineerd**: Indigo tints (`bg-indigo-100 text-indigo-600`)

### Edge Cases
- Nieuwe partners zonder `partner_type` worden behandeld als `activity_provider` (bestaande default)
- Als een partner geen items heeft in een categorie, toon een lege state
