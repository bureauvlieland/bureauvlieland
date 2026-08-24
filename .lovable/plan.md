# Nieuwe prijsstructuur (organisatiefee 2.0)

Bestaande projecten blijven op hun huidige bedragen. Alleen projecten die na invoering worden aangemaakt rekenen met de nieuwe structuur. Toeristenbelasting en natuurbijdrage blijven ongewijzigd (0% BTW).

## 1. Coördinatiefee

Nieuwe staffels met basisbedrag (dag 1):

| Groep | Basis |
|---|---|
| 1–10 | € 175 |
| 11–25 | € 250 |
| 26–50 | € 395 |
| 51–100 | € 595 |
| 101–150 | € 895 |
| 151+ | € 1.250 |

- Extra dagen: standaard **60%** van het basisbedrag per dag na dag 1 (instelbaar; 100% = vol doorrekenen).
- Aantal dagen komt uit de programmadatums van het project.
- Voorbeeld: 3 dagen, 51–100 pers. → 595 + 2 × 357 = **€ 1.309**.

## 2. Nieuwe posten

- **Wijzigingsfee — € 95 per ronde** na klantakkoord. Bij publiceren van wijzigingen na akkoord stelt het systeem de fee voor; de admin vinkt per ronde aan of die gefactureerd wordt. Aangevinkte rondes komen als aparte regel op de factuur: "Programmawijziging ronde 2 — 24-08".
- **Spoedtoeslag — 25%** over de coördinatiefee als de aanvraagdatum binnen **4 weken** voor aankomst valt. Wordt automatisch bepaald bij aanmaak van het project en meegenomen in de snapshot.
- **Annulering** — bij annulering van een project dat al verstuurd of akkoord was, blijft de organisatiefee (incl. spoedtoeslag) factureerbaar. Op geannuleerde projecten komt een actie **"Factureer organisatiefee"** die direct een factuur met alleen die regel(s) aanmaakt.

## 3. Opslag centrale facturatie

De vaste € 2,50 p.p. vervalt en wordt **3% over de partnerkosten** op de factuur, met **minimum € 75** per project. Beide instelbaar. Eén factuurregel: "Opslag centrale facturatie".

## 4. Offerte en factuur

- Alle fees rekenen automatisch mee en staan als aparte, benoemde regels met het juiste BTW-tarief (fees 21%, heffingen 0%).
- Nieuw **"Fee-overzicht"-paneel** in de projectdetailpagina: welke staffel, hoeveel dagen, dag 2+ percentage, spoedtoeslag, opslag centrale facturatie en wijzigingsrondes — met de rekenregel per post.
- Per-project uitsluiten van kostenposten (bestaande `excluded_fees`) blijft werken, ook voor de nieuwe posten.

## 5. Beheer (Prijzen)

- Zelfde kaartstijl en "Laatst gewijzigd"-tijdstempels als nu.
- Nieuwe kaarten: coördinatiefee-staffels (met dag 2+ percentage), wijzigingsfee, spoedtoeslag, opslag centrale facturatie.
- **Ingangsdatum per prijsinstelling**: je kunt een nieuwe structuur klaarzetten die automatisch op de gekozen datum actief wordt (bv. start boekingsseizoen). Tot die datum blijft de huidige versie gelden, met zichtbare melding "gepland vanaf dd-mm-jjjj".

---

## Technische uitwerking

**Migratie**
- Nieuwe tabel `public.pricing_structures`: `key`, `value` (jsonb), `effective_from` (date), `label`, `created_at/updated_at`, RLS: lezen door `authenticated`, schrijven alleen admin, plus GRANTs (`authenticated` select, `service_role` all). Actieve versie = hoogste `effective_from <= now()` per `key`.
- Seed keys: `coordination_fee` (tiers + `extra_day_pct: 60`), `revision_fee` (95), `rush_surcharge` (`pct: 25`, `weeks: 4`), `central_invoicing_surcharge` (`pct: 3`, `minimum: 75`).
- `program_requests`: nieuwe kolom `fee_snapshot jsonb` — de volledige actieve structuur + afgeleide bedragen op moment van aanmaak. Bestaande rijen krijgen via backfill een snapshot van de huidige structuur (oude staffel, € 2,50 p.p., geen spoed/wijzigingsfee), zodat lopende projecten ongewijzigd blijven.
- `program_requests.revision_rounds jsonb[]`/aparte tabel `program_revision_charges` (`request_id`, `round`, `published_at`, `billable boolean`, `amount`) voor de aangevinkte wijzigingsrondes.

**Code**
- Nieuw `src/lib/feeEngine.ts`: één berekening (staffel → dagen → dag 2+ pct → spoedtoeslag → centrale opslag met minimum → wijzigingsfees) die uitsluitend op de snapshot van het project werkt, met fallback naar de actieve structuur voor nog niet-gesnapshotte projecten.
- `src/lib/customerFeeTotals.ts`, `src/lib/adminInvoicingTotals.ts` en `src/lib/invoiceTotals.ts` gaan door `feeEngine` heen in plaats van de losse `bureau_central_surcharge_pp` / `getCoordinationFee` logica; partnerkostentotaal wordt doorgegeven voor de percentage-opslag.
- `src/types/appSettings.ts` + `useAppSettings`: nieuwe hook `usePricingStructure` voor actieve/geplande versies; oude settings blijven staan voor de backfill-snapshots.
- Admin: `AdminSettings.tsx` uitgebreid met de nieuwe kaarten en ingangsdatum-veld; `TierEditor`-patroon hergebruikt voor de min/max-staffels.
- Nieuw `FeeBreakdownPanel.tsx` in de projectdetailpagina; `PublishChangesDialog` krijgt de checkbox "wijzigingsfee factureren"; geannuleerde projecten krijgen de actie "Factureer organisatiefee" die de bestaande factuurflow met alleen fee-regels aanroept.
- Unit tests voor `feeEngine` (staffelgrenzen, meerdaags, spoedgrens 4 weken, minimum-opslag, snapshot-onveranderlijkheid).
