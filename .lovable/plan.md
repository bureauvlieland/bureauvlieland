## Probleem

Op BV-2606-0011 staan beide overtocht-items (Harlingen↔Vlieland) op `status='pending'` met `item_quote_status='in_afstemming'`. In de klantportal toont `CustomerProgramItem` daarom "· voorlopig" achter de prijs, ook al heb je als admin de prijs (€137,10) en de toelichting al gezet. Fietshuur staat wél op `status='confirmed'` / `item_quote_status='bevestigd'` en wordt dus als definitief getoond.

## Oorzaak

In `AdminEditActivitySheet.handleSave` (regels ~260-308) zit een auto-akkoord-tak die voor **bureau-items** (`block_type='bureau'`, dus ferry/fiets/bagage/bureau) automatisch `status='confirmed'`, `item_quote_status='bevestigd'`, `quoted_at`, `customer_approved_at`, `customer_accepted_at` en `skip_partner_notification=true` zet. Maar die tak draait **alleen als het item nog een draft is** (`pending_added===true`).

Voor reeds gepubliceerde items gaat de save naar de pending-flow: `pending_admin_price_override` etc. worden gevuld en je moet "Publiceer & notificeer" doen. In `supabase/functions/publish-program-changes/index.ts` (regels ~590-637) wordt de prijs wel gepromoveerd naar live, maar de auto-akkoord-logica voor bureau-items ontbreekt daar — dus `status` blijft 'pending' en de klantportal blijft "voorlopig" tonen.

Fietshuur is waarschijnlijk vóór de eerste publicatie aangepast (draft-tak), de overtochten zijn ná publicatie aangepast (pending → publish-tak).

## Fix

### 1. `supabase/functions/publish-program-changes/index.ts`

Direct nadat per item het `upd`-object is opgebouwd (rond regel 637, vóór `await supabase.from("program_request_items").update(upd)`), bureau-auto-akkoord toevoegen, in lijn met de draft-flow in `AdminEditActivitySheet`:

```ts
// Bureau-interne posten kennen geen partner-akkoord-traject én geen aparte
// klant-akkoord-stap: zodra admin de prijs/inhoud publiceert is dit
// definitief. Voorkomt dat klantportal "voorlopig" blijft tonen.
const effectiveStatus = (upd.status as string | undefined) ?? it.status;
if (effectiveBlockType === "bureau" && effectiveStatus === "pending") {
  upd.status = "confirmed";
  upd.item_quote_status = "bevestigd";
  upd.quoted_at = upd.quoted_at ?? nowIso;
  upd.customer_approved_at = upd.customer_approved_at ?? nowIso;
  upd.customer_accepted_at = upd.customer_accepted_at ?? nowIso;
  upd.skip_partner_notification = true;
}
```

Belangrijk: deze tak alleen toepassen als `resetCustomerApproval` níet hierboven `customer_*_at` op `null` heeft gezet voor een live bureau-item (huidige code reset alleen `customer_approved/accepted_at`, niet `status`, dus geen conflict — maar wel `??` gebruiken zodat reset-keuze prioriteit houdt). Voor `effectiveBlockType==='bureau'` is `resetPartnerApproval` al niet van toepassing (zie bestaande `effectiveBlockType !== "bureau"` guard regel 633).

### 2. Eenmalige data-fix voor BV-2606-0011

Voor de twee overtocht-items (`3562fceb-…` en `5dfed936-…`) handmatig dezelfde velden zetten zodat ze nu al definitief worden in de klantportal:

- `status = 'confirmed'`
- `item_quote_status = 'bevestigd'`
- `quoted_at = now()` (indien null)
- `customer_approved_at = now()` (indien null)
- `customer_accepted_at = now()` (indien null)
- `skip_partner_notification = true`

### 3. Niet in scope

- Geen wijzigingen aan `deriveItemDisplayStatus` of aan de "voorlopig"-label-logica zelf — die is correct (basis = `status==='pending'`), het probleem is dat de status niet doorgezet werd.
- Geen wijzigingen aan partner-portal of email-templates.
- Geen retro-scan over alle andere projecten; als je dat wilt voer ik dat als losse data-fix uit na akkoord.

## Wat moet je als admin nu doen (zonder fix)

Tot de fix gedeployed is kun je de overtochten definitief maken door in admin op het item de "Publiceer & notificeer"-flow te draaien én daarna handmatig de status te overriden via de bestaande admin status-override-knop op het item (gebruikt `override-item-status` edge function → zet `status='confirmed'`). Met de fix hierboven is dat niet meer nodig: publiceren van een bureau-item bevestigt automatisch.
