## Doel
1. De misleidende toast na klantannulering vervangen door een accurate melding.
2. Direct na de annulering (zowel klant- als admin-trigger vanuit projectdetail) een dialog openen die toont welke activiteiten- en logiespartners betrokken zijn, zodat de admin per partner kan kiezen of er een annuleringsmail uitgaat — vergelijkbaar met de bestaande "wijzigingen publiceren"-flow.

## Wat er verandert

### 1. `cancel-program-request` (edge function)
- Naast `providersNotified`/`accommodationPartnersNotified` ook teruggeven:
  - `affected_activity_partners: [{ partner_id, name, email, item_names: [...] }]`
  - `affected_accommodation_partners: [{ partner_id, name, email, accommodation_name, previous_quote_status }]`
- De automatische `admin_todo` "informeer X partners handmatig" wordt verwijderd (vervangen door de inline dialog). De interne BCC-mail naar Bureau Vlieland blijft.

### 2. `notify-partner-cancellation` (edge function)
- Optionele filters toevoegen aan de request body:
  - `partner_ids?: string[]` — alleen activiteitenpartners in deze lijst krijgen mail
  - `accommodation_partner_ids?: string[]` — idem voor logies
  - `skip_item_cancel?: boolean` — items zijn al geannuleerd door `cancel-program-request`, dus overslaan
- Bestaande gedrag (zonder filters) blijft hetzelfde voor admin-projectverwijdering.

### 3. `AdminRequestDetail.tsx`
- Na succesvolle `cancel-program-request` aanroep:
  - Toast aanpassen naar: *"Aanvraag geannuleerd."* + extra regel als er partners zijn: *"Kies hieronder welke partners je een annuleringsmail wilt sturen."*
  - Nieuwe state `cancellationPartners` (uit response) + `partnerNotifyDialogOpen`.
- Nieuwe component `PartnerCancellationNotifyDialog`:
  - Toont per partner:
    - naam, e-mailadres, type (activiteit/logies), betrokken onderdeel/accommodatie-naam
    - checkbox (default aangevinkt voor alle, behalve waar e-mail ontbreekt → disabled met uitleg)
  - "Alles selecteren / niets selecteren" knop.
  - Primaire actie: **"Verstuur annuleringsmails (N)"** → roept `notify-partner-cancellation` met de geselecteerde ids.
  - Secundaire actie: **"Niet versturen / sluiten"** — sluit dialog zonder mails. (Geen automatische todo meer; admin neemt bewuste actie.)
  - Bij succes: toast met aantal verstuurde mails + opnieuw `fetchRequestData` zodat de communicatie-tijdlijn de mails toont.

### 4. (Optioneel binnen dezelfde dialog) Heropen-knop op projectdetail
- Als de admin de dialog sluit zonder mails te versturen, een kleine "Stuur partners alsnog mail"-knop tonen in de project-header zolang `cancelled_at` recent is én er nog onverstuurde annuleringsmails per partner zijn (basis check: betrokken partner heeft geen `cancellation_partner`/`cancellation_accommodation_partner` mail in `email_log` voor dit project). Zo verlies je de actie niet als de tab sluit.

## Technische details

- Response-shape van `cancel-program-request` (toevoegingen, backwards-compatibel):
  ```ts
  {
    success: true,
    providersNotified: 0,                // blijft 0 — niet automatisch
    accommodationPartnersNotified: 0,    // idem
    affected_activity_partners: Array<{
      partner_id: string; name: string; email: string | null;
      item_names: string[];
    }>,
    affected_accommodation_partners: Array<{
      partner_id: string; name: string; email: string | null;
      accommodation_name: string; previous_quote_status: string;
    }>,
  }
  ```
- `notify-partner-cancellation` schakelt item-cancel over wanneer `skip_item_cancel === true` (frontend zet dit altijd vanuit de klant-cancel flow).
- Filters worden vóór de bestaande `partnerGroups`/quote-loop toegepast.
- Logging blijft via `logEmail` + `project_communications` zoals nu.
- Geen DB-migratie nodig.

## Bestanden
- `supabase/functions/cancel-program-request/index.ts` — response uitbreiden, todo-insert verwijderen.
- `supabase/functions/notify-partner-cancellation/index.ts` — optionele filters + `skip_item_cancel`.
- `src/pages/admin/AdminRequestDetail.tsx` — toast + dialog-state + nieuwe import.
- `src/components/admin/PartnerCancellationNotifyDialog.tsx` — nieuw.

## Buiten scope
- Wijzigingen aan admin-project-delete flow (`notify-partner-cancellation` blijft daar gewoon "alles versturen").
- Wijzigingen aan klantportal-cancel UI.
