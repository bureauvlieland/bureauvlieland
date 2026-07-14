## Bevindingen

Uit een sweep van alle notify-/publish-flows blijkt dat de rest van het notificatie-landschap grotendeels correct is (annulering, item-verwijdering, logies-offertes — die informeren terecht partners die al betrokken zijn). Er zit echter één **actief gat** en twee **dode-code-risico's** die dezelfde structurele fout hebben als de net-gefixte headcount-flow.

### 1. `publish-program-changes` (actief, hoogste impact)
`supabase/functions/publish-program-changes/index.ts:769-830` stuurt bulk-mail naar aangevinkte partners over pending wijzigingen (tijd, prijs, aantal, locatie, uitvoerder, etc.). Er is **geen** filter op `customer_approved_at` / `customer_accepted_at`. Consequentie: een item dat nog nooit door de klant is goedgekeurd (nog concept / offerte-fase) kan alsnog een "wijziging gepubliceerd"-mail naar de partner triggeren. Zelfde patroon dat we net dichttimmerden voor headcount.

De bijbehorende UI (`src/components/admin/PublishChangesDialog.tsx`, `PendingChangeItem` regel 22-57) laadt deze velden niet, dus de admin kán niet eens zien dat een item nog niet goedgekeurd is.

### 2. `notify-partner-price-change` (dode code)
`supabase/functions/notify-partner-price-change/index.ts:50-93` — geen approval-check. Wordt nergens meer vanuit `src/` aangeroepen (alleen in `edgeFunctionTestCoverage.ts`); vervangen door `publish-program-changes`. Latente bug als hij ooit weer wordt gekoppeld.

### 3. `notify-customer-price-change` (dode code)
`supabase/functions/notify-customer-price-change/index.ts:49-80` — idem. Niet meer aangeroepen vanuit `src/`.

### Bewust NIET gefixt (correct gedrag)
- `notify-partner-item-deletion` — bevat al de juiste gate (`skip_partner_notification && !customer_approved_at && status=pending` → skip).
- `notify-partner-cancellation` / `cancel-program-request` — annulering moet elke betrokken partner bereiken, ook zonder klant-akkoord.
- `notify-accommodation-quote` — eerste aankondiging van een quote, geen wijziging.
- `override-item-status`, `update-partner-item-status` — geen premature-mail-scenario.
- Geen DB-triggers gevonden die notify-functies buiten expliciete acties om aanroepen.

## Wijzigingen

### A. `supabase/functions/publish-program-changes/index.ts` — approval-gate toevoegen

Rond het opbouwen van `changeRows` en `notifyPartnerIds` (regel 769-830): filter items zodat alleen `customer_approved_at IS NOT NULL || customer_accepted_at IS NOT NULL` in de partner-mail worden meegenomen. Items zonder klant-akkoord worden intern nog steeds gepubliceerd (DB-update van pending changes blijft draaien), maar de partner krijgt geen mail — pas bij goedkeuring gaan die items sowieso als reguliere offerte-aanvraag naar de partner.

Return-payload uitbreiden met `skipped_not_approved: [itemId,…]` per partner, zodat de UI kan tonen "X items niet gemaild — klant heeft ze nog niet goedgekeurd".

### B. `src/components/admin/PublishChangesDialog.tsx` — UI-signalering

- `PendingChangeItem` uitbreiden met `customer_approved_at` en `customer_accepted_at` (bron: bestaande fetch die deze velden al beschikbaar heeft in AdminRequestDetail).
- Bij het opbouwen van de "wie krijgt een mail?"-lijst per partner: items zonder klant-akkoord tonen met badge "wacht op klant" en uitsluiten van de partner-mail-telling.
- Hint boven de partner-sectie: "Partners worden alleen gemaild voor onderdelen die de klant al heeft goedgekeurd — offerte-onderdelen volgen automatisch bij goedkeuring."
- Toast na versturen: als backend `skipped_not_approved > 0` teruggeeft, extra regel "N onderdelen overgeslagen — nog niet goedgekeurd door klant".

### C. Dode code opruimen

`notify-partner-price-change` en `notify-customer-price-change` verwijderen via `supabase--delete_edge_functions` (functies zijn niet meer aangeroepen; `publish-program-changes` heeft de rol overgenomen). Verwijzingen in `src/lib/edgeFunctionTestCoverage.ts` weghalen.

### D. Kleine test

Utility uitbreiden of tweede utility toevoegen (`shouldPublishPartnerChangeMail`) die dezelfde regel toepast, met unit-tests voor de vier gevallen (approved, accepted, neither, cancelled). Hergebruikt de regel uit `shouldNotifyPartnerOfHeadcountChange` waar mogelijk.

## Buiten scope
- Product-intentie van "publiceren zonder klant-akkoord" (open vraag uit onderzoek): we gaan uit van de reeds vastgestelde regel — partners horen pas na klant-akkoord ingelicht te worden over wijzigingen. Als je wél wilt kunnen publiceren zonder akkoord (bv. om een tegenvoorstel te maken), zeg dat dan expliciet en we voegen een override-checkbox toe.
- Refactor van `publish-program-changes` structuur zelf.
- Aanpassingen aan cancellation / deletion / logies flows — die zijn correct.
