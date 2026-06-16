## Diagnose

Het veld `block_type` op `program_request_items` doet vandaag **twee dingen door elkaar**:

1. **Aard van het blok** — `bureau` (zelf door Bureau geboekt, geen externe partner: veerboot, fietshuur, bagage) vs `partner` (echte externe partner voert uit) vs `self_arranged` (klant regelt).
2. **Wie factureert de klant** — historisch onderscheid tussen "bureau centraal" en "partner factureert klant direct".

Dat tweede onderscheid is **dood**: alle 67 projecten in de database hebben `invoicing_mode='bureau_central'`, en er is geen pad meer waarin een partner de klant rechtstreeks factureert. Toch zet de admin-UI bij nieuwe items nog steeds `block_type='bureau'` zodra "factuur via Bureau" wordt aangevinkt — óók als er een echte partner achter zit. Resultaat: **120 items in productie** hebben `block_type='bureau'` met een echte partner als `provider_id`. Die items worden vervolgens door zo'n 15+ checks (`block_type === "bureau"`) systematisch uitgesloten van álle partner-notificaties — annulering, wijzigingen, reminders, akkoord, prijswijziging, T-7/T-3, etc. Precies wat we zagen bij Vlieland Outdoor Center op BV-2606-0005.

## Doel

`block_type` betekent vanaf nu uitsluitend **"aard van het blok"**. Of een item door Bureau Vlieland centraal wordt afgehandeld (= geen externe partner-notificaties) wordt overal bepaald door één bron van waarheid: `isBureauItem(item)`, gebaseerd op `provider_id ∈ BUREAU_PROVIDER_IDS` (`bureau`, `bureau-vlieland`, `rederij`, `fietsverhuur`, `bagagevervoer-vlieland`). Facturatie is altijd centraal en verdwijnt als keuze uit de UI.

## Stappen

### 1. Eén gedeelde helper voor de front-end
Nieuw bestand `src/lib/bureauItem.ts` met dezelfde logica als `supabase/functions/_shared/bureau-item.ts` (`BUREAU_PROVIDER_IDS`, `isBureauItem`, `excludeBureauItems`). De edge-function helper blijft de bron; front-end mirrort 'm exact.

### 2. Alle `block_type === "bureau"` checks vervangen door `isBureauItem(item)`
Refactor in deze bestanden (waar het over een *item* gaat, niet over een *building_block-catalogus*):

- `src/pages/admin/AdminRequestDetail.tsx` (regel 138, 866-867, 2331, 2451, 2639, 2665, 3183, 3186)
- `src/components/admin/PublishChangesDialog.tsx` (168)
- `src/components/admin/NotifyHeadcountChangeDialog.tsx` (68)
- `src/components/admin/werkbank/ProjectDetailPanel.tsx` (464-465 — UI-label "· bureau" wordt "· Bureau Vlieland regelt")
- `supabase/functions/check-pending-items/index.ts` (780, 845, 913, 1063)
- `supabase/functions/update-customer-program/index.ts` (397, 1114)
- `supabase/functions/update-partner-item-status/index.ts` (626, 632)
- `supabase/functions/publish-program-changes/index.ts` (625)
- `supabase/functions/send-partner-headsup-t3/index.ts` (123)
- `supabase/functions/accept-quote-proposal/index.ts` (664)
- `supabase/functions/backfill-all-responded-todos/index.ts` (79, 111)
- `supabase/functions/claudia-daily-scan/index.ts` (50)
- `supabase/functions/notify-partner-cancellation/index.ts` (al goed — gebruikt helper)

`building_blocks.block_type` blijft in catalogus-context ongemoeid (catalogus beschrijft een blok-type, niet een item).

### 3. UI-keuze "wie factureert" weghalen
Centrale facturatie is dwingend.
- `AdminAddActivitySheet.tsx`: weg met `invoicedBy` state + radio (rond 88, 132, 152, 161, 327, 345). `block_type` op insert = `selectedBlock.block_type` van de catalogus (`bureau`/`partner`/`self_arranged`), niet meer geforceerd op `bureau` door een toggle.
- `AdminEditActivitySheet.tsx`: zelfde behandeling (112, 192, 233, 241, 474, 479, 568, 586).
- `AdminAiProgramDialog.tsx` regel 160 en `ApplyTemplateDialog.tsx` regel 69: gewoon `block.block_type` overnemen, `invoicingMode`-prop droppen.
- Prop `invoicingMode` overal in admin-aanroepen verwijderen (klant-portal mag 'm houden voor cosmetische copy in `AccommodationSection` etc., dat is alleen tekst).

### 4. Data-migratie
Eénmalig de 120 vervuilde items rechtzetten:

```
UPDATE program_request_items
SET block_type = 'partner'
WHERE block_type = 'bureau'
  AND provider_id IS NOT NULL
  AND provider_id NOT IN ('bureau','bureau-vlieland','rederij','fietsverhuur','bagagevervoer-vlieland');
```

En de 4 omgekeerde gevallen (bureau-managed provider met block_type='partner'):

```
UPDATE program_request_items
SET block_type = 'bureau'
WHERE block_type = 'partner'
  AND provider_id IN ('bureau-vlieland','rederij','fietsverhuur','bagagevervoer-vlieland');
```

Na de migratie zou `isBureauItem(item)` en `item.block_type === 'bureau'` voor alle bestaande rijen hetzelfde resultaat opleveren — zodat de refactor ook backwards bruikbaar blijft als ergens een check vergeten wordt.

### 5. Test op BV-2606-0005
- Open project, klik "Partners alsnog informeren over annulering".
- Verwachting: dialog toont nu **Vliehors Expres + Bunkermuseum + Vlieland Outdoor Center** (3 activiteitenpartners), niet 2.
- Verstuur, check `email_log` en projectcommunicatie-tijdlijn.

### 6. Documentatie
Memory `[Invoicing Rules]` (`mem://business/invoicing-centralization-rules`) updaten: `block_type` is geen invoicing-signaal meer; `isBureauItem()` is de bron voor "geen externe partner-notificatie". `[Internal Workflow]` (`mem://business/bureau-internal-item-workflow`) idem.

## Buiten scope
- Database-kolom `invoicing_mode` op `program_requests` verwijderen — kan later, raakt veel klant-portal copy.
- Klant-portal cosmetische `invoicingMode`-props opruimen — niet nodig voor correctheid.
- `building_blocks.block_type`-enum aanpassen — blijft `bureau|partner|self_arranged` voor de catalogus.

## Risico's
- Refactor raakt ~15 edge functions en ~10 front-end bestanden; allemaal kleine vervangingen van één conditie. Test-suites (`check-pending-items/dedup_test.ts`) updaten zodat ze `isBureauItem` aanroepen i.p.v. literal `block_type`.
- Na de data-migratie worden 120 items "zichtbaar" voor partner-notificaties die ze voorheen niet kregen. Geen automatische mass-mail — die notificaties triggeren alleen bij toekomstige acties (wijziging/annulering/reminder). Wel even checken of de eerstvolgende `check-pending-items` cron niet ineens een lawine reminders verstuurt; eventueel `last_*_at`-velden respecteren is al ingebouwd.
