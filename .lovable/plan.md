## Audit programma BV-2602-0004 (4Dotnet — Jeannette van Spil)

### 1. Huidige database-staat

**Programma**

- `quote_status`: `offerte_verstuurd` (offerte 3x naar klant verstuurd, laatste 01-04-2026)
- `status`: `active`, `completion_status`: `in_progress`
- `terms_accepted_at`: NULL (nog geen voorwaarden geaccepteerd — klopt: klant heeft nog niet getekend)
- 60 personen, 25-27 september 2026, `bureau_central`

**Items (11 stuks, allemaal day_index ≥ 0)**

- Alle items: `status = pending`, `item_quote_status = in_afstemming`, `customer_approved_at = NULL`
- Géén bureau-extras (day_index = -1)
- `skip_partner_notification`:
  - `false` (3 items, dus al "verstuurd"-flag): Overtocht heen, Vrije tijd, Overtocht terug — allemaal `provider_id = bureau` (interne ferry/dummy items)
  - `true` (8 items): alle echte partneractiviteiten (Zuiver, Vlieland Outdoor Center, Zeehondentocht, Vliehors Expres, Grillmaster) → nog NIET naar partners gestuurd

### 2. Geconstateerde problemen met meldingen

**Probleem 1 — "Aanvraag wordt beoordeeld / verstuurd naar aanbieders"**  
In `ActionRequiredCard.tsx` is logica:

```
if (statusSummary.pending > 0 && !isQuotePreApproval) { ... }
```

`isQuotePreApproval = quote_status ∈ ['concept','in_afstemming','offerte_verstuurd']` → hier `true`, dus correct geen "verstuurd naar aanbieders"-melding op klantportaal. ✓

Maar elders (admin / `RequestCompletionStatus`) wordt geteld:

- `nonCancelledItems = items.filter(i => i.status !== 'cancelled')` → 11
- `confirmedItems = ... status === 'confirmed'` → 0
- Resultaat: **"Partners bevestigd (0/11)"** — dat klopt feitelijk maar is misleidend, want de offerte is nog niet door de klant geaccepteerd, dus aanvragen staan nog niet bij partners uit. Het lijkt nu of partners niets doen, terwijl we wachten op de klant.

**Probleem 2 — `item_quote_status = in_afstemming` op alle items**  
Volgens de Quote Delivery memory transitioneert dit naar `in_afstemming` zodra offerte gegenereerd wordt. Echter:

- 3 ferry/bureau items hebben `skip_partner_notification = false` — alsof ze al "verstuurd" zijn
- 8 partner-items hebben `skip_partner_notification = true` — nog niet verstuurd

Dit is correct (interne items hoeven nooit verstuurd), maar de UI leest `skip_partner_notification = false` ook voor bureau-items als "verstuurd" → in `getItemSendPhase()` (projectWorkflow.ts) komt dit in de `verstuurd`-bucket, terwijl er geen partner is om naar te versturen.

**Probleem 3 — Offerte 3x verstuurd, geen reactie**  
Email log toont:

- 16-02 → klant
- 17-02 → testmails
- 17-02 → [neefje@gmail.com](mailto:neefje@gmail.com) (ander adres?)
- 01-04 → klant (laatste)

`quote_status` staat nog op `offerte_verstuurd` sinds 01-04-2026 (>30 dagen). Géén herinnering verstuurd in `email_log` te zien. Volgens de Reminder System memory zou er na 5 dagen een herinnering moeten komen. **Mogelijk werkt de quote-reminder hier niet.**

**Probleem 4 — Status van bureau ferry-items**  
De drie ferry/vrije-tijd items met `provider_id = bureau` en `skip_partner_notification = false` staan op `pending` + `item_quote_status = in_afstemming`. Bureau-items hoeven nooit door een partner bevestigd te worden. In de meldingenlogica zouden deze automatisch op `confirmed` moeten staan zodra de offerte uitgaat (of in elk geval niet als "openstaand bij partner" geteld worden).

### 3. Concreet wat NIET klopt aan de meldingen


| Melding                              | Werkelijkheid                                                | Probleem                                                  |
| ------------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------- |
| "Partners bevestigd (0/11)" in admin | Wacht op klant-akkoord, partners zijn nog niet aangeschreven | Misleidend: noemer telt items die nog niet verstuurd zijn |
| Geen reminder uitgestuurd            | Offerte staat 33+ dagen open                                 | Reminder-systeem lijkt niet te draaien voor deze offerte  |
| Bureau-ferry items als "openstaand"  | Bureau regelt zelf                                           | Zouden niet in de partnerteller moeten zitten             |


### 4. Voorgesteld plan voor fix

**A. Fix telling in `RequestCompletionStatus.tsx**` (admin-zijde)

- Sluit items met `provider_id = 'bureau'` of `skip_partner_notification = true` uit van de partnerteller wanneer er nog geen klant-akkoord is. 
- Tel `executed` mee als bevestigd (was vorige audit BV-0006).
- Toon expliciet sub-status: "Wacht op klant-akkoord (offerte verstuurd N dagen geleden)" wanneer `quote_status = offerte_verstuurd` en alle items nog `pending`.

**B. Fix `getItemSendPhase()` in `projectWorkflow.ts**`

- Bureau-items met `provider_id = 'bureau'` (ongeacht day_index) moeten `niet_van_toepassing` of `verstuurd` retourneren — niet `verstuurd` als ze nog `pending` zijn want dat suggereert dat een externe partner moet reageren.

**C. Onderzoeken reminder-flow**

- Verifiëren waarom voor BV-0004 geen `quote_reminder_customer` mail in `email_log` staat sinds 01-04. Mogelijk:
  - cron job `send-quote-reminders` faalt
  - `last_reminder_sent_at` veld ontbreekt of wordt niet bijgewerkt
  - Filter sluit deze offerte uit
- Eerst edge function logs van `send-quote-reminders` (of vergelijkbaar) bekijken voordat we wijzigen.

**D. Meldingen-UI op admin-projectpagina**

- Voeg expliciete contextregel toe: "Offerte verstuurd op DD-MM, X dagen geleden, geen reactie" met knop "Stuur herinnering nu".

### 5. Bestanden die mogelijk wijzigen

- `src/components/admin/RequestCompletionStatus.tsx` — interface uitbreiden met `provider_id` + `skip_partner_notification`, telling aanpassen
- `src/pages/admin/AdminRequestDetail.tsx` — items met meer velden doorgeven, eventuele extra "wacht op klant"-banner
- `src/lib/projectWorkflow.ts` — `getItemSendPhase` voor bureau-items
- `supabase/functions/send-quote-reminders/` (of gelijke naam) — reminder-bug onderzoeken

### Vraag

Twee dingen graag bevestigen voordat ik doorzet:

1. **Scope**: Wil je dat ik beide aanpak (UI-tellingen + reminder-onderzoek), of alleen de UI-meldingen voor nu? 

Ui meldingen alleen. 

1. **Bureau ferry-items** (Overtocht heen/terug, Vrije tijd): mogen die in de meldingen-telling als "automatisch geregeld" weergegeven worden (groen vinkje) zodra de offerte uitstaat, of alleen als de klant heeft getekend?

Als de klant heeft getekend.