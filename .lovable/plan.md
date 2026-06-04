## Probleem

Project BV-2605-0013 staat in de DB op `quote_status = 'offerte_verstuurd'`, maar `quote_sent_at` en `quote_pdf_path` zijn `null` — de offerte is nooit daadwerkelijk verzonden. Waarschijnlijk is de status handmatig via het dropdown veranderd zonder dat de mail eruit ging.

In `AdminRequestDetail.tsx` (regels 1352 en 1381) wordt de knop **"Stuur offerte"** alleen getoond als `quote_status` één van `concept` / `in_afstemming` is. Bij `offerte_verstuurd` verdwijnt zowel de hoofdknop als de actie in het overflow-menu, dus er is geen manier om alsnog (of opnieuw) te versturen zonder eerst de status terug te zetten.

## Oplossing

1. **Stuur-knop ook tonen bij `offerte_verstuurd`** in `AdminRequestDetail.tsx`:
   - Voorwaarde wijzigen naar `["concept", "in_afstemming", "offerte_verstuurd"].includes(...)` op beide plekken (hoofdknop + overflow-menu).
   - Label dynamisch: `"Stuur offerte"` bij concept/afstemming, `"Stuur offerte opnieuw"` bij `offerte_verstuurd`.
   - Geblokkeerd blijven bij `geaccepteerd`, `afgewezen`, `verlopen`, `geannuleerd` (geen wijziging).

2. **Geen wijziging** aan `AdminSendQuoteDialog` zelf — die werkt al en zet bij versturen `quote_sent_at` + `quote_pdf_path` + status naar `offerte_verstuurd` (idempotent).

3. **Eenmalige correctie van dit project** (optioneel, via data-fix): `quote_status` terug naar `concept` zodat het lijstje "klopt" met de werkelijkheid. Mag ook overgeslagen worden — als de gebruiker met de nieuwe knop alsnog verstuurt, wordt `quote_sent_at` gevuld en is alles consistent.

## Scope

- Frontend-only wijziging in `src/pages/admin/AdminRequestDetail.tsx` (2 conditionele blokken + label).
- Geen wijzigingen aan edge functions, e-mail logging of database schema.

Wil je dat ik ook de status van dit ene project terugzet naar `concept`, of laat ik dat aan jou over (gewoon opnieuw versturen vanuit de nieuwe knop)?