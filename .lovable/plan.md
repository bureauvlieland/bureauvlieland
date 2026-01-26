

# Plan: Partner Portal Uitbreiding & Optimalisatie

## Overzicht

Dit plan bevat uitbreidingen en optimalisaties voor de Partner Portal om deze beter aan te laten sluiten bij de verbeteringen in het klantportaal en de werkbaarheid te verbeteren.

---

## Wijzigingen

### 1. "Nieuw" Badge voor Partner Items

**Bestand: `PartnerItemCard.tsx`**
- Voeg een "Nieuw" badge toe voor items die recent zijn toegevoegd en nog pending zijn (binnen 24 uur aangemaakt)
- Dit helpt partners om snel te zien welke aanvragen nieuw binnengekomen zijn

**Implementatie:**
- Check of `item.status === "pending"` EN `created_at` binnen laatste 24 uur
- Toon een paarse/blauwe "Nieuw" badge naast de status badge
- Vergelijkbaar met de CustomerProgramItem implementatie

---

### 2. Duur Weergave in PartnerItemCard

**Bestand: `PartnerItemCard.tsx`**
- Voeg de activiteitsduur toe aan de activity details sectie
- Geeft partners context over de tijdsduur van de activiteit

**Implementatie:**
- Toon `item.duration` met een Timer icon naast de datum/tijd informatie
- Vergelijkbaar met CustomerProgramItem

---

### 3. Terminologie Review & Consistentie

**Bestand: `PartnerItemCard.tsx`**
- Review statuslabels voor consistentie:
  - "Aangevraagd" (pending) - consistent met klantportaal
  - "Bevestigd" (confirmed) - consistent
  - "Alternatief" (alternative) - consistent
  - "Niet beschikbaar" (unavailable) - consistent

**Bestand: `PartnerDashboard.tsx`**
- Tab labels zijn al goed benoemd, geen wijzigingen nodig

---

### 4. Uitgebreide Navigatie

**Bestand: `PartnerLayout.tsx`**
- Breid de sidebar navigatie uit met meer opties:
  - "Overzicht" (huidige dashboard - `/partner/dashboard`)
  - "Facturatie" (nieuwe pagina - `/partner/facturatie`)
  - "Instellingen" (bestaand - `/partner/instellingen`)

**Nieuwe pagina: `PartnerFinance.tsx`**
- Dedicated pagina voor financiële gegevens
- Uitgebreider overzicht van gefactureerde items
- Commissie-overzicht en -status
- Historische data (YTD, per kwartaal)

**Route toevoegen in `App.tsx`:**
```typescript
<Route path="/partner/facturatie" element={<PartnerFinance />} />
```

---

### 5. Partner Workflow Card (Optioneel)

**Nieuwe component: `PartnerWorkflowCard.tsx`**
- Een compacte "Volgende stappen" indicator vergelijkbaar met NextStepsCard
- Toont de partner hun huidige workflow status:
  1. Nieuwe aanvragen bevestigen
  2. Activiteit uitvoeren
  3. Factuur registreren
  4. Commissie afhandeling

**Alternatief:** Dit kan ook als onderdeel van de bestaande header stats worden verwerkt in plaats van een aparte component.

---

### 6. Mobiele Tab Optimalisatie

**Bestand: `PartnerDashboard.tsx`**
- Optimaliseer de tabs voor mobile weergave:
  - Horizontaal scrollbare tabs met overflow
  - Of: Dropdown/select voor tab keuze op mobile
  - Badge counts duidelijker op kleine schermen

---

## Bestandsoverzicht

| Bestand | Wijziging |
|---------|-----------|
| `src/components/partner-portal/PartnerItemCard.tsx` | "Nieuw" badge, duur weergave |
| `src/components/partner-portal/PartnerLayout.tsx` | Uitgebreide navigatie (3 items) |
| `src/pages/PartnerFinance.tsx` | **Nieuw** - Dedicated financiële pagina |
| `src/pages/PartnerDashboard.tsx` | Mobile tab optimalisatie |
| `src/App.tsx` | Nieuwe route toevoegen |

---

## Voorbeelden

### PartnerItemCard met "Nieuw" badge en duur

```text
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Gewijzigd door klant                    Versie 2     │
├─────────────────────────────────────────────────────────┤
│ Zeehondensafari                   [Nieuw] [Aangevraagd] │
│ Watersport                                              │
├─────────────────────────────────────────────────────────┤
│ 🏢 Bedrijf XYZ                                          │
│    📧 info@xyz.nl  📞 06-12345678  👥 25 personen       │
├─────────────────────────────────────────────────────────┤
│ 📅 Vrijdag 14 maart 2025                                │
│ 🕐 10:00                                                │
│ ⏱️ 2 uur                          ← NIEUW              │
├─────────────────────────────────────────────────────────┤
│ [          Reageren          ]                          │
└─────────────────────────────────────────────────────────┘
```

### Uitgebreide Sidebar Navigatie

```text
┌─────────────────────────┐
│ [Logo Bureau Vlieland]  │
├─────────────────────────┤
│ 🏢 Partner Naam         │
│    partner@email.nl     │
├─────────────────────────┤
│ 📊 Overzicht      [3]   │  ← Badge voor pending items
│ 💶 Facturatie           │  ← NIEUW
│ ⚙️ Instellingen         │
├─────────────────────────┤
│ [Uitloggen]             │
└─────────────────────────┘
```

### Partner Facturatie Pagina

```text
┌───────────────────────────────────────────────────────────┐
│ Facturatie Overzicht                                      │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  📊 Financieel Overzicht (uitgebreid)                     │
│  ┌─────────────┬─────────────┬─────────────┐              │
│  │ Gefact. YTD │ Te facturen │ Commissie   │              │
│  │ €12.500     │ €2.340      │ €1.875      │              │
│  └─────────────┴─────────────┴─────────────┘              │
│                                                           │
│  📋 Gefactureerde Items                                   │
│  ┌─────────────────────────────────────────┐              │
│  │ Zeehondensafari - XYZ B.V.              │              │
│  │ FA-2025-042 | €450 | 15 jan 2025        │              │
│  │ Commissie: €67,50 (15%) - Betaald ✓     │              │
│  └─────────────────────────────────────────┘              │
│  ┌─────────────────────────────────────────┐              │
│  │ Surfles - ABC Corp                      │              │
│  │ FA-2025-038 | €280 | 10 jan 2025        │              │
│  │ Commissie: €42,00 (15%) - In afwachting │              │
│  └─────────────────────────────────────────┘              │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## Volgorde van Implementatie

1. **PartnerItemCard uitbreiden** - "Nieuw" badge + duur weergave
2. **PartnerLayout navigatie** - Extra menu item toevoegen
3. **PartnerFinance pagina** - Nieuwe dedicated pagina maken
4. **App.tsx route** - Route registreren
5. **Mobile optimalisatie** - Tabs verbeteren voor kleinere schermen

---

## Technische Details

### "Nieuw" Badge Logica (PartnerItemCard)

```typescript
// Check if item is newly added (within last 24 hours and pending)
const isNewlyAdded = item.status === "pending" && 
  new Date(item.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;
```

### Navigatie Badge voor Pending Items (PartnerLayout)

De sidebar kan een badge tonen met het aantal pending items. Dit vereist dat we de summary data doorgeven aan de layout, of deze ophalen in de layout zelf.

**Optie A:** Context/prop drilling
**Optie B:** Aparte API call in PartnerLayout (minder efficiënt)
**Aanbevolen:** Een simpele implementatie zonder badge in eerste instantie, later toe te voegen als gewenst.

### PartnerFinance Data Requirements

Deze pagina hergebruikt de bestaande `usePartnerDashboard` hook data maar toont:
- Uitgebreider financieel overzicht
- Lijst van alle gefactureerde items met commissie status
- Filter opties per periode (maand, kwartaal, jaar)

