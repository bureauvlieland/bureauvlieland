## Inventarisatie

E-mails worden verstuurd vanuit ~30 edge functions via Mailjet. Templates leven in de database-tabel `email_templates` (46 stuks, beheerbaar via **Admin → E-mailtemplates**) en worden gerenderd door `_shared/email-templates.ts` (`getRenderedTemplate` + `replaceVariables` met `{{var}}` en `{{#if}}…{{else}}…{{/if}}`).

Er staan **46 templates** in de database, verdeeld over: Programma, Offerte, Status, Wijziging, Annulering, Logies, Commissie, Partner, Chat, Pre-sales, Reminders, Inbound.

## Bevindingen (problemen)

### 1. Ontbrekende templates (worden in code aangeroepen, bestaan niet in DB)

Deze edge functions vallen nu terug op een hardcoded `<div>` in de code, dus **niet bewerkbaar** door admin:


| Edge function                 | Aangeroepen template-id                  | Doel                                   |
| ----------------------------- | ---------------------------------------- | -------------------------------------- |
| `select-accommodation-quote`  | `accommodation_rejected_partner`         | Logiespartner: niet gekozen            |
| `create-quote-review-todo`    | `accommodation_quote_notification_admin` | Bureau: nieuwe logiesofferte ontvangen |
| `notify-partner-cancellation` | `cancellation_partner_project`           | Partner: project geannuleerd           |


Ook in `_shared/email-templates.ts` staat `ACCOMMODATION_REJECTED_PARTNER` in `TemplateIds` zonder DB-tegenhanger.

### 2. Tone-of-voice fouten

Volgens de huisregels: klanten **formeel ("u/uw")**, partners **informeel ("je/jij")**.

**Klant-templates die (deels) informeel zijn — moeten 100% formeel:**

- `accommodation_request_customer` (mix u + je)
- `booking_confirmed_customer` ("Je boeking is definitief!", "Bedankt voor je boeking …")
- `cancellation_customer` (mix)
- `chat_reply_visitor` (volledig informeel — bezoeker = klant)
- `item_changes_customer` (volledig informeel)

**Partner-templates die (volledig) formeel zijn — moeten informeel:**

- `accommodation_quote_notification` (notificatie nieuwe logiesaanvraag → partner)
- `accommodation_selected_partner`
- `booking_confirmed_partner`
- `date_change_accommodation` (logiespartner)
- `date_change_partner`
- `people_change_accommodation` (logiespartner)
- `proforma_commission_notification` (commissie-opgave → partner)
- `quote_expired_partner`
- `reminder_partner_quote`

### 3. Visuele inconsistentie

Sommige templates zijn volledig opgemaakte HTML-mails met huiskleur-header (`#1e3a5f`), tabel-layout en knoppen (bv. `proforma_commission_notification`, `quote_offer_customer`, `accommodation_selected_partner`). Andere zijn een kale `<div>` zonder branding (bv. `booking_confirmed_partner`, `booking_confirmed_customer`, `item_*`, `date_change_*`, `cancellation_partner_project` fallback).

Resultaat: ontvangers krijgen wisselend ogende mails afhankelijk van het moment in de funnel.

### 4. Inhoudelijke gaten t.o.v. huidige stand van zaken

- **Bureau-central facturatie** (alles via Bureau Vlieland) is nergens duidelijk genoemd in `booking_confirmed_partner` of `accommodation_selected_partner` — partners verwachten facturatie-instructie ("Stuur uw factuur aan Bureau Vlieland, niet aan de klant").
- **BTW-tarieven**: alleen `proforma_commission_notification` toont expliciet `{{vat_rate}}` — verder geen BTW-uitsplitsing in offerte/boekingsmails.
- **Reply-To op project-mails**: `buildReplyTo(reference_number)` bestaat maar wordt inconsistent gebruikt (alleen in een handvol functies). Inkomende mails zonder `reply+REF@` worden niet correct gekoppeld via Parse.
- **Pre-sales templates** (`presales_*`) zijn erg kort (200-450 chars) en bevatten geen herkenbare branding/footer — voelen "rauw" aan.
- **Footer/signature**: geen centrale footer met contactgegevens, KvK, of disclaimer — sommige templates hebben er één, andere niet.
- **Test-mode prefix**: `getSubjectPrefix` voegt `[TEST]`  toe in non-prod, maar verschillende edge functions gebruiken `templateResult?.subject` zonder prefix → in test-mode komen sommige mails wél en andere niet als `[TEST]` binnen.

### 5. Wees-templates (in DB, nooit verstuurd)

`customer_program_update_partner` en `cancellation_bureau` worden niet door enige edge function aangeroepen. Ze komen alleen voor in admin-labels (AdminTodos / AdminMessages / AdminEmailTemplates). Beslissing nodig: verwijderen of activeren.

### 6. Conditionals worden niet altijd benut

`processConditionals` ondersteunt `{{#if var}}…{{else}}…{{/if}}` met geneste blokken. Templates gebruiken dit nauwelijks — bv. `program_request_customer` toont altijd "uw aanvraag" ook als `customer_company` ontbreekt; ideaal voor `{{#if customer_company}}{{customer_company}}{{else}}{{customer_name}}{{/if}}`.

---

## Plan (in 4 fases)

### Fase 1 — Blokkers & datakwaliteit (kort, hoge impact)

1. **3 ontbrekende DB-templates aanmaken** met dezelfde HTML-structuur als de huidige hardcoded fallbacks, zodat ze beheerbaar worden via admin:
  - `accommodation_rejected_partner` — Logiespartner: niet gekozen
  - `accommodation_quote_notification_admin` — Bureau: nieuwe logiesofferte
  - `cancellation_partner_project` — Partner: hele project geannuleerd
2. **Wees-templates beslissen**: verwijderen of in `SendProjectEmailSheet` koppelen als handmatig verzendbare opties (`customer_program_update_partner`, `cancellation_bureau`).
3. **Test-mode subject-prefix consistent maken**: alle edge functions die `templateResult?.subject` gebruiken laten doorgaan via `${getSubjectPrefix(origin)}${rendered.subject}`.

### Fase 2 — Tone-of-voice harmoniseren

SQL-update per template, met handmatige tekst-revisie (geen blinde search/replace omdat "u" óók in "uur"/"buurt" voorkomt — dus per template gericht):

- 5 klant-templates → volledig formeel maken (u/uw, "uw boeking", "Wij bevestigen …").
- 9 partner-templates → volledig informeel maken (je/jij/jouw, "je boeking", "we hebben je nodig …").
- Snelle validatie achteraf met dezelfde regex-check (`\m(je|jij|jou|jouw)\M` mag niet voorkomen in klant-templates en omgekeerd).

### Fase 3 — Visuele harmonisatie + inhoudelijke updates

1. **Standaard HTML-skelet** (header met logo/naam, bodywidth 600px, brand-kleur `#1e3a5f`, footer met contactgegevens + KvK + adres). Dit skelet bestaat al impliciet in `proforma_commission_notification` en `quote_offer_customer` — extraheren als standaard.
2. **Alle "kale-div" templates herschrijven** in dat skelet:
  - `booking_confirmed_partner`, `booking_confirmed_customer`
  - `item_added_partner`, `item_changes_partner`, `item_changes_customer`, `item_cancelled_partner`
  - `date_change_partner`, `date_change_customer`, `date_change_accommodation`
  - `cancellation_partner`, `cancellation_accommodation_partner`
  - `presales_*` (4 stuks) — uitbreiden naar volwaardige mails
3. **Inhoudelijke aanvullingen**:
  - In `booking_confirmed_partner` + `accommodation_selected_partner`: instructie *"Bureau Vlieland verzorgt centraal de facturatie aan de klant. Stuur jouw factuur naar [facturatie@bureauvlieland.nl](mailto:facturatie@bureauvlieland.nl)"*.
  - In `quote_offer_customer` + `booking_confirmed_customer`: BTW-uitsplitsing toevoegen (`{{amount_excl_vat}}` / `{{vat_amount}}` / `{{amount_incl_vat}}`).
  - Centrale footer met KvK, IBAN, contact, en dynamische "Beantwoord deze e-mail" hint die uitlegt dat replies aan reply+REF@ in het portaal terechtkomen.

### Fase 4 — Slimmere variabelen + Reply-To

1. **Conditionals gebruiken** waar `customer_company` of optionele velden voorkomen (10+ templates kunnen netter).
2. **Reply-To uitrol**: alle edge functions die project-gerelateerd mailen consistent `buildReplyTo(reference_number)` laten meesturen (audit van `Mailjet.send` calls in 30 edge functions).
3. **Variabelen-schema documenteren**: in `email_templates.variables` (jsonb) per template de lijst met beschikbare variabelen vastleggen, zodat de admin-editor ze als chips kan tonen.

---

## Open vragen voor jou

1. **Wees-templates** (`customer_program_update_partner`, `cancellation_bureau`) — verwijderen of behouden als handmatig verzendbare templates in het project-communicatiescherm? Behouden. 
2. **Footer-inhoud** — welke gegevens precies (KvK-nr, IBAN, telefoon, fysiek adres, btw-nr)? Mag ik die uit `app_settings` halen of zet je ze hard in de templates? Uit de app settings. 
3. **Logo in header** — welke URL moet ik gebruiken (publieke URL van `/assets/logo.png` of een aparte mailvariant op een vast hostadres voor outlook-compatibiliteit)? Doe maar wat het beste werkt. 
4. **Volgorde / scope per ronde** — wil je dat ik fase 1+2 in één keer uitvoer (snel resultaat: alles werkt + juiste tone), en daarna fase 3+4 als aparte ronde aanpak? Ja