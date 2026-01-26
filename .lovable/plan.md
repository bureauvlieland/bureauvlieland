
# Plan: Partner Portal Herontwerp & Uitbreiding

## Analyse - Huidige Problemen

### 1. Flow & Logica Problemen
- **Facturatiegegevens te vroeg zichtbaar**: Partners zien nu direct de "Facturatie registreren" knop zodra zij bevestigen, terwijl de klant mogelijk nog niet alles heeft geaccepteerd
- **Dubbele financiële overzichten**: `PartnerFinancialSummary` op Dashboard EN aparte Facturatie pagina met vergelijkbare data
- **Tab structuur verwarrend**: "Bevestigd" tab bevat items die nog gefactureerd moeten worden - onduidelijk onderscheid
- **Geen aanbod beheer**: Partners kunnen hun eigen bouwstenen niet zien of beheren

### 2. Terminologie Inconsistenties
| Huidige term | Probleem | Voorstel |
|--------------|----------|----------|
| "Reageren" | Onduidelijk wat dit betekent | "Bevestigen of afwijzen" |
| "Te bevestigen" | OK maar inconsistent met "Aangevraagd" badge | Afstemmen |
| "Wacht op klant" | Correct | Behouden |
| "Afgehandeld" | Misleidend - bevat geannuleerde én niet-beschikbare items | Splitsen of hernoemen naar "Afgesloten" |
| "Gefactureerd" | In Dashboard tab én Facturatie pagina | Verwijderen uit Dashboard |

### 3. Dubbele Functionaliteit
- **Gefactureerd tab** in Dashboard dupliceert Facturatie pagina
- **PartnerFinancialSummary** in Dashboard dupliceert info op Facturatie pagina
- **Items "Te factureren"** staan in Dashboard "Bevestigd" tab én Facturatie pagina

---

## Voorgestelde Wijzigingen

### 1. Vereenvoudigde Tab Structuur (Dashboard)

**Van 5 tabs → 4 tabs:**

| Tab | Inhoud | Badge |
|-----|--------|-------|
| **Nieuw** | `status === "pending"` | Aantal nieuw |
| **In behandeling** | `status === "alternative"` | Aantal wachtend |
| **Bevestigd** | `status === "confirmed"` (alle bevestigde) | Aantal |
| **Afgesloten** | `status in ["unavailable", "cancelled"]` | - |

- **Verwijder "Gefactureerd" tab** → deze data zit in Facturatie pagina
- **Hernoem "Te bevestigen"** → "Nieuw"
- **Hernoem "Wacht op klant"** → "In behandeling"
- **Combineer "Afgehandeld"** met duidelijke status labels

### 2. Facturatie Flow Aanpassen

**Kernregel: Partner krijgt facturatiegegevens pas nadat de klant `terms_accepted_at` heeft ingevuld.**

**Implementatie:**
1. Edge function `get-partner-dashboard` uitbreiden met `terms_accepted_at` check
2. In `PartnerItemCard`: "Facturatie registreren" knop alleen tonen als `program_requests.terms_accepted_at !== null`
3. Visuele indicator toevoegen: "Wacht op klantbevestiging" wanneer item confirmed maar klant nog niet getekend

**Nieuwe status flow voor partner:**
```text
┌────────────┐    ┌──────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   Nieuw    │ → │  Bevestigd   │ → │ Klaar voor factuur  │ → │  Gefactureerd   │
│ (pending)  │    │ (confirmed)  │    │ (terms accepted)    │    │ (invoiced)      │
└────────────┘    └──────────────┘    └─────────────────────┘    └─────────────────┘
```

### 3. Uitgebreide Navigatie met Aanbod Beheer

**Sidebar uitbreiden:**
```text
┌─────────────────────────┐
│ [Logo Bureau Vlieland]  │
├─────────────────────────┤
│ 🏢 Partner Naam         │
├─────────────────────────┤
│ 📊 Dashboard      [3]   │  ← Huidige overzicht
│ 📦 Mijn Aanbod          │  ← NIEUW: Eigen bouwstenen
│ 💶 Facturatie           │  ← Bestaand
│ ⚙️ Instellingen         │  ← Bestaand
├─────────────────────────┤
│ [Uitloggen]             │
└─────────────────────────┘
```

### 4. Nieuwe Pagina: "Mijn Aanbod" (Partner Building Blocks)

**Route:** `/partner/aanbod`

**Functionaliteit:**
- Partners zien alleen hun eigen bouwstenen (`provider_id = partner.id`)
- Kunnen basis velden bewerken: beschrijving, prijs, duur, min/max personen
- Kunnen NIET: ID wijzigen, publicatiestatus wijzigen, categorie/type wijzigen
- Kunnen nieuwe bouwstenen voorstellen (concept status, admin moet publiceren)

**UI Ontwerp:**
```text
┌───────────────────────────────────────────────────────────┐
│ Mijn Aanbod                                    [+ Nieuw]  │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [img] Zeehondentocht              [Gepubliceerd] ✓  │  │
│  │       €35,00 p.p. • 2-3 uur • 10-40 personen        │  │
│  │       [Bewerken]                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ [img] Wadlopen                    [Concept] 📝      │  │
│  │       €45,00 p.p. • 3 uur • 8-20 personen           │  │
│  │       Wacht op goedkeuring Bureau Vlieland          │  │
│  │       [Bewerken]                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 5. Dashboard Vereenvoudiging

**Verwijder uit Dashboard:**
- `PartnerFinancialSummary` component (dupliceert Facturatie)
- "Gefactureerd" tab

**Behoud/verbeter:**
- `PartnerDashboardHeader` met stats kaarten (enkel actie-gerelateerd)
- Tabs met focus op pending acties

**Nieuwe stats kaarten:**
```text
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Nieuw       │ In          │ Bevestigd   │ Klaar voor  │
│ 3           │ behandeling │ 12          │ factuur     │
│             │ 1           │             │ 4           │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### 6. Terminologie Standaardisatie

**Actie knoppen:**
| Oud | Nieuw |
|-----|-------|
| "Reageren" | "Bevestigen" |
| "Voorstel aanpassen" | "Aanpassen" |
| "Facturatie registreren" | "Factuur registreren" |

**Status labels (consistent met klantportaal):**
| Status | Partner ziet | Klant ziet |
|--------|--------------|------------|
| pending | Aangevraagd | Aangevraagd |
| confirmed | Bevestigd | Bevestigd |
| alternative | Alternatief | Alternatief voorgesteld |
| unavailable | Niet beschikbaar | Niet beschikbaar |
| cancelled | Geannuleerd | Geannuleerd |

---

## Technische Implementatie

### Database Wijzigingen

**Geen nieuwe tabellen nodig** - we gebruiken bestaande structuur:
- `building_blocks` heeft al `provider_id` en RLS policy "Partners can view their own blocks"
- Voeg RLS policy toe voor partners om eigen blocks te updaten (beperkte velden)

**Nieuwe RLS policy voor building_blocks:**
```sql
-- Partners kunnen hun eigen blocks beperkt updaten
CREATE POLICY "Partners can update own blocks limited" 
ON public.building_blocks
FOR UPDATE
USING (provider_id = get_partner_id(auth.uid()))
WITH CHECK (provider_id = get_partner_id(auth.uid()));
```

### Edge Function Wijzigingen

**`get-partner-dashboard/index.ts`:**
- Voeg `terms_accepted_at` toe aan program_requests select
- Retourneer nieuwe summary velden voor "klaar voor factuur"

### Nieuwe Bestanden

| Bestand | Doel |
|---------|------|
| `src/pages/PartnerBlocks.tsx` | Nieuwe "Mijn Aanbod" pagina |
| `src/components/partner-portal/PartnerBlockCard.tsx` | Aanbod kaart component |
| `src/components/partner-portal/PartnerBlockSheet.tsx` | Sheet voor bewerken eigen aanbod |

### Bestaande Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/PartnerDashboard.tsx` | Tabs vereenvoudigen, FinancialSummary verwijderen |
| `src/components/partner-portal/PartnerLayout.tsx` | Navigatie uitbreiden met "Mijn Aanbod" |
| `src/components/partner-portal/PartnerItemCard.tsx` | Facturatie knop conditioneel op terms_accepted |
| `src/components/partner-portal/PartnerDashboardHeader.tsx` | Stats aanpassen |
| `src/types/partner.ts` | `terms_accepted_at` toevoegen aan interface |
| `src/App.tsx` | Route `/partner/aanbod` toevoegen |
| `supabase/functions/get-partner-dashboard/index.ts` | terms_accepted_at meesturen |

---

## Voorbeelden

### PartnerItemCard met Facturatie Conditie

```text
Situatie A: Klant heeft nog niet getekend
┌─────────────────────────────────────────────────────────┐
│ Zeehondensafari                           [Bevestigd]   │
│ XYZ B.V. • 25 personen • 14 maart 2025                  │
├─────────────────────────────────────────────────────────┤
│ ⏳ Wacht op klantbevestiging                            │
│ De klant moet eerst de voorwaarden accepteren           │
└─────────────────────────────────────────────────────────┘

Situatie B: Klant heeft getekend
┌─────────────────────────────────────────────────────────┐
│ Zeehondensafari                           [Bevestigd]   │
│ XYZ B.V. • 25 personen • 14 maart 2025                  │
├─────────────────────────────────────────────────────────┤
│ ✓ Klant heeft geboekt op 10 jan 2025                    │
│ [        Factuur registreren        ]                   │
└─────────────────────────────────────────────────────────┘
```

### Vereenvoudigd Dashboard

```text
┌───────────────────────────────────────────────────────────┐
│ Dashboard                              [3 nieuwe aanvr.]  │
├───────────────────────────────────────────────────────────┤
│ ┌─────────┬─────────┬─────────┬─────────┐                 │
│ │ Nieuw   │ In beh. │ Bevest. │ Te fact.│                 │
│ │ 3       │ 1       │ 12      │ 4       │                 │
│ └─────────┴─────────┴─────────┴─────────┘                 │
├───────────────────────────────────────────────────────────┤
│ [Nieuw] [In behandeling] [Bevestigd] [Afgesloten]         │
├───────────────────────────────────────────────────────────┤
│ ... item cards ...                                        │
└───────────────────────────────────────────────────────────┘
```

---

## Volgorde van Implementatie

1. **Database & Edge Function** - RLS policy + terms_accepted_at in dashboard
2. **Types bijwerken** - PartnerItem interface uitbreiden
3. **PartnerItemCard** - Facturatie conditie + nieuwe labels
4. **PartnerDashboard** - Tabs herstructureren, FinancialSummary verwijderen
5. **PartnerDashboardHeader** - Stats aanpassen
6. **PartnerLayout** - Navigatie uitbreiden
7. **PartnerBlocks pagina** - Nieuwe "Mijn Aanbod" pagina
8. **App.tsx** - Route toevoegen
