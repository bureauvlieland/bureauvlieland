# Mail-review: complete audit + kleine fixes

## Wat ik ga doen

Stap 1: **Inventarisatie** — alle e-mails systematisch in kaart brengen
Stap 2: **Audit** — per mail langs een vaste checklist
Stap 3: **Kleine fixes direct** — typo's, ontbrekende variabelen, rommelige merge tags, lege onderwerpen, ontbrekende klant/activiteit-info, inconsistente tone, dubbele groet/footer
Stap 4: **Voorstellen apart** — samenvoegen, schrappen, herbouw — krijg jij eerst te zien
Stap 5: **Verificatie** — render elke gewijzigde template via `render-email-template` met testdata, ik kijk of alles invult

## Scope (vastgesteld)

**52 DB-templates** in `email_templates` (renderbaar via `render-email-template`):
- Programma-aanvraag flow (4): `program_request_*`, `quote_request_*`
- Logies-flow (10): `accommodation_*`
- Status-mails (3): `status_confirmed/alternative/unavailable`
- Wijzigingen (8): `date_change_*`, `people_change_*`, `item_changes_*`, `customer_program_update_partner`
- Annuleringen (5): `cancellation_*`
- Negotiation (2): `counter_proposal_*`
- Boeking & oplevering (4): `booking_confirmed_*`, `arrival_reminder`, `guest_details_reminder`
- Reminders (3): `reminder_*`
- Pre-sales (4): `presales_*`
- Partner-onboarding (3): `partner_invitation`, `partner_intro_portal`, `partner_password_reset`
- Chat & inbound (4): `chat_*`, `inbound_reply_*`, `customer_accommodation_message`
- Item-mails (3): `item_added/cancelled_partner`, `proforma_commission_notification`
- Offerte (1): `quote_offer_customer`, `quote_expired_partner`

**~20 hardcoded edge-function mails** zonder DB-template, o.a.:
`cancel-program-request`, `notify-partner-cancellation`, `notify-partner-item-deletion`, `notify-partner-price-change`, `notify-customer-price-change`, `forward-bureau-invoice`, `forward-commission-invoice`, `forward-purchase-invoice`, `register-partner-invoice`, `send-bureau-invoice-to-customer`, `send-commission-invoice-to-partner`, `send-ticket-email`, `send-arrival-reminder` (deels), `send-partner-mailing`, `bulk-invite-partners`, `invite-partner`, `notify-new-chat(-reply)`, `update-commission-status`, `send-partner-intro-email`, `send-project-email` (vrije tekst).

## Audit-checklist per mail

| # | Check | Voorbeeld van wat misgaat |
|---|---|---|
| 1 | **Onderwerp** vult juist in (geen `{{...}}` lekt door) | "Annulering: voor " (lege variabele) |
| 2 | **Klant/partner/activiteit** is altijd benoemd waar relevant | Gebrek dat je net meldde bij annulering |
| 3 | **Tone**: klant = "u", partner = "je" — consistent | "Beste partner, u krijgt..." |
| 4 | **Groet & ondertekening** uniform (Bureau Vlieland, Erwin/team) | Ene mail "Groet Erwin", andere "Met vriendelijke groet" |
| 5 | **CTA** duidelijk: knop + linkbestemming klopt (admin/partner/klant portal correct) | Knop verwijst naar admin-route in klant-mail |
| 6 | **Variabele-fallbacks** voor optionele velden (geen "—" of "null") | "voor — personen op " |
| 7 | **PII-privacy** in partner-mails (geen klant-mail/telefoon tenzij nodig) | Centrale invoice-model bewaken |
| 8 | **Reply-to** logisch (project-subaddressing waar passend) | |
| 9 | **HTML-opmaak** consistent (footer, logo, kleuren, knopstijl) | |
| 10 | **Dubbele/overlappende mails** (zelfde event 2x via verschillende paden) | bijv. `item_changes_*` vs `customer_program_update_partner` |
| 11 | **Logging** met `metadata.template_name` + `actor` (audit-contract) | |
| 12 | **Test-mode rerouting** werkt (preview-omgeving) | |

## Deliverable: audit-rapport

**Excel + Markdown** in `/mnt/documents/email-audit.md` en `/mnt/documents/email-audit.xlsx` met per mail:

| Kolom | Inhoud |
|---|---|
| ID / functie | `accommodation_quote_notification` of `cancel-program-request` |
| Trigger | Wanneer wordt deze verstuurd |
| Ontvanger(s) | Klant / Partner / Bureau |
| Status | ✅ OK / ⚠️ Klein issue / 🔴 Groot issue |
| Gevonden issues | Concrete punten uit checklist |
| Voorstel | Houden / Aanpassen / Samenvoegen met X / Schrappen |
| Actie nu | Klein gefixt / Wacht op akkoord |

Onderaan: **samenvattingstabel** "te schrappen", "samen te voegen", "te herbouwen", "uniformeer-acties" — daarop wacht ik jouw akkoord voor fase 2.

## Wat ik direct fix (zonder akkoord)

- Typo's en grammatica
- Lekkende `{{variabelen}}` (variabele bestaat niet of is null)
- Ontbrekende klantnaam/activiteit/datums in onderwerp of body waar de data wel beschikbaar is in de calling edge function
- Tone-inconsistenties (u/je verkeerd)
- Uniformeer ondertekening + footer per doelgroep (klant/partner/intern)
- Knoplabels en URL-bestemmingen kloppend maken
- `metadata.template_name` + `actor` toevoegen aan `logEmail`-calls die ze missen (uit audit-rapport `.lovable/audit-email-logging.md` bleken er nog 19)
- HTML-opmaak: dubbele groet, dubbele footer, kapotte tabellen

## Wat ik **niet** zonder akkoord doe

- Templates samenvoegen of verwijderen
- Een mail compleet herschrijven (bv. arrival_reminder of guest_details_reminder)
- Nieuwe trigger-momenten introduceren of weghalen
- Wijzigingen die meerdere edge functions raken (bv. één gecombineerde "wijzigingsmail" i.p.v. 4 losse)

Voor die ingrepen krijg je een lijst in het rapport en kies je per item ja/nee.

## Verificatie

- Na elke aanpassing render ik de template met dummy-data via `render-email-template` om te checken dat alle variabelen invullen
- Voor edge-function mails: dry-run in test-mode (preview rerouting), check `email_log` op `template_name` + `actor`
- Steekproef van 5 cruciale mails (welkom partner, offerte klant, annulering partner, arrival reminder, bevestiging boeking) krijg je als screenshot in het rapport zodat je visueel kan tekenen

## Tijd & oplevering

- Rapport + kleine fixes: in één doorloop
- Daarna jij in 1 ronde: akkoord op samenvoeg/schrap-voorstellen
- Fase 2 (samenvoegen/schrappen): aparte ronde

## Buiten scope

- Auth-mails (Supabase signup/recovery) — die loop niet via deze flow
- AI-gegenereerde mails (Claudia) — andere review nodig
