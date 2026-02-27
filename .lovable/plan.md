
## Grondige audit: E-mails, teksten en code-opschoning

### Samenvatting van bevindingen

Na het doorlopen van alle 36 edge functions, de e-mail templates, frontend-componenten en routering heb ik de volgende categorieeen van verbeterpunten gevonden:

---

### A. Partner Portal links in e-mails: verouderd token-pad

De partner portal werkt nu via login (`/partner/login`), maar meerdere edge functions genereren nog links naar het verouderde token-pad `/partner/{token}`. Het `PartnerPortal.tsx` component redirect wel naar login, maar de links zijn verwarrend.

**Betrokken functies:**
- `accept-quote-proposal` (regel 409-411) - link naar `/partner/{token}`
- `approve-quote-item` (regel 250-252) - link naar `/partner/{token}`

**Oplossing:** Vervang alle partner portal links door `{baseUrl}/partner/login` (of gewoon `/partner/dashboard` als ze al ingelogd zijn). Het token is niet meer nodig in de URL.

---

### B. `send-program-request`: verouderde Partner Portal tekst

De partner-notificatiemail in `send-program-request` (self-service flow, regel 226-232) bevat de tekst:
> "Binnenkort kun je al je aanvragen terugvinden in de Partner Portal. Je ontvangt hiervoor een persoonlijke toegangslink."

Dit is verouderd. De Partner Portal is al live en partners hebben al login-gegevens.

**Oplossing:** Tekst aanpassen naar een werkende `Ga naar Partner Portal` knop die linkt naar `/partner/login`.

---

### C. Ghost-configs in `supabase/config.toml`

Twee functies staan in `config.toml` maar bestaan niet als code:
- `[functions.quote-chat]`
- `[functions.send-wedding-inquiry]`

Ze worden nergens in de frontend aangeroepen.

**Oplossing:** Verwijder deze twee entries uit `config.toml`.

---

### D. `fix-orphaned-cancellations` - eenmalige functie

Deze functie is zojuist gebruikt om de 13 orphaned items te fixen en hoeft niet meer te bestaan.

**Oplossing:** Verwijder `supabase/functions/fix-orphaned-cancellations/index.ts` en de bijbehorende entry in `config.toml`.

---

### E. `PartnerPortal.tsx` - redirect-pagina

De pagina op `/partner/:token` doet alleen een redirect naar `/partner/login`. Dit is correct als legacy-ondersteuning, maar de e-mails genereren nog steeds dit pad (zie punt A). Na punt A is dit pad alleen nog relevant voor oude bookmarks.

**Oplossing:** Pagina behouden als vangnet, maar geen nieuwe links er naartoe genereren.

---

### F. Ontbrekende e-mailtemplates in de database

Sommige edge functions verwijzen naar template-IDs die mogelijk niet in de database bestaan (ze vallen terug op hardcoded HTML):
- `STATUS_ALTERNATIVE` - in `update-partner-item-status` (regel 536) staat letterlijk `"STATUS_ALTERNATIVE"` in plaats van `TemplateIds.STATUS_ALTERNATIVE` en dit ID ontbreekt in de `TemplateIds` constante
- `proforma_commission_notification` - in `process-completed-items` wordt dit template-ID gebruikt maar staat niet in `TemplateIds`
- `quote_offer_customer` - in `send-quote-offer` wordt dit direct als string gebruikt

**Oplossing:**
1. Voeg `STATUS_ALTERNATIVE` toe aan de `TemplateIds` constante: `STATUS_ALTERNATIVE: "status_alternative"`
2. Voeg `PROFORMA_COMMISSION: "proforma_commission_notification"` toe
3. Voeg `QUOTE_OFFER_CUSTOMER: "quote_offer_customer"` toe
4. Fix de referentie in `update-partner-item-status` van `"STATUS_ALTERNATIVE"` naar `TemplateIds.STATUS_ALTERNATIVE`

---

### G. `send-program-request` gebruikt eigen sanitizeHtml en isTestMode

De `send-program-request` function dupliceert `sanitizeHtml`, `isTestMode`, `getRecipientEmail`, en `getSubjectPrefix` in plaats van ze te importeren uit `_shared/email-templates.ts`.

**Oplossing:** Refactor om de shared imports te gebruiken (vermindert duplicatie en voorkomt drift).

---

### H. Ontbrekende e-mail: klant-notificatie bij per-item akkoord

Wanneer een klant een individueel item accordeert via `approve-quote-item`, ontvangt de partner een mail, maar de klant ontvangt geen bevestiging. Bij `accept-quote-proposal` (alle items tegelijk) wordt weel een bevestigingsmail naar de klant gestuurd.

**Oplossing:** Geen directe actie vereist (het item-level is kleinschalig en de klant ziet de status direct in het portaal), maar overweeg een korte bevestigingsmail toe te voegen voor consistentie.

---

### I. `select-accommodation-quote` portal URL

In `select-accommodation-quote` (regel 173) wordt `${origin}/mijn-logies/${token}` gebruikt als portal URL. Dit is de legacy logies-portal URL. Het zou consistent moeten zijn met de rest van het systeem dat het programma-token gebruikt.

**Oplossing:** Gebruik `getPortalBaseUrl(origin)` in plaats van `origin` direct, en gebruik altijd het programma-token als dat beschikbaar is (dit doet `notify-accommodation-quote` al correct).

---

### Implementatieplan (prioriteit)

| # | Wijziging | Bestanden | Impact |
|---|---|---|---|
| 1 | Partner portal links naar `/partner/login` | `accept-quote-proposal`, `approve-quote-item` | Hoog: links werken niet correct |
| 2 | Partner Portal tekst in `send-program-request` | `send-program-request` | Hoog: verouderde info |
| 3 | Ghost configs verwijderen | `config.toml` | Laag: opschoning |
| 4 | `fix-orphaned-cancellations` verwijderen | `fix-orphaned-cancellations/index.ts`, `config.toml` | Laag: opschoning |
| 5 | `STATUS_ALTERNATIVE` en andere template IDs toevoegen | `_shared/email-templates.ts`, `update-partner-item-status` | Medium: consistentie |
| 6 | `send-program-request` refactor naar shared imports | `send-program-request` | Medium: code-kwaliteit |
| 7 | `select-accommodation-quote` portal URL fix | `select-accommodation-quote` | Medium: consistentie |
