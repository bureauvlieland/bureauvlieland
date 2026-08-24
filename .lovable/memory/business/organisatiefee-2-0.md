---
name: Organisatiefee 2.0 (fee-engine & snapshots)
description: Staffels, extra dagen, spoedtoeslag, wijzigingsfee en 3% centrale-facturatie-opslag; snapshot per project bevriest oude bedragen
type: feature
---

# Feestructuur

Actieve tarieven staan in `public.pricing_structures` (per `key` de versie met hoogste `effective_from <= vandaag`). Keys: `coordination_fee`, `revision_fee`, `rush_surcharge`, `central_invoicing_surcharge`.

Actuele waarden (DEFAULT_FEE_STRUCTURE in `src/types/pricing.ts`):
- Organisatiefee dag 1: 1-10 = €175, 11-25 = €250, 26-50 = €395, 51-100 = €595, 101-150 = €895, 151+ = €1250 (incl. BTW).
- Elke dag ná dag 1: 60% van het basisbedrag.
- Spoedtoeslag: 25% over de organisatiefee als de aanvraag binnen 4 weken voor aankomst valt.
- Wijzigingsfee: €95 per wijzigingsronde ná klantakkoord (per ronde aan/uit via `program_revision_charges.billable`).
- Opslag centrale facturatie: 3% over de partnerkosten incl. logies, minimaal €75 per project (alleen bij `invoicing_mode = 'bureau_central'`).

# Bevriezen van bestaande projecten (hard requirement)

- Elk project legt de structuur vast in `program_requests.fee_snapshot` via de BEFORE INSERT trigger `trg_snapshot_fee_structure`; de snapshot bevat ook of de spoedtoeslag gold (`rush_surcharge.applies`).
- `resolveFeeStructure(snapshot, activeStructure)` laat de snapshot **altijd** voorgaan. Zonder snapshot geldt `LEGACY_FEE_STRUCTURE` (oude staffels + €2,50 p.p. centrale opslag), zodat de 91 bestaande projecten hun bedragen houden.
- Tariefwijzigingen in de admin krijgen een ingangsdatum en raken nooit bestaande projecten.

# Berekening

`src/lib/feeEngine.ts` is de enige rekenkern (`computeProjectFees`) en levert ook de uitlegregels (`explanations`) voor het fee-overzicht. Aangesloten via `adminInvoicingTotals`, `invoiceTotals` en `customerFeeTotals` (allemaal met optionele `feeStructure`). Toeristenbelasting en natuurbijdrage blijven buiten de engine (0% BTW). Uitsluitingen via `excluded_fees` blijven gelden.
