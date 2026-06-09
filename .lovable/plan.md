
# Mailtemplates fixen, tone opschonen, sales + AI-follow-ups

## Wat er nu mis gaat

Uit het project (template `reminder_customer_request` + `render-email-template`):
- Template gebruikt `{{days_ago}}` en `{{portal_link}}`, maar de renderer vult `days_since` en `portal_url` in → resultaat: lege variabelen ("staat al **leeg** dagen open") en kale link.
- "Beste Dap Noord West Friesland" komt uit `customer_company`, niet uit de contactpersoon. Voor klantmails moet de aanhef op de contactpersoon staan.
- Bij conversie naar plaintext in `render-email-template` worden `<a href="…">` linkteksten gestript zónder URL erachter te zetten → de knop "Ga naar uw programma →" heeft geen klikbare URL meer in de textarea.
- Variabelen die wél in de template staan maar nergens worden aangevuld (bv. `quote_count`, `days_open`) blijven leeg.

Daarnaast: tone of voice in een aantal klant-mails is droog/zakelijk ("er is actie nodig om uw boeking voort te zetten"), past niet bij de Bureau Vlieland-stem (lokale specialist, warm, persoonlijk).

---

## Ronde 1 — Fixes + tone (deze sprint)

### A. Variabele-mismatch oplossen
1. **Inventariseer alle `email_templates`-rijen** (er staan ~20+ in DB). Per template:
   - lijst alle `{{var}}`-tokens uit `subject` + `body_html`,
   - vergelijk met wat `render-email-template`, `send-program-request-reminder`, `send-quote-reminder` en `send-project-email` aanleveren.
2. **Eén bron van waarheid** voor variabelen: bouw `supabase/functions/_shared/template-variables.ts` met een functie `buildTemplateVariables({ requestId, accommodationId, partnerId, recipientType })` die alles ophaalt en consistent levert (`customer_name`, `customer_contact_name`, `customer_company`, `reference_number`, `portal_url`, `days_since_request`, `days_since_quote`, `quote_count`, `event_date`, `partner_name`, etc.).
3. Laat zowel `render-email-template` als de geautomatiseerde reminders (`send-program-request-reminder`, `send-quote-reminder`) deze functie gebruiken. Geen duplicate enrichment meer.
4. Migratie die de bestaande templates **normaliseert** naar de canonieke variabelnamen (bv. `{{days_ago}}` → `{{days_since_request}}`, `{{portal_link}}` → `{{portal_url}}`).

### C. Aanhef-regel
Centrale helper `getCustomerSalutation(request)` met fallback-ladder:
1. `customer_contact_name` (bv. "Janneke de Vries") → "Beste Janneke,"
2. Anders "Beste heer/mevrouw,"
Bedrijfsnaam wordt nooit als aanhef gebruikt. Wordt op alle klant-templates toegepast. (Memory-rule `formal-communication-tone` blijft staan: 'u' voor klant.)

### D. Plaintext-conversie in composer
In `render-email-template`: vervang `<a href="X">tekst</a>` door `tekst (X)` zodat de admin in de textarea de URL ziet en kan controleren. HTML-versie blijft visueel mooi via `wrapEmailHtml`.

### E. Tone-of-voice review
Klant-templates één voor één herschrijven, warmer en helderder. Voorbeeldlijn voor herinnering aanvraag:
> "Beste Janneke, een vriendelijke herinnering — uw aanvraag voor Vlieland staat sinds {{days_since_request}} dagen bij ons open. Heeft u nog vragen of twijfels? Bel of mail gerust, dan denken we met u mee. Wilt u doorpakken? Via onderstaande knop opent u uw eigen pagina waar u uw programma kunt afronden."
Templates in scope: `reminder_customer_request`, `reminder_customer_quote`, `customer_program_*`, `accommodation_quote_*` naar klant.

### F. QA
- Per gewijzigde template: render via `render-email-template` met testdata (gebruik bestaande `EmailTemplatePreviewDialog`) en vergelijk subject + body + HTML.
- Daadwerkelijke testmail (preview-mode reroute, conform memory) naar admin-adres.

---

## Ronde 2 — Sales-templates + AI-follow-ups (volgende sprint, hier alleen kort)

Niet bouwen in deze ronde, maar wel benoemd zodat we weten wat eraan komt:

1. **Nieuwe sales-templates** (4 stuks), inclusief reminder-cadens in `automated-reminder-system`:
   - `sales_followup_offer_3d` — 3 dagen na verzonden offerte: warme check-in.
   - `sales_followup_offer_7d` — 7 dagen: laatste herinnering + belaanbod.
   - `sales_pre_signing` — na klant-akkoord op voorstel, vóór ondertekening voorwaarden.
   - `sales_post_signing_welcome` — na ondertekening: bedankt + wat gebeurt er nu.

2. **AI-follow-up-assistent (vervangt vaste sales-templates voor follow-ups)**
   - Edge function `compose-followup-email` (Lovable AI, model `google/gemini-3-flash-preview`).
   - Input: `requestId`, `recipientEmail`, optionele instructie. Verzamelt: project-status, verstuurde mails (uit `email_log` + `project_communications`), offerte-bedrag, dagen sinds laatste contact, partnerstatussen.
   - Output: `{ subject, body }` in formele 'u'-stem, met BV-tone-of-voice, NL, max ±180 woorden, klant-portal-URL waar logisch.
   - UI: nieuwe knop "AI-suggestie" in `SendProjectEmailSheet` naast de template-keuze; vult subject + body en blijft bewerkbaar. Geen template-onderhoud voor sales-follow-ups meer.
   - Guardrail: AI mag geen bedragen, datums of partners verzinnen — system prompt instrueert om uitsluitend uit aangeleverde context te putten en bij ontbrekende data neutraal te formuleren.

---

## Technische details Ronde 1

- **Bestanden te wijzigen:**
  - `supabase/functions/_shared/template-variables.ts` (nieuw)
  - `supabase/functions/_shared/email-templates.ts` (gebruik nieuwe helper)
  - `supabase/functions/render-email-template/index.ts` (variabelen + plaintext anker-URL behoud)
  - `supabase/functions/send-program-request-reminder/index.ts`, `send-quote-reminder/index.ts` (gebruik helper)
  - Nieuwe SQL-migratie `…_normalize_email_template_vars.sql` voor variabelnaam-normalisatie + tone-rewrite van klant-templates.
- **Geen breaking changes** in `email_templates`-schema; alleen rijen worden bijgewerkt.
- **Tests:** uitbreiding van bestaande lib-tests met een snapshot per herschreven template (subject + plaintext body) om regressie te vangen.
- **Deploy:** edge functions `render-email-template`, `send-program-request-reminder`, `send-quote-reminder` opnieuw deployen.

## Acceptatie Ronde 1
- Geen lege `{{...}}`-tokens of "al  dagen open"-zinnen meer in de composer of in verstuurde mail.
- "Beste {contactpersoon}" — nooit meer bedrijfsnaam als aanhef.
- Linkknoppen in plaintext-textarea tonen tekst + URL.
- Bestaande automatische reminders sturen identieke inhoud als de composer-preview.
- Tone-of-voice klant-templates gereviewd en herschreven (warm, persoonlijk, formele 'u').
