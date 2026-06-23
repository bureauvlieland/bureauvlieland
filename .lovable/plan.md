## Doel

Eén bron van waarheid voor de status van een programma-onderdeel — `deriveItemDisplayStatus` in `src/lib/itemStatus.ts` — overal in de app gebruiken. Vandaag gebruiken slechts 2 UI-plekken die functie; de rest heeft eigen label-maps. Daardoor kan dezelfde rij in admin "Klant akkoord" tonen en in partnerportal "Bevestigd", of in werkbank gewoon de ruwe DB-status "pending".

## Aanpak (2 stappen)

### 1. Data-audit (eenmalig, alleen rapport — geen mutaties)

Query op `program_request_items` om rijen te vinden waar de DB-staat intern niet logisch is. Niet-cancelled, niet-deleted items waar:

- `status='pending'` maar `customer_accepted_at IS NOT NULL` (klant heeft akkoord gegeven, status is niet bijgewerkt)
- `status='confirmed'` of `'accepted'` maar partner_id IS NULL (geen partner = bureau-item, status klopt niet)
- `item_quote_status='offerte_verstuurd'` of `'in_afstemming'` maar `status='cancelled'` (workflow-vlag was niet opgeschoond)
- `customer_accepted_at IS NOT NULL` terwijl `status NOT IN ('confirmed','accepted','executed','invoiced','cancelled')`

Output: CSV in `/mnt/documents/status-audit.csv` met `reference_number`, `item_id`, `title`, `status`, `item_quote_status`, `customer_accepted_at`, `partner_id`. Geen automatische correctie — eerst doorlopen met jou.

### 2. Code-audit + opschoning

Alle UI- en e-mail-/PDF-plekken laten lopen via `deriveItemDisplayStatus` + `ItemDisplayStatusBadge`, met `audience` `"admin"` | `"customer"` | `"partner"`. Eigen label-maps verwijderen.

Bevestigde overtreders die nu eigen logica hebben (incompleet — wordt aangevuld met explore-rapport):

**Partner portal (eigen `statusConfig` / `statusLabel`):**
- `src/components/partner-portal/PartnerItemRow.tsx`
- `src/components/partner-portal/PartnerItemCard.tsx`
- `src/components/partner-portal/PartnerProjectItemRow.tsx`
- `src/components/partner-portal/PartnerItemSheet.tsx`
- `src/components/partner-portal/PartnerWerkbankList.tsx`
- `src/components/partner-portal/PartnerProjectsList.tsx`
- `src/components/partner-portal/PartnerUnifiedList.tsx`
- `src/components/partner-portal/PartnerPlanningCalendar.tsx`
- `src/components/partner-portal/PartnerUpcomingActivities.tsx`

**Admin (ruwe `it.status` / eigen kleur-maps):**
- `src/components/admin/werkbank/ProjectDetailPanel.tsx` (toont letterlijk `it.status` en `it.item_quote_status`)
- `src/components/admin/projecten/WeekPlanningView.tsx` (eigen `STATUS_COLORS`, toont ruwe status)
- `src/components/admin/WorkOverview.tsx`
- `src/components/admin/AdminPartnerTimeline.tsx`
- `src/pages/admin/AdminPlanning.tsx`
- `src/pages/admin/AdminProjects.tsx` (overzicht)
- `src/pages/admin/AdminDashboard.tsx`

**Customer portal (oud pad nog aanwezig):**
- `src/components/customer-portal/ItemStatusBadge.tsx` — verwijderen of intern doorroepen naar `ItemDisplayStatusBadge`
- `src/components/customer-portal/MobileProgramView.tsx` — controleren
- `src/components/customer-portal/PriceSummaryCard.tsx` — controleren

**Audience uitbreiden:**
- `ItemDisplayStatusBadge` heeft nu `audience="admin"|"customer"`. Toevoegen: `audience="partner"` met partner-specifieke labels (bv. `geaccepteerd` → "Klantakkoord", `wacht_op_partner` → "Nieuw / Reactie gevraagd").
- In `itemStatus.ts` `partnerLabel` toevoegen aan `ItemDisplayStatusInfo`.

**E-mails / PDF / edge functions:**
- `supabase/functions/get-partner-dashboard/index.ts` retourneert status — controleren of frontend `deriveItemDisplayStatus` toepast op de gereturnde items (model identiek aan `ProgramRequestItem`). Zo niet: payload aanvullen met minimaal benodigde velden.
- E-mail-templates die status noemen (zoekstring "Wacht op", "Bevestigd", "Klantakkoord" in `supabase/functions/**`) afstemmen op één Nederlandse label-set; idem PDF-genereerders.

### Acceptatiecriteria

1. Eén project (bv. BV-2606-0011) in admin, klantportal én partnerportal naast elkaar tonen exact dezelfde status-tekst per item (rekening houdend met audience-verschil zoals "Klant akkoord" vs "Akkoord" vs "Klantakkoord").
2. `rg "statusConfig|statusLabel|STATUS_COLORS" src/components/partner-portal src/components/admin` levert geen treffers meer op (m.u.v. opzettelijke uitzonderingen).
3. `status-audit.csv` is leeg of bevat alleen rijen die we bewust met de hand fixen.

## Wat er NIET in zit

- Geen DB-migratie of mass-update; data-fixes na overleg met jou.
- Geen wijziging van workflow-logica (wie wordt wanneer akkoord), alleen weergave.
- Geen wijziging aan accommodatie-status (`AccommodationStatusBanner` heeft eigen domein).

## Volgorde van uitvoeren

1. CSV-audit draaien → samen door de gevallen lopen.
2. `partnerLabel` toevoegen aan `itemStatus.ts` + `audience="partner"` in `ItemDisplayStatusBadge`.
3. Partner-portal componenten 1-op-1 omzetten.
4. Admin overzichten/werkbank omzetten.
5. Customer-portal restanten opruimen (`ItemStatusBadge.tsx`).
6. Edge functions / e-mails / PDF nalopen.
7. Visuele cross-check op één live project + smoke-test op admin overzicht.
