## Wat ik wil doen

Drie aanpassingen op de projectdetailpagina (`AdminRequestDetail.tsx`) — alleen frontend/presentatie, plus per-project overrides voor fees.

### 1. "Overige kosten" altijd zichtbaar

**Probleem:** In `AdminRequestDetail.tsx` regel 2546 is de hele kaart geconditioneerd op `items.filter(item => item.day_index === -1).length > 0`. Op een project zonder losse kosten zie je dus ook de "+ Kosten toevoegen" knop niet — daarom lijkt het alsof de functionaliteit ontbreekt.

**Fix:** conditie verwijderen. Bij 0 items toont de kaart alleen de header + knop + lege‑staat regel ("Nog geen losse kosten geregistreerd").

### 2. Kostenposten van de factuur kunnen verwijderen

Op het Financieel Overzicht naast elke automatische kostenpost een klein kruisje/oog‑icoontje (per project):

- Toeristenbelasting
- Natuurbijdrage
- Opslag centrale facturatie
- Coördinatiefee

Klik = uitsluiten van factuur (regel verdwijnt visueel uit kostenoverzicht én uit totalen). Opnieuw aan = terugzetten op de standaard uit `app_settings`.

Opslag op `program_requests` als één jsonb kolom `excluded_fees` (array van keys: `tourist_tax | nature_contribution | central_surcharge | coordination_fee`). `calculateUnifiedInvoiceTotals` / `FinancialOverviewCard` houden hier rekening mee door de betreffende fee op 0 te zetten.

### 3. Compactere financiële weergave

Onder de Communicatie‑kaart staan nu 4 losse blokken onder elkaar:
1. Prijscontrole (oranje waarschuwing)
2. Facturatiemodel + Inkoopfacturen Partners (grid 1/3 + 2/3)
3. Voltooiingsstatus + Financieel Overzicht (grid 1/2 + 1/2)
4. Marge Overzicht (volle breedte)

Herindeling naar **één compact "Facturatie" blok**:

```text
┌─ Facturatie ─────────────────────────────────────────────┐
│ [Status pill: Klaar voor facturatie]   [Factuur maken ▾] │
│ ────────────────────────────────────────────────────────  │
│  Links: Voltooiingsstatus (compacte checklist)            │
│  Rechts: Financieel Overzicht (met fee‑toggles)           │
│ ────────────────────────────────────────────────────────  │
│  Tabs: [Inkoopfacturen] [Overige kosten] [Marge]          │
└──────────────────────────────────────────────────────────┘
```

- Facturatiemodel zin verdwijnt (info verhuist naar tooltip op de titel).
- Prijscontrole‑waarschuwing wordt een inline badge boven het Financieel Overzicht (alleen tonen bij verschil).
- "Overige kosten", "Inkoopfacturen" en "Marge" worden tabs i.p.v. drie aparte kaarten → scheelt ~60% verticale ruimte.

## Technisch

**Migratie:** `ALTER TABLE program_requests ADD COLUMN excluded_fees text[] DEFAULT '{}'`.

**Files:**
- `src/pages/admin/AdminRequestDetail.tsx` — conditie weghalen (regel 2546), financieel blok herstructureren (regel 2624‑2678).
- `src/components/admin/FinancialOverviewCard.tsx` — toggle‑iconen + nieuwe prop `excludedFees`; bij excluded de regel doorstrepen en uit subtotaal halen.
- `src/lib/invoiceTotals.ts` / `adminInvoicingTotals.ts` — `excluded_fees` doorgeven en betreffende fees op 0 zetten.
- Nieuwe component `FacturatieBlok.tsx` met interne Tabs (Inkoopfacturen / Overige kosten / Marge).

## Buiten scope
- Geen wijziging aan PDF‑rendering (gebruikt dezelfde totals‑helper → werkt automatisch).
- Geen wijziging aan klantportaal.
