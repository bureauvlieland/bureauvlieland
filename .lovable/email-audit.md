# Email-systeem audit — productie release sweep

_Gegenereerd: 2026-05-18 — 47 templates, 47 email-edge-functions_

## Legenda
- 🔴 Blocker (moet gefixt vóór release)
- ⚠️ Warning (fix wenselijk)
- ✅ Geen issues gevonden

Brandkleur: `#0F4C5C` (teal). Wrapper-skeleton in `_shared/email-templates.ts > wrapEmailHtml()`.

## Samenvatting

**Templates (47)**: 🔴 4 · ⚠️ 35 · ✅ 8

**Edge functions (47)**: 🔴 34 · ⚠️ 1 · ✅ 12

## Templates per status

### 🔴 Blockers (4)

#### `Logies gekozen (Klant)` (?)
- Subject: `Uw logies is geboekt: {{accommodation_name}}`
- Body length: 1870 chars · vars: 7
- 🎨 **Kleuren buiten palette**: #f0fdf4 (niet in palette), #166534 (niet in palette), #f0f9ff (niet in palette), #4a5568 (niet in palette), #bbf7d0 (niet in palette)
- 💶 **Dubbele €**: ['€ {{price_total}}']

#### `Pro Forma Commissie Notificatie` (?)
- Subject: `Commissie-opgave voor {{customer_name}} - {{item_name}}`
- Body length: 2619 chars · vars: 9
- 🎨 **Kleuren buiten palette**: #e9ecef (niet in palette), #ffc107 (niet in palette)
- 💶 **Dubbele €**: ['€{{quoted_amount_incl}}', '€{{amount_excl_vat}}', '€{{commission_amount}}', '€{{commission_amount}}']

#### `Programma aanvraag - Bureau notificatie` (?)
- Subject: `Nieuwe programma aanvraag - {{number_of_people}} personen`
- Body length: 1180 chars · vars: 11
- 💶 **Dubbele €**: ['€ {{bureau_fee}}']

#### `Programma aanvraag - Klant bevestiging` (?)
- Subject: `Bevestiging programma aanvraag - Bureau Vlieland`
- Body length: 2742 chars · vars: 8
- 🎨 **Kleuren buiten palette**: #2d3748 (niet in palette), #edf2f7 (niet in palette), #1a365d (niet in palette), #4a5568 (niet in palette), #e2e8f0 (niet in palette), #f7fafc (niet in palette), #0066cc (niet in palette), #fffbeb (niet in palette), #718096 (niet in palette), #78350f (niet in palette)
- 💶 **Dubbele €**: ['€ {{bureau_fee}}']

### ⚠️ Warnings (35)

#### `Aankomstmail (programma + bootinfo)` (?)
- Subject: `Over een paar dagen bent u op Vlieland — uw programma & aankomstinformatie`
- Body length: 1449 chars · vars: 6
- 🎨 **Kleuren buiten palette**: #1f2937 (niet in palette)

#### `Annulering - Logiespartner` (partner)
- Subject: `Logiesaanvraag geannuleerd - {{customer_name}}`
- Body length: 891 chars · vars: 4
- 🎨 **Kleuren buiten palette**: #e2e8f0 (niet in palette), #f7fafc (niet in palette), #4a5568 (niet in palette)

#### `Annulering (Klant)` (?)
- Subject: `Uw programma-aanvraag is geannuleerd`
- Body length: 1177 chars · vars: 4
- 🎨 **Kleuren buiten palette**: #f7fafc (niet in palette), #4a5568 (niet in palette)

#### `Annulering (Partner)` (?)
- Subject: `Aanvraag {{reference_number}} is geannuleerd`
- Body length: 1026 chars · vars: 5
- 🎨 **Kleuren buiten palette**: #f6ad55 (niet in palette), #4a5568 (niet in palette), #fffaf0 (niet in palette), #f7fafc (niet in palette)

#### `Chat antwoord - Bezoeker notificatie` (?)
- Subject: `Nieuw bericht van Bureau Vlieland`
- Body length: 645 chars · vars: 3
- 🎨 **Kleuren buiten palette**: #1e3a5f (niet in palette)

#### `Chat notificatie - Bureau` (?)
- Subject: `💬 Nieuw chatbericht van {{visitor_name}} ({{source_label}})`
- Body length: 326 chars · vars: 5
- 🎨 **Kleuren buiten palette**: #ccc (niet in palette), #555 (niet in palette)

#### `Datumwijziging - Activiteitenpartner` (partner)
- Subject: `Datumwijziging aanvraag - {{customer_name}}`
- Body length: 469 chars · vars: 3
- 🎨 **Kleuren buiten palette**: #f5f5f5 (niet in palette)

#### `Datumwijziging - Klant bevestiging` (?)
- Subject: `Datumwijziging bevestigd`
- Body length: 595 chars · vars: 4
- 🎨 **Kleuren buiten palette**: #2563eb (blue-600)

#### `Datumwijziging - Logiespartner` (partner)
- Subject: `Datumwijziging logiesaanvraag - {{customer_name}}`
- Body length: 1439 chars · vars: 6
- 🎨 **Kleuren buiten palette**: #718096 (niet in palette), #4a5568 (niet in palette), #f7fafc (niet in palette)

#### `Definitieve boeking - Klant` (?)
- Subject: `Uw boeking is definitief — {{reference_number}}`
- Body length: 1736 chars · vars: 3
- 🎨 **Kleuren buiten palette**: #f4f7fb (niet in palette), #1e3a5f (niet in palette)

#### `Definitieve boeking - Partner` (?)
- Subject: `Definitieve boeking — {{customer_name}}`
- Body length: 846 chars · vars: 3
- 🎨 **Kleuren buiten palette**: #1e3a5f (niet in palette)

#### `Gewijzigd aantal gasten - Logiespartner` (partner)
- Subject: `Gewijzigd aantal gasten - {{customer_name}}`
- Body length: 1217 chars · vars: 5
- 🎨 **Kleuren buiten palette**: #0d9488 (niet in palette), #f0fdfa (niet in palette), #99f6e4 (niet in palette)

#### `Herinnering klant: aanvraag openstaand` (klant)
- Subject: `Herinnering: uw aanvraag bij Bureau Vlieland staat nog open`
- Body length: 786 chars · vars: 3
- 🎨 **Kleuren buiten palette**: #0f766e (niet in palette)

#### `Herinnering klant: offerte staat klaar` (klant)
- Subject: `Herinnering: logiesofferte(s) wachten op uw keuze`
- Body length: 947 chars · vars: 6
- 🎨 **Kleuren buiten palette**: #f8fafc (niet in palette), #0f766e (niet in palette)

#### `Herinnering partner: offerte gevraagd` (partner)
- Subject: `Herinnering: offerteaanvraag logies voor {{customer_name}}`
- Body length: 1127 chars · vars: 7
- 🎨 **Kleuren buiten palette**: #f8fafc (niet in palette), #0f766e (niet in palette)

#### `Klantbericht naar logiespartner` (partner)
- Subject: `{{subject}}`
- Body length: 1154 chars · vars: 8
- 🎨 **Kleuren buiten palette**: #2d3748 (niet in palette), #4a5568 (niet in palette), #e2e8f0 (niet in palette), #744210 (niet in palette), #fef9e7 (niet in palette), #f7fafc (niet in palette)

#### `Klantnotificatie bij partnerantwoord` (partner)
- Subject: `Nieuw bericht over uw reservering — {{reference_number}}`
- Body length: 1550 chars · vars: 5
- 🎨 **Kleuren buiten palette**: #eee (niet in palette), #555 (niet in palette), #1a365d (niet in palette), #f7f7f7 (niet in palette)
- 🗣️ **Tone**: partner-mail bevat formeel 'U/Uw' (2x)

#### `Logies aanvraag (Klant)` (?)
- Subject: `Uw logies-aanvraag is ontvangen`
- Body length: 1585 chars · vars: 6
- 🎨 **Kleuren buiten palette**: #f0fdf4 (niet in palette), #166534 (niet in palette), #f0f9ff (niet in palette), #4a5568 (niet in palette), #718096 (niet in palette)

#### `Logies gekozen (Partner)` (?)
- Subject: `Logiesofferte geaccepteerd — {{accommodation_name}}`
- Body length: 1954 chars · vars: 8
- 🎨 **Kleuren buiten palette**: #f0fdf4 (niet in palette), #166534 (niet in palette), #2d3748 (niet in palette), #4a5568 (niet in palette), #16a34a (niet in palette), #f7fafc (niet in palette)

#### `Logies offerte notificatie` (?)
- Subject: `Nieuwe logies-offerte ontvangen: {{accommodation_name}}`
- Body length: 1677 chars · vars: 7
- 🎨 **Kleuren buiten palette**: #f0fdf4 (niet in palette), #166534 (niet in palette), #4a5568 (niet in palette), #bbf7d0 (niet in palette), #718096 (niet in palette)

#### `Logiesofferte verlopen - Partner notificatie` (?)
- Subject: `Uw logiesofferte voor {{customer_name}} is verlopen`
- Body length: 526 chars · vars: 5
- 🎨 **Kleuren buiten palette**: #2563eb (blue-600)

#### `Nieuwe activiteit - Partner` (?)
- Subject: `Nieuwe activiteit toegevoegd - {{customer_name}}`
- Body length: 1264 chars · vars: 10
- 🎨 **Kleuren buiten palette**: #f5f5f5 (niet in palette), #ddd (niet in palette)

#### `Offerte aanvraag (Bureau)` (?)
- Subject: `Nieuwe offerte-aanvraag van {{customer_name}}`
- Body length: 2019 chars · vars: 9
- 🎨 **Kleuren buiten palette**: #2d3748 (niet in palette), #b45309 (niet in palette), #fffbeb (niet in palette), #f7fafc (niet in palette)

#### `Offerte aanvraag (Klant)` (?)
- Subject: `Uw offerte-aanvraag is ontvangen`
- Body length: 1309 chars · vars: 5
- 🎨 **Kleuren buiten palette**: #2d3748 (niet in palette), #f7fafc (niet in palette), #4a5568 (niet in palette)

#### `Offerte versturen naar klant` (klant)
- Subject: `Uw maatwerkvoorstel van Bureau Vlieland`
- Body length: 1846 chars · vars: 5
- 🎨 **Kleuren buiten palette**: #f8fafc (niet in palette), #f0f4f8 (niet in palette)

#### `Partner introductie portaal` (?)
- Subject: `De partnerportal van Bureau Vlieland — even voorstellen`
- Body length: 1842 chars · vars: 0
- 🎨 **Kleuren buiten palette**: #e2e8f0 (niet in palette), #1e3a5f (niet in palette), #0066cc (niet in palette)

#### `Partner uitnodiging` (?)
- Subject: `Welkom bij het Bureau Vlieland Partner Portaal — stel je wachtwoord in`
- Body length: 4915 chars · vars: 6
- 🎨 **Kleuren buiten palette**: #e8f0f8 (niet in palette), #f0f4ff (niet in palette), #fef9e7 (niet in palette)

#### `Partner wachtwoord reset` (?)
- Subject: `Wachtwoord resetten — Bureau Vlieland Partner Portal`
- Body length: 1453 chars · vars: 2
- 🎨 **Kleuren buiten palette**: #1e3a5f (niet in palette), #e2e8f0 (niet in palette), #0066cc (niet in palette)

#### `Programma aanvraag (Partner)` (?)
- Subject: `Nieuwe aanvraag voor {{activity_name}}`
- Body length: 2609 chars · vars: 10
- 🎨 **Kleuren buiten palette**: #c05621 (niet in palette), #f6ad55 (niet in palette), #2d3748 (niet in palette), #edf7ed (niet in palette), #4a5568 (niet in palette), #fff8e6 (niet in palette), #0066cc (niet in palette), #276749 (niet in palette), #f7fafc (niet in palette), #48bb78 (niet in palette)

#### `Programmawijzigingen - Partner` (?)
- Subject: `Wijziging aanvraag - {{customer_name}} - {{dates}}`
- Body length: 1216 chars · vars: 8
- 🎨 **Kleuren buiten palette**: #f5f5f5 (niet in palette), #ddd (niet in palette)

#### `Reactie op tegenvoorstel (Klant)` (?)
- Subject: `Reactie op uw tegenvoorstel: {{block_name}}`
- Body length: 1169 chars · vars: 12
- 🎨 **Kleuren buiten palette**: #718096 (niet in palette), #4a5568 (niet in palette)

#### `Status: Alternatief voorgesteld` (?)
- Subject: `Alternatief voorstel voor {{activity_name}}`
- Body length: 2573 chars · vars: 9
- 🎨 **Kleuren buiten palette**: #718096 (niet in palette), #2d3748 (niet in palette), #4a5568 (niet in palette), #fffaf0 (niet in palette), #dd6b20 (niet in palette), #f6ad55 (niet in palette)

#### `Status: Bevestigd` (?)
- Subject: `Uw activiteit {{activity_name}} is bevestigd!`
- Body length: 2303 chars · vars: 7
- 🎨 **Kleuren buiten palette**: #2d3748 (niet in palette), #9ae6b4 (niet in palette), #4a5568 (niet in palette), #38a169 (niet in palette), #718096 (niet in palette), #f0fff4 (niet in palette)

#### `Status: Niet beschikbaar` (?)
- Subject: `Helaas: {{activity_name}} is niet beschikbaar`
- Body length: 1993 chars · vars: 6
- 🎨 **Kleuren buiten palette**: #2d3748 (niet in palette), #fff5f5 (niet in palette), #4a5568 (niet in palette), #feb2b2 (niet in palette), #718096 (niet in palette), #e53e3e (niet in palette)

#### `Tegenvoorstel (Partner)` (?)
- Subject: `Tegenvoorstel van klant - {{block_name}}`
- Body length: 1313 chars · vars: 8
- 🎨 **Kleuren buiten palette**: #c4b5fd (niet in palette), #1a365d (niet in palette), #7c3aed (niet in palette), #f3e8ff (niet in palette)

### ✅ Clean (8)

#### `Activiteit geannuleerd - Partner` (?)
- Subject: `Annulering - {{customer_name}}`
- Body length: 405 chars · vars: 3

#### `Herinnering: gastenlijst & wensen` (?)
- Subject: `Herinnering: gastenlijst & wensen voor uw verblijf op Vlieland`
- Body length: 770 chars · vars: 3

#### `Logies — niet gekozen (Partner)` (?)
- Subject: `Logiesaanvraag — niet gekozen`
- Body length: 531 chars · vars: 4

#### `Pre-sales — Aanvraag opvolgen` (?)
- Subject: `Aanvulling op uw aanvraag — {{reference_number}}`
- Body length: 369 chars · vars: 1

#### `Pre-sales — Verduidelijking wensen` (?)
- Subject: `Even afstemmen — uw aanvraag {{reference_number}}`
- Body length: 445 chars · vars: 2

#### `Pre-sales — Voorstel komt eraan` (?)
- Subject: `Wij gaan voor u aan de slag — {{reference_number}}`
- Body length: 372 chars · vars: 2

#### `Pre-sales — Vraag aan partner` (partner)
- Subject: `Vraag over een aanvraag — {{reference_number}}`
- Body length: 273 chars · vars: 1

#### `Programmawijzigingen - Klant bevestiging` (?)
- Subject: `Uw programma is bijgewerkt — {{reference_number}}`
- Body length: 529 chars · vars: 3

## Edge functions per status

### 🔴 Blockers (34)

- **`accept-quote-proposal`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
  - 2x logEmail zonder template_name/actor
- **`admin-reset-partner-password`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`approve-quote-item`** — SSOT · logEmail · test-mode
  - 2x logEmail zonder template_name/actor
- **`cancel-program-request`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`check-pending-items`** — test-mode
  - verstuurt via Mailjet maar logt niet
- **`forward-bureau-invoice`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`forward-commission-invoice`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`forward-purchase-invoice`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`inbound-purchase-invoice`** — —
  - verstuurt via Mailjet maar logt niet
  - geen getRecipientEmail() — test-mode rerouting werkt niet
- **`mailjet-event-webhook`** — —
  - verstuurt via Mailjet maar logt niet
  - geen getRecipientEmail() — test-mode rerouting werkt niet
- **`notify-customer-price-change`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`notify-new-chat`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`notify-partner-cancellation`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`notify-partner-item-deletion`** — test-mode
  - verstuurt via Mailjet maar logt niet
- **`notify-partner-price-change`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`notify-partners-informational`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`process-completed-items`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`register-partner-invoice`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`send-accommodation-quote-request`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`send-arrival-reminder`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`send-bureau-invoice-to-customer`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`send-commission-invoice-to-partner`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`send-customer-accommodation-message`** — SSOT · logEmail · test-mode
  - 2x logEmail zonder template_name/actor
- **`send-guest-details-reminder`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`send-items-to-partners`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`send-partner-customer-message`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
  - 1x logEmail zonder template_name/actor
- **`send-partner-intro-email`** — SSOT · logEmail
  - 2x logEmail zonder template_name/actor
  - geen getRecipientEmail() — test-mode rerouting werkt niet
- **`send-program-request`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`send-project-email`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()
  - 1x logEmail zonder template_name/actor
- **`send-ticket-email`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`update-commission-status`** — test-mode
  - verstuurt via Mailjet maar logt niet
  - hardcoded HTML i.p.v. getRenderedTemplate()
- **`update-customer-program`** — SSOT · test-mode
  - verstuurt via Mailjet maar logt niet
- **`update-partner-item-status`** — SSOT · logEmail · test-mode
  - 1x logEmail zonder template_name/actor
- **`withdraw-accommodation-quote`** — logEmail · test-mode
  - hardcoded HTML i.p.v. getRenderedTemplate()

### ⚠️ Warnings (1)

- **`send-partner-mailing`** — logEmail
  - geen getRecipientEmail() — test-mode rerouting werkt niet

### ✅ Clean (12)

- **`bulk-invite-partners`** — SSOT · logEmail · test-mode
- **`inbound-email`** — SSOT · logEmail · test-mode
- **`invite-partner`** — SSOT · logEmail · test-mode
- **`notify-accommodation-quote`** — SSOT · logEmail · test-mode
- **`notify-new-chat-reply`** — SSOT · logEmail · test-mode
- **`resend-email`** — logEmail · test-mode
- **`resend-partner-invitation`** — SSOT · logEmail · test-mode
- **`select-accommodation-quote`** — SSOT · logEmail · test-mode
- **`send-accommodation-request`** — SSOT · logEmail · test-mode
- **`send-partner-reset-email`** — SSOT · logEmail · test-mode
- **`send-quote-offer`** — SSOT · logEmail · test-mode
- **`send-quote-request`** — SSOT · logEmail · test-mode

## Fix-batches (volgorde voor uitvoering)

Totaal templates te fixen: **39**. In batches van 5:

### Batch 1
- 🔴 `Logies gekozen (Klant)` (?)
- 🔴 `Pro Forma Commissie Notificatie` (?)
- 🔴 `Programma aanvraag - Bureau notificatie` (?)
- 🔴 `Programma aanvraag - Klant bevestiging` (?)
- ⚠️ `Aankomstmail (programma + bootinfo)` (?)

### Batch 2
- ⚠️ `Annulering - Logiespartner` (partner)
- ⚠️ `Annulering (Klant)` (?)
- ⚠️ `Annulering (Partner)` (?)
- ⚠️ `Chat antwoord - Bezoeker notificatie` (?)
- ⚠️ `Chat notificatie - Bureau` (?)

### Batch 3
- ⚠️ `Datumwijziging - Activiteitenpartner` (partner)
- ⚠️ `Datumwijziging - Klant bevestiging` (?)
- ⚠️ `Datumwijziging - Logiespartner` (partner)
- ⚠️ `Definitieve boeking - Klant` (?)
- ⚠️ `Definitieve boeking - Partner` (?)

### Batch 4
- ⚠️ `Gewijzigd aantal gasten - Logiespartner` (partner)
- ⚠️ `Herinnering klant: aanvraag openstaand` (klant)
- ⚠️ `Herinnering klant: offerte staat klaar` (klant)
- ⚠️ `Herinnering partner: offerte gevraagd` (partner)
- ⚠️ `Klantbericht naar logiespartner` (partner)

### Batch 5
- ⚠️ `Klantnotificatie bij partnerantwoord` (partner)
- ⚠️ `Logies aanvraag (Klant)` (?)
- ⚠️ `Logies gekozen (Partner)` (?)
- ⚠️ `Logies offerte notificatie` (?)
- ⚠️ `Logiesofferte verlopen - Partner notificatie` (?)

### Batch 6
- ⚠️ `Nieuwe activiteit - Partner` (?)
- ⚠️ `Offerte aanvraag (Bureau)` (?)
- ⚠️ `Offerte aanvraag (Klant)` (?)
- ⚠️ `Offerte versturen naar klant` (klant)
- ⚠️ `Partner introductie portaal` (?)

### Batch 7
- ⚠️ `Partner uitnodiging` (?)
- ⚠️ `Partner wachtwoord reset` (?)
- ⚠️ `Programma aanvraag (Partner)` (?)
- ⚠️ `Programmawijzigingen - Partner` (?)
- ⚠️ `Reactie op tegenvoorstel (Klant)` (?)

### Batch 8
- ⚠️ `Status: Alternatief voorgesteld` (?)
- ⚠️ `Status: Bevestigd` (?)
- ⚠️ `Status: Niet beschikbaar` (?)
- ⚠️ `Tegenvoorstel (Partner)` (?)

### Edge function fixes (parallel met template-batches)
- 🔴 `accept-quote-proposal` — hardcoded HTML i.p.v. getRenderedTemplate(); 2x logEmail zonder template_name/actor
- 🔴 `admin-reset-partner-password` — hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `approve-quote-item` — 2x logEmail zonder template_name/actor
- 🔴 `cancel-program-request` — verstuurt via Mailjet maar logt niet
- 🔴 `check-pending-items` — verstuurt via Mailjet maar logt niet
- 🔴 `forward-bureau-invoice` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `forward-commission-invoice` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `forward-purchase-invoice` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `inbound-purchase-invoice` — verstuurt via Mailjet maar logt niet; geen getRecipientEmail() — test-mode rerouting werkt niet
- 🔴 `mailjet-event-webhook` — verstuurt via Mailjet maar logt niet; geen getRecipientEmail() — test-mode rerouting werkt niet
- 🔴 `notify-customer-price-change` — hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `notify-new-chat` — verstuurt via Mailjet maar logt niet
- 🔴 `notify-partner-cancellation` — verstuurt via Mailjet maar logt niet
- 🔴 `notify-partner-item-deletion` — verstuurt via Mailjet maar logt niet
- 🔴 `notify-partner-price-change` — hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `notify-partners-informational` — hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `process-completed-items` — verstuurt via Mailjet maar logt niet
- 🔴 `register-partner-invoice` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `send-accommodation-quote-request` — hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `send-arrival-reminder` — verstuurt via Mailjet maar logt niet
- 🔴 `send-bureau-invoice-to-customer` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `send-commission-invoice-to-partner` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `send-customer-accommodation-message` — 2x logEmail zonder template_name/actor
- 🔴 `send-guest-details-reminder` — verstuurt via Mailjet maar logt niet
- 🔴 `send-items-to-partners` — hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `send-partner-customer-message` — hardcoded HTML i.p.v. getRenderedTemplate(); 1x logEmail zonder template_name/actor
- 🔴 `send-partner-intro-email` — 2x logEmail zonder template_name/actor; geen getRecipientEmail() — test-mode rerouting werkt niet
- 🔴 `send-program-request` — verstuurt via Mailjet maar logt niet
- 🔴 `send-project-email` — hardcoded HTML i.p.v. getRenderedTemplate(); 1x logEmail zonder template_name/actor
- 🔴 `send-ticket-email` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `update-commission-status` — verstuurt via Mailjet maar logt niet; hardcoded HTML i.p.v. getRenderedTemplate()
- 🔴 `update-customer-program` — verstuurt via Mailjet maar logt niet
- 🔴 `update-partner-item-status` — 1x logEmail zonder template_name/actor
- 🔴 `withdraw-accommodation-quote` — hardcoded HTML i.p.v. getRenderedTemplate()
- ⚠️ `send-partner-mailing` — geen getRecipientEmail() — test-mode rerouting werkt niet
