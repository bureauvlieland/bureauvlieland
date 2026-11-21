# Bijlage bij docs/plan-notificaties.md: volledige inventaris per functie

Opgesteld 21 november 2026 uit de code (stand `main`). Deel A is de e-mailinventaris, deel B de overige kanalen (Werkbank-taken, portalen, WhatsApp, instellingen, cron).

# Deel A — E-mail


Bron: `supabase/functions/**` (stand repo 2026-11-21). Verzending loopt overal via Mailjet (`_shared/mailjet-send.ts` of een eigen `fetch` naar `api.mailjet.com/v3.1/send`); `installMailjetBodyCapture()` in `mailjet-send.ts:239-316` wrapt `fetch` zodat **elke** Mailjet-send (ook de "eigen" fetches) door de suppressielijst (`email_suppressions`) wordt gehaald en bij een geblokkeerd adres een Werkbank-taak krijgt (`_shared/undeliverable.ts`). Testmodus (`getRecipientEmail`, `_shared/email-templates.ts:241-244`) stuurt alles naar `erwin@bureauvlieland.nl` met `[TEST]`-prefix.

Bureau-adres: `getBureauAdminEmail()` (`_shared/email-templates.ts:420-422`) → `app_settings.bureau_admin_email` (via branding-cache); `GENERAL_CONTACT_EMAIL = hallo@bureauvlieland.nl` (`_shared/bureau-contact.ts:3`); systeemalerts: `app_settings.bureau_admin_email` → env `ADMIN_ALERT_EMAIL` → fallback (`hallo@` of `administratie@bureauvlieland.nl`, verschilt per functie).

## Cron-schema's (wat in de repo staat)

| Job | Schedule | Bron |
|---|---|---|
| `critical-selftest-daily` | `45 5 * * *` (UTC) | `supabase/migrations/20260831124516_…sql:87-97` |
| `email-webhook-heartbeat-daily` | `15 6 * * *` | `supabase/migrations/20260901201703_…sql:32-42` |
| `map-sync-blocks-nightly` | `30 4 * * *` (geen mail) | `…20260908160000_map-sync-bouwstenen.sql:22` |
| `wedding-referrals-expire-daily` | `15 3 * * *` (SQL, geen mail) | `…20260928120000_bruiloftsdoorverwijzingen.sql:286` |
| `scan-stale-pending-changes` | `0 7 * * *` (SQL, geen mail) | `…20260524120334_…sql:97` |

**Niet in de repo** (jobs zijn destijds direct in de database gezet, zie `docs/deployen.md:200-250` en `supabase/migrations/20260921113000_cron-bearer-en-timeout.sql:1-30`, dat bestaande jobs alleen herschrijft): `check-pending-items` (volgens `.lovable/plan/code-review-…-2026-09-02.md:14` **twee keer** dagelijks, 08:00 én 09:00 — dubbele herinneringen mogelijk; of dat inmiddels is opgeruimd is niet uit de repo af te leiden), `send-partner-headsup-t3` (codecommentaar: dagelijks 08:00 NL, `send-partner-headsup-t3/index.ts:5`), `send-arrival-reminder` (dagelijks, `:4`), `send-guest-details-reminder` (dagelijks, genoemd in `docs/deployen.md:241`), `cron-watchdog` (dagelijks), `flag-missing-partner-invoices-daily` (`roadmap.md:34`, maakt alleen todos, geen mail), `auto-close-past-execution` + `auto-close-monitor`, `notify-partners-missing-invoice-pdf` (modus `auto`, genoemd als cron in de migratie-header `20260921113000:20-22`), `refresh-google-reviews-daily` → `fetch-google-reviews` (geen mail). Exacte tijden van deze jobs staan alleen in `cron.job` in productie (zichtbaar via `get_scheduled_job_health()` / ScheduledJobsCard).

## A.A Inventaris per `email_type` (actueel geproduceerd)

Kolom "Ontvanger": klant / partner / bureau / boekhouding / bezoeker. "Trigger": wie/wat de function aanroept.

### Aanvragen

| email_type | Function | Ontvanger | Trigger | Condities / throttling | Inhoud |
|---|---|---|---|---|---|
| `program_request_bureau` | `send-program-request/index.ts:290` | bureau (`getBureauAdminEmail`, `:261`) | Bezoeker verstuurt programma-aanvraag (configurator `CheckoutContactForm.tsx`, `ProgrammaOpMaat.tsx`) | In-memory rate limit per IP (`:14-29`); beide mails in één Mailjet-call | Nieuwe aanvraag met klantgegevens + adminlink |
| `program_request_customer` | `send-program-request/index.ts:306` | klant | idem | idem | Bevestiging "aanvraag ontvangen" |
| `catering_request_bureau` | `send-catering-request/index.ts:222` | bureau (`getBureauAdminEmail`, `:83`) | Bezoeker verstuurt cateringaanvraag (`CateringQuickRequest.tsx`) | In-memory rate limit; via `sendMailjet` (suppressie) | Interne melding cateringaanvraag |
| `catering_request_customer` | `send-catering-request/index.ts:203` | klant | idem | in testmodus gaat de klantmail naar bureau-adres (`:173`) | Bevestiging aan klant |
| `quote_request_bureau` | `send-quote-request/index.ts:250` | bureau (`:208`) | Bezoeker vraagt offerte aan (geen UI-caller in `src/` gevonden via `functions.invoke`; functie is wel geconfigureerd) | Rate limit per IP | Interne melding offerteaanvraag |
| `quote_request_customer` | `send-quote-request/index.ts:265` | klant | idem | | Bevestiging offerteaanvraag |
| `program_request_partner` | `send-items-to-partners/index.ts:457` (admin), `accept-quote-proposal/index.ts:612`, `approve-quote-item/index.ts:367,489,511`, `notify-partners-informational/index.ts:139`, `notify-date-change/index.ts:320`, `notify-headcount-change-bulk/index.ts:312`, `notify-partner-headcount-change/index.ts:248` | partner | (a) admin-knop "Stuur naar partners" (`AdminRequestDetail.tsx`); (b) admin "accept-quote-proposal" (admin-pad verstuurt items na akkoord); (c) klant keurt item goed in klantportaal → `approve-quote-item` roept `send-items-to-partners` (mode `force`) aan als item nog niet verstuurd was (`approve-quote-item:235-290`), óf stuurt zelf een "klant akkoord op uw voorstel"-mail bij re-approval (`:292-390`); (d) datum-/aantalwijziging door admin (dialogen `NotifyDateChangeDialog`, `NotifyHeadcountChangeDialog`) of klant (`update-customer-program` → `notify-date-change`) | Alleen items met `skip_partner_notification=true` (auto-modus) of expliciet `item_ids` + `mode:"force"` (`send-items-to-partners:168-223`); force op al verzonden items = "Herinnering"-onderwerp (`:107,442`). Geen partner-mail voor `bureau`/`self_arranged`-items. **Let op**: `template_name` in metadata verschilt (`date_change_partner`, `headcount_change_partner_bulk`, `partner_headcount_change`, `program_partner_reapproval`) maar `email_type` is overal `program_request_partner` | Aanvraag/wijziging/herinnering aan partner met portal-link |

### Offerte en akkoord

| email_type | Function | Ontvanger | Trigger | Condities | Inhoud |
|---|---|---|---|---|---|
| `quote_offer_customer` | `send-quote-offer/index.ts:244` | klant | Admin verstuurt offerte (`AdminSendQuoteDialog.tsx`, `AdminQuotePreview.tsx`) | Zet `quote_status=offerte_verstuurd` + `quote_valid_until` (`:264-280`); optionele PDF-bijlage | Offerte met geldigheidsdatum |
| `quote_accepted_customer` | `accept-quote-proposal/index.ts:446,467` | klant | Klant klikt "akkoord" op voorstel (klantportaal `useCustomerProgram.ts`) of admin (`AdminRequestDetail.tsx`) | Alleen bij klant-pad; geldigheidsdatum gecontroleerd (`:311-325`). Maakt admin-todo `send_items_to_partners` (`:491-508`) — **geen bureau-mail** | "Uw akkoord is ontvangen" |
| `customer_terms_request` | `send-terms-request/index.ts:135` (handmatig) en `check-pending-items/index.ts:1881` (automatisch, via `pickTermsMail`) | klant | Admin-knop "Ondertekenverzoek" (`SendTermsRequestButton.tsx`) óf dagelijkse cron | Automatische reeks (`_shared/customerTermsReminder.ts:28-47`): `customer_terms_request` (eerste), daarna `customer_terms_reminder_t14` / `_t7` / `_t3` bij ≤14/7/3 dagen vóór eerste datum; elk type max. 1x per project; min. 2 dagen tussen twee mails (`:36`); alleen `offerte_verstuurd` (na `QUOTE_FOLLOWUP_AFTER_DAYS`) / `akkoord_ontvangen` / `definitief_bevestigd` zonder `terms_accepted_at` (`check-pending-items:1770-1773`); overgeslagen bij gesnoozed/"hot" (contact ≤2d) project; `reminder_email_enabled` (app_settings) moet aan staan | Vraag om voorwaarden te ondertekenen, link naar tab Akkoord |
| `customer_terms_reminder_t14` / `_t7` / `_t3` | `check-pending-items/index.ts:1881` | klant | cron | zie boven | Herinnering ondertekening (**niet in labelkaart**) |
| `booking_confirmed_customer` | `update-customer-program/index.ts:1591` | klant | Klant ondertekent voorwaarden in klantportaal (`acceptTerms`, `:1195-1230`) | Eén Mailjet-batch met partnermails | Boekingsbevestiging |
| `booking_confirmed_partner` | `update-customer-program/index.ts:1475` | partner | idem | Per provider met `status=confirmed` items (`:1388-1400`), geen `self_arranged` | "Definitieve boeking" + factuurinstructie |
| `reminder_quote_pending` | `check-pending-items/index.ts:446` | logies-partner | cron (CHECK 2) | `accommodation_quotes.status=pending` ouder dan `reminder_days_partner_quote` (default 5 d.); todo `quote_pending_partner` nog niet open; herhaling max. 1x per 7 dagen per type/adres/item (`REMINDER_REPEAT_DAYS`, `:6,139-155`); `reminder_email_enabled` | Herinnering logiesofferte indienen |
| `quote_expired_partner` | `check-pending-items/index.ts:852` | logies-partner | cron (CHECK 5) | `status=submitted` en `valid_until < vandaag`; zet offerte op `expired`; alleen gelogd bij succes (`:846-866`) | Offerte verlopen |

### Programma en onderdelen

| email_type | Function | Ontvanger | Trigger | Condities | Inhoud |
|---|---|---|---|---|---|
| `status_confirmed` / `status_alternative` / `status_unavailable` | `update-partner-item-status/index.ts:792` (templateId `:735-742`) | klant | **Partner** reageert in partnerportaal (`PartnerProject.tsx:128`) met `confirmed` / `alternative` / `unavailable` | Geen klantmail bij `confirmed` op een bevestiging-onderdeel zonder offerte (`skipCustomerEmail`, `:726-730`); niet bij `executed` / `acknowledge_price_change` | Status aan klant met "Aan zet"-regel en portal-link |
| `counter_proposal_response` | `update-partner-item-status/index.ts:593` | klant | Partner reageert op een klant-tegenvoorstel (`oldStatus === "counter_proposed"`, `:485`) | Extra naast status-mail | Reactie op tegenvoorstel |
| `counter_proposal_partner` | `update-customer-program/index.ts:1097` | partner | Klant doet tegenvoorstel tijd (`counterProposal`) | `provider_email` aanwezig, niet `self_arranged` (`:1036`) | Tegenvoorstel klant |
| `customer_counter_proposal_bureau` | `update-customer-program/index.ts:1143` | bureau (hard `hallo@bureauvlieland.nl`, `:1136,1145`) | idem | Altijd bij tegenvoorstel | Interne melding tegenvoorstel met deeplink |
| `item_added_partner` | `update-customer-program/index.ts:1736` | partner | Klant voegt onderdeel toe in klantportaal (`changes` type `added`) | `block.provider.email` aanwezig, niet `self_arranged` (`:1670`) | Nieuw onderdeel aangevraagd |
| `item_added_customer_approval` | `publish-program-changes/index.ts:840` (via `customerTemplateId`, `:812-815`) | klant | Admin publiceert wijzigingen (`PublishChangesDialog.tsx`) | Alleen als er nieuwe onderdelen zijn die klant-akkoord vereisen; `notifyCustomer` (default true, `:120`) | Programma bijgewerkt, akkoord gevraagd |
| `item_changes_customer` | `publish-program-changes/index.ts:840` (anders) en `update-customer-program/index.ts:1992` | klant | Admin publiceert wijzigingen; klant wijzigt zelf (bevestiging) | zie boven | Programma bijgewerkt |
| `item_changes_partner` | `publish-program-changes/index.ts:919`, `update-customer-program/index.ts:1924` | partner | Admin publiceert (alleen partners in `notifyPartnerIds`, `:121`); klant wijzigt tijd/aantal/notities (gegroepeerd per provider, `:1828-1835`) | | Wijziging onderdeel |
| `item_cancelled_partner` | `update-customer-program/index.ts:961` | partner | Klant annuleert één onderdeel (`cancelItemId`) | `provider_email`, niet `self_arranged` (`:921`) | Onderdeel geannuleerd door klant (**niet in labelkaart**; label kent alleen `partner_item_cancellation`) |
| `date_change_customer` | `update-customer-program/index.ts:612` | klant | Klant wijzigt datums (`programDetails`) | Maakt ook todo `customer_date_change_partner_notify` (`:575`) en roept `notify-date-change` aan voor partners (actor `customer`) | Datumwijziging ontvangen |
| `partner_activity_unconfirmed_t7` | `check-pending-items/index.ts:1329` | partner | cron | Item `pending`, exact 7 dagen vóór uitvoeringsdatum; `skip_partner_notification=false`; `customer_approved_at` gezet; er bestaat een eerdere `program_request_partner`-mail voor dit item (`:1265-1295`); project `active`; 7-dagen dedupe | "Reactie nodig over 7 dagen" |
| `partner_headsup_t3` | `send-partner-headsup-t3/index.ts:335` | partner | cron (dagelijks, "08:00 NL") | Items `status=accepted`, `skip_partner_notification=false`, echte partner, activiteitsdatum = vandaag+3; dedupe op (`email_type`,`related_item_id`,`status=sent`); alleen als ooit `program_request_partner` is verstuurd (`:168-189`) | Briefing T-3 met gastenlijst/dieet/instructies (**labelkaart gebruikt `partner_briefing_t3`, code logt `partner_headsup_t3`**) |
| `reminder_activity_pending` | `check-pending-items/index.ts:329` | partner | cron (CHECK 1) | Item `pending` ouder dan 3 dagen (`DEFAULT_REMINDER_DAYS_PARTNER_ACTIVITY`), project `active` & niet verlopen; todo `partner_reminder` nog niet open; 7-dagen dedupe; snooze/hot-skip | Herinnering reageren (**niet in labelkaart**) |
| `reminder_headcount_pending` | `check-pending-items/index.ts:572` | logies-partner | cron (CHECK 2b) | Geselecteerde logies, `headcount_change_requested_at` ouder dan `reminder_days_partner_quote`, nog geen `headcount_proposal` | Herinnering nieuw aantal bevestigen (**niet in labelkaart**) |
| `arrival_reminder` | `send-arrival-reminder/index.ts:160` | klant | cron (dagelijks) | `terms_accepted_at` gezet, niet geannuleerd, eerste datum in 3–5 dagen; 1x per project (dedupe `:68-75`); programma-docx als bijlage | Aankomstmail met veerinstructies |
| `guest_details_reminder` | `send-guest-details-reminder/index.ts:114` | klant | cron (dagelijks) | Eerste datum ~13–15 dagen vooruit, voorwaarden getekend, gastnamen ontbreken of (bij catering) dieetwensen ontbreken; 1x per project (`:70-77`) | Herinnering gastgegevens |
| `customer_aftersales_review` | `send-customer-aftersales/index.ts:161,195` | klant | Admin-knop (`AdminRequestDetail.tsx`, `AftersalesCatchUpCard.tsx`) óf automatisch via `check-pending-items:1173` | Auto alleen als `app_settings.customer_aftersales_auto_send=true` (default false → dan alleen todo `customer_aftersales`); `customer_aftersales_days_after` (default 3) na afloop; `aftersales_sent_at` leeg (`:1128-1200`) | Nazorg/beoordelingsverzoek |
| `customer_review_google_reminder` | `send-review-reminder/index.ts:223` | klant | Dagelijks via `check-pending-items:1218` (`mode:"due"`) of admin "Herinner nu" (`AdminReviews.tsx`) | `customer_review_reminder_enabled` (default aan), `customer_review_reminder_days` (default 7); alleen beoordelingen zonder Google-klik, niet eerder herinnerd/overgeslagen (`:72-77`) | Eén Google-herinnering (**niet in labelkaart**) |

### Logies

| email_type | Function | Ontvanger | Trigger | Condities | Inhoud |
|---|---|---|---|---|---|
| `accommodation_request_customer` | `send-accommodation-request/index.ts:253` | klant | Bezoeker vult logieswizard in (`AccommodationWizard.tsx`) | **Geen bureau-mail meer** (commentaar `:237`: bureau ziet aanvraag in dashboard) | Bevestiging logiesaanvraag |
| `accommodation_quote_request_partner` | `send-accommodation-quote-request/index.ts:257`; ook `email_type` voor `notify-date-change:487` en `notify-headcount-change-bulk:410` (template_names `date_change_accommodation_partner`, `headcount_change_accommodation_partner`) | logies-partner | Admin verstuurt aanvraag naar logiespartners (`AdminAccommodationDetail.tsx`); admin datum-/aantalwijziging | | Offerteaanvraag logies / wijziging |
| `accommodation_quote_notification` | `notify-accommodation-quote/index.ts:293` | klant | Admin stuurt binnengekomen logiesofferte door (`AdminAccommodationDetail.tsx`) | via `sendMailjet`; bij suppressie `skipped` (`:271`) | Logiesofferte binnen |
| `accommodation_quote_withdrawn` | `withdraw-accommodation-quote/index.ts:124` | logies-partner | Admin trekt aanvraag in | | Aanvraag ingetrokken |
| `accommodation_selected_customer` | `select-accommodation-quote/index.ts:650,668` | klant | Klant kiest logies in portaal (`useCustomerProgram.ts`, `useAccommodationQuotes.ts`) of admin (`AdminAccommodationDetail.tsx`, `adminOverride`) | | Logies geboekt |
| `accommodation_selected_partner` | `select-accommodation-quote/index.ts:498,517` | gekozen partner | idem | | Offerte geaccepteerd |
| `accommodation_rejected_partner` | `select-accommodation-quote/index.ts:735,754` | overige partners | idem | Alleen quotes met status `pending`/`submitted` ≠ gekozen (`:305-322`) | Offerte niet gekozen |
| `accommodation_headcount_confirmed_customer` | `approve-accommodation-headcount/index.ts:298` | klant | Admin keurt partnervoorstel nieuw aantal goed (`AccommodationHeadcountReviewCard.tsx`, `decision:"approve"`) | | Nieuw aantal bevestigd (**niet in labelkaart**) |
| `accommodation_headcount_confirmed_partner` | `approve-accommodation-headcount/index.ts:353` | partner | idem | | (**niet in labelkaart**) |
| `accommodation_headcount_rejected_partner` | `approve-accommodation-headcount/index.ts:436` | partner | Admin wijst af (`decision:"reject"`, reden verplicht `:98`) | | (**niet in labelkaart**) |
| `customer_accommodation_message` | `send-customer-accommodation-message/index.ts:227,250` | logies-partner | Klant stuurt bericht vanuit klantportaal (`ContactAccommodationDialog.tsx`) | | Bericht klant → partner |
| `partner_customer_message` | `send-partner-customer-message/index.ts:192` | klant | Partner stuurt bericht vanuit partnerportaal (`PartnerCustomerMessagesPanel.tsx`) | | Bericht partner → klant |
| `lodging_quote_submitted_bureau` / `lodging_quote_revised_bureau` | `_shared/lodging-bureau-alert.ts:219` via `create-quote-review-todo/index.ts:94` | bureau (`GENERAL_CONTACT_EMAIL`) | Partner dient logiesofferte in/herziet (partnerportaal `PartnerAccommodation.tsx`) | Idempotency `lodging-alert-<type>-<quoteId>-<versie>` (`:189-205`); `checkSuppression:false` | Interne melding offerte (**niet in labelkaart**) |
| `lodging_quote_declined_bureau` | idem via `decline-accommodation-quote/index.ts:246` | bureau | Partner wijst logiesaanvraag af | idem | (**niet in labelkaart**) |
| `lodging_headcount_confirmed_bureau` | idem via `confirm-accommodation-headcount/index.ts:232` | bureau | Partner bevestigt nieuw aantal gasten | idem | (**niet in labelkaart**) |

### Annulering

| email_type | Function | Ontvanger | Trigger | Condities | Inhoud |
|---|---|---|---|---|---|
| `cancellation_customer` | `cancel-program-request/index.ts:360` | klant | Klant annuleert in klantportaal of admin annuleert (`AdminRequestDetail.tsx`) | | Annuleringsbevestiging |
| `cancellation_partner` | `notify-partner-cancellation/index.ts:238` | partner | Admin-dialoog (`PartnerCancellationNotifyDialog.tsx`, `AdminProjects.tsx`) met keuze welke partners; bij klantannulering automatisch via `cancel-program-request:302-313` (`notify_partners`, default true; admin-flow geeft `false` mee) | Items met status pending/confirmed/accepted/counter_proposed, niet `self_arranged`; optioneel `partner_ids`-filter | Project geannuleerd |
| `cancellation_accommodation_partner` | `notify-partner-cancellation/index.ts:370` | logies-partner | idem | Alleen als `linked_accommodation_id`; status ≠ rejected/declined | Annulering logies |
| `partner_item_cancellation` | `notify-partner-item-deletion/index.ts:98` | partner | Admin verwijdert onderdeel/onderdelen (`item_ids`) — **geen UI-caller gevonden in `src/`** | Niet voor bureau/self_arranged; niet als item nooit verstuurd (`:206-210`) | Onderdeel vervallen |

### Facturatie

| email_type | Function | Ontvanger | Trigger | Condities | Inhoud |
|---|---|---|---|---|---|
| `bureau_invoice_to_customer` | `send-bureau-invoice-to-customer/index.ts:256,285` | klant | Admin verstuurt verkoopfactuur | Idempotency key (10 min) | Factuur + PDF |
| `bureau_invoice_forward` | `forward-bureau-invoice/index.ts:568` | boekhouding (Snelstart-adres) | Admin (`ForwardBureauInvoiceDialog.tsx`) | | Factuur naar boekhouding (UBL/PDF) |
| `purchase_invoice_forward` | `forward-purchase-invoice/index.ts:286`; `finalize-collective-invoice/index.ts:318` (directe `email_log`-insert, `template_name: collective_invoice_forward`) | boekhouding | Admin (`ForwardToAccountingDialog.tsx`, `AdminPurchaseInvoices.tsx`); verzamelfactuur afronden | | Inkoopfactuur doorsturen |
| `commission_invoice_forward` | `forward-commission-invoice/index.ts:202` | boekhouding | Admin (`AdminCommissionInvoices.tsx`) | | (**niet in labelkaart**) |
| `commission_invoice_sent` | `send-commission-invoice-to-partner/index.ts:273,322` | partner | Admin verstuurt commissiefactuur | Alleen definitieve facturen; idempotency | Commissiefactuur (**niet in labelkaart**) |
| `partner_invoice_registered_bureau` | `register-partner-invoice/index.ts:541` | bureau (`getBureauAdminEmail`) | Partner registreert factuur in partnerportaal (`InvoiceRegistrationDialog.tsx`, `PartnerFinance.tsx`) | | Inkoopfactuur geregistreerd |
| `partner_invoice_reminder_t1` | `check-pending-items/index.ts:1042` | partner | cron | Feitelijk **T+3** (`:1012-1013`): `executed_at` ≥3 dagen geleden, geen factuur, project vrijgegeven voor facturatie (`invoicingReleased`), geen bureau-item; 7-dagen dedupe | Vriendelijk verzoek factuur |
| `partner_invoice_reminder_t7` | `check-pending-items/index.ts:1113` | partner | cron | T+7, zelfde voorwaarden; plus todo `post_execution_invoice_check` | Herinnering factuur |
| `partner_missing_pdf_reminder` | `notify-partners-missing-invoice-pdf/index.ts:197` | partner | Admin-knop (`MissingPdfReminderButton.tsx`, mode `bulk`) of cron (mode `auto`) | In `auto`: partners die recent al herinnerd zijn worden overgeslagen (`:103-112`) | Ontbrekende factuur-pdf |

### Partnerbeheer / Chat / Bureau / Doorverwijzing / Systeem / overig

| email_type | Function | Ontvanger | Trigger | Condities | Inhoud |
|---|---|---|---|---|---|
| `partner_invitation` | `invite-partner/index.ts:187`, `resend-partner-invitation/index.ts:162`, `bulk-invite-partners/index.ts:149` | partner | Admin (`AdminPartnerDetail.tsx`, `BulkInviteDialog.tsx`) | Link via `auth.admin.generateLink` (eigen mail, geen Supabase-mail); bulk max 5/s | Uitnodiging portaal |
| `partner_intro_portal` | `send-partner-intro-email/index.ts:150,168` | partner | Admin — **geen UI-caller gevonden in `src/`** | | Introductie portaal |
| `partner_password_reset` | `send-partner-reset-email/index.ts:151` (self-service, `PartnerLogin.tsx`), `admin-reset-partner-password/index.ts:157` (admin) | partner | Partner vraagt reset / admin reset | `generateLink` (recovery) | Wachtwoordlink |
| `partner_mailing` | `send-partner-mailing/index.ts:172` | partner(s) | Admin bulkmailing (`SendPartnerMailingDialog.tsx`) | preview → `erwin@` (`:130`) | Vrije mailing (**niet in labelkaart**) |
| `chat_notification` | `notify-new-chat/index.ts:154` | bureau (hard `hallo@bureauvlieland.nl`, `:115`) | Bezoeker/klant/partner stuurt chatbericht (`chat-visitor-send:114,197`, `useChat.ts:243`, `useProjectChat.ts:151`, `whatsapp-webhook`) | Max 1 per conversatie per 5 min (`:46-56`) | Nieuw chatbericht |
| `chat_reply_notification` | `notify-new-chat-reply/index.ts:255` | bezoeker (of partner bij logies-chat, `:63-78`) | Admin antwoordt in chat (`useAdminChat.ts:282`) | Geen mail zonder adres; throttle 2 min tenzij nieuwer bericht (`:98-112`); Reply-To `reply+chat-<id>@reply.bureauvlieland.nl` | Chatantwoord |
| `admin_project_email` | `send-project-email/index.ts:200` | klant/partner (vrij) | Admin ad-hoc vanuit dossier (`SendProjectEmailSheet.tsx`) | | Vrije projectmail |
| `inbound_reply_to_customer` | `inbound-email/index.ts:311` (`notifyCustomer`, aangeroepen `:801`) | klant | Inbound webhook (Mailjet Parse): partner antwoordt op `reply+BV-…@reply.bureauvlieland.nl` | Alleen als project en klantmail gevonden | Antwoord partner doorgezet |
| `ticket_to_customer` | `send-ticket-email/index.ts:267` | klant | Admin (`SendTicketEmailDialog.tsx`) | | Tickets/boarding (**niet in labelkaart**) |
| `reference_case_approval` | `send-reference-approval/index.ts:127,148` | klant | Admin (`AdminReferenties.tsx`) | | Akkoord referentiepagina (**niet in labelkaart**) |
| `program_draft_link` | `save-program-draft/index.ts:175` | bezoeker | Exit-intent dialoog configurator (`ExitIntentDraftDialog.tsx`) | | Conceptlink (**niet in labelkaart**) |
| `customer_link_resend` | `resend-customer-link/index.ts:164,192` | klant | Self-service "stuur mijn link opnieuw" (`CheckoutContactForm.tsx`) | | Portaallink (**niet in labelkaart**) |
| `wedding_referral_customer` / `event_referral_customer` | `send-wedding-referral/index.ts:425,444` (`templateIdsFor`, `:61-65`) | klant/bruidspaar | Admin (`WeddingReferralDialog.tsx`) | Idempotency `wedding-referral-<email>-<partner>` | Doorverwijzing |
| `wedding_referral_partner` / `event_referral_partner` | `send-wedding-referral/index.ts:624,646` | partner | idem | idem | Doorverwijzing partner |
| `wedding_referral_claim_bureau` | `wedding-referral-claim/index.ts:230` | bureau (`GENERAL_CONTACT_EMAIL`) | Partner meldt "al bekend" via openbare link (`DoorverwijzingMelding.tsx`) | Idempotency; `checkSuppression:false`; link ≤5 werkdagen geldig | Melding + taak |
| `cron_watchdog_alert` | `cron-watchdog/index.ts:149` | bureau (`bureau_admin_email` → `ADMIN_ALERT_EMAIL` → `hallo@`, `:36-45`) | cron (dagelijks) of admin-knop (`ScheduledJobsCard.tsx`) | Alleen bij alarm; dedupe via bestaande `cron_watchdog_alert`-rij (`:118`) + todo `system_cron_failure` | Systeemwaarschuwing |
| `email_chain_probe` | `mailjet-webhook-status/index.ts:140` | bureau | Admin "probe" (`WebhookStatusCard.tsx`) | handmatig | Diagnostische proefmail (**niet in labelkaart**) |
| (origineel type) | `resend-email/index.ts:130` | origineel | Admin "opnieuw versturen" (`ResendEmailDialog.tsx`, `useResendEmail.ts`, `PartnerNotificationsCard.tsx`); `bulk-resend-unconfirmed` (geen UI-caller gevonden) | Directe `email_log`-insert met `email_type` van de bronrij, actor `admin → resend` | Herverzending |

## A.B Labelkaart-sleutels die door geen enkele code meer worden geproduceerd

Uit `src/lib/emailTypeLabels.ts`, niet gevonden als `email_type` in `supabase/functions`:

- Actieve sectie: `date_change_partner` (code logt `program_request_partner` met `template_name=date_change_partner`), `customer_date_change_bureau` (geen bureau-mail bij datumwijziging; wel todo `customer_date_change_partner_notify`), `accommodation_request_bureau` (bewust verwijderd, `send-accommodation-request:237`), `accommodation_people_change`, `internal_customer_cancellation` (klantannulering levert geen bureau-mail op), `proforma_invoice`, `partner_briefing_t3` (code gebruikt `partner_headsup_t3`).
- Sectie "oudere sleutels": `partner_quote_request`, `partner_reminder`, `partner_notification`, `partner_invite`, `customer_confirmation`, `customer_quote`, `customer_program`, `accommodation_quote_request`, `accommodation_selected`, `admin_notification`, `terms_request`, `project_email` — alle alleen legacy.

Omgekeerd ontbreken in de labelkaart (wel geproduceerd): `partner_headsup_t3`, `reminder_activity_pending`, `reminder_headcount_pending`, `customer_terms_reminder_t14/_t7/_t3`, `item_cancelled_partner`, `accommodation_headcount_confirmed_customer/_partner`, `accommodation_headcount_rejected_partner`, `lodging_quote_submitted_bureau`, `lodging_quote_revised_bureau`, `lodging_quote_declined_bureau`, `lodging_headcount_confirmed_bureau`, `commission_invoice_forward`, `commission_invoice_sent`, `partner_mailing`, `ticket_to_customer`, `reference_case_approval`, `program_draft_link`, `customer_link_resend`, `customer_review_google_reminder`, `email_chain_probe`. (`EmailTypes.REMINDER_ITEM_PENDING = "reminder_item_pending"` in `email-logger.ts:212` wordt nergens gebruikt.)

## A.C Mails buiten de logger / zonder `email_type`

| Function | Wat | Ontvanger | Trigger / conditie |
|---|---|---|---|
| `critical-selftest/index.ts:632` | `[ALERT] Kritieke zelftest` via `sendMailjet`, **niet gelogd** | `bureau_admin_email` → `ADMIN_ALERT_EMAIL` → `administratie@bureauvlieland.nl` (`:605-612`) | cron `45 5 * * *` of admin-knop; alleen bij gefaalde checks; "reeds gealert binnen 12 uur"-dedupe |
| `email-webhook-heartbeat/index.ts:155` | `[ALERT] Geen e-mail-terugkoppeling van Mailjet`, **niet gelogd** | `bureau_admin_email` → `ADMIN_ALERT_EMAIL` → `hallo@` | cron `15 6 * * *`; >24u geen webhook-events bij recente sends; maakt ook todo |
| `auto-close-monitor/index.ts:163` | Alert over auto-close-cron (missing/errors/stuck), **niet gelogd** | `bureau_admin_email` → `ADMIN_ALERT_EMAIL` → `administratie@` (`:46-56`) | cron / admin (`AdminEmailHealth.tsx`); 1 alert per run (`alerted_at`), dedupe-venster voor missing_run |
| `finalize-collective-invoice/index.ts:295-330` | Eigen `fetch` naar Mailjet + directe `email_log`-insert (niet via `logEmail`, dus zonder validatie) | boekhouding | Admin rondt verzamelfactuur af |
| `resend-email/index.ts:109-130` | Eigen fetch + directe `email_log`-insert | origineel adres | Admin resend |
| Supabase Auth | Geen auth-mails: alle partner-uitnodigingen/resets gebruiken `auth.admin.generateLink` en eigen Mailjet-template (`invite-partner:114`, `bulk-invite-partners:75`, `admin-reset-partner-password:94`, `send-partner-reset-email:76`); geen `resetPasswordForEmail`/`signInWithOtp`/`inviteUserByEmail` in `src/`. `config.toml` bevat geen SMTP-/confirmations-instelling. (Admin-login via Supabase Auth zou alleen standaard Supabase-mails kunnen sturen als dat in het dashboard aanstaat — niet uit de repo af te leiden.) |
| Sentry | Alleen frontend-foutrapportage (`src/lib/errorReporting.sentry.ts`); Sentry zelf mailt eventueel vanuit het Sentry-account, niet vanuit deze code. |
| WhatsApp | `whatsapp-send`, `send-participant-broadcast` (Twilio) — geen e-mail. |
| Mailjet-webhook | `mailjet-event-webhook` stuurt geen mail; maakt bij bounce/spam/blocked een Werkbank-taak (`noteUndeliverableEmail`, `:405`). |

## A.D Bureau-notificaties (naar admin) en gebruikte adres-helper

| Function | email_type | Adresbron |
|---|---|---|
| `send-program-request` | `program_request_bureau` | `getBureauAdminEmail()` (`app_settings.bureau_admin_email`) |
| `send-catering-request` | `catering_request_bureau` | `getBureauAdminEmail()` |
| `send-quote-request` | `quote_request_bureau` | `getBureauAdminEmail()` |
| `register-partner-invoice` | `partner_invoice_registered_bureau` | `getBureauAdminEmail()` |
| `update-customer-program` | `customer_counter_proposal_bureau` | hard-coded `hallo@bureauvlieland.nl` (`:1136`) |
| `notify-new-chat` | `chat_notification` | hard-coded `hallo@bureauvlieland.nl` (`:115`) |
| `_shared/lodging-bureau-alert.ts` (via `create-quote-review-todo`, `decline-accommodation-quote`, `confirm-accommodation-headcount`) | `lodging_quote_submitted_bureau`, `lodging_quote_revised_bureau`, `lodging_quote_declined_bureau`, `lodging_headcount_confirmed_bureau` | `GENERAL_CONTACT_EMAIL` uit `_shared/bureau-contact.ts` |
| `wedding-referral-claim` | `wedding_referral_claim_bureau` | `GENERAL_CONTACT_EMAIL` (`bureau-contact.ts`) |
| `cron-watchdog` | `cron_watchdog_alert` | `app_settings.bureau_admin_email` → `ADMIN_ALERT_EMAIL` → `hallo@` |
| `critical-selftest`, `email-webhook-heartbeat`, `auto-close-monitor` | (geen email_type) | `bureau_admin_email` → `ADMIN_ALERT_EMAIL` → `administratie@` / `hallo@` |
| `mailjet-webhook-status` | `email_chain_probe` | admin-adres (handmatig) |

`bureau-contact.ts` wordt alleen geïmporteerd door `lodging-bureau-alert.ts`, `wedding-referral-claim`, `mailjet-webhook-status` (en `PURCHASE_INVOICE_INBOX` elders). De drie "intake"-functies en de factuurregistratie gebruiken `getBureauAdminEmail()`; chat en tegenvoorstel gebruiken een hard-coded adres.

## A.E Partner reageert op een activiteit-onderdeel: wat gebeurt er precies?

Pad: partnerportaal `src/pages/PartnerProject.tsx:128` → `POST /functions/v1/update-partner-item-status` met `status ∈ {confirmed, unavailable, alternative, executed, acknowledge_price_change}` (`update-partner-item-status/index.ts:195`).

1. **Item-update + historie** (`:402-439`).
2. **Werkbank (admin_todos)** — dit is de enige bureau-notificatie:
   ```ts
   // :441-482
   if (status === "confirmed" || status === "unavailable" || status === "alternative") {
     await supabase.from("admin_todos").update({ status: "done", ... })
       .eq("auto_type", "partner_reminder").eq("auto_entity_id", itemId).neq("status", "done");
     ...
     if (!existingStatusTodo && !(confirmOnly && status === "confirmed")) {
       await supabase.from("admin_todos").insert({
         title: `Partner ${partner.name} reageert op "${item.block_name}" — ${statusLabel}`,
         priority: status === "unavailable" ? "high" : "normal",
         auto_type: "partner_status_update", auto_entity_id: itemId, ...
   ```
   Daarnaast, als alle items bevestigd zijn en voorwaarden niet getekend: todo `terms_reminder` (`:621-662`); als alle partners gereageerd hebben én bureau-items geprijsd: todo `all_partners_responded` (prio high, `:664-723`).
3. **E-mail naar de klant**:
   - `counter_proposal_response` als het item in `counter_proposed` stond (`:485-619`).
   - `status_confirmed` / `status_alternative` / `status_unavailable` (`:726-818`), behalve `confirmed` op een bevestiging-onderdeel zonder offerte (`skipCustomerEmail`, `:729`).
4. **E-mail naar het bureau: geen.** In `update-partner-item-status` is er geen Mailjet-bericht aan een bureau-adres (het enige `hallo@bureauvlieland.nl` is de `From`, `:62`). Ook geen aanroep van `lodging-bureau-alert` of een vergelijkbare helper. De admin ziet de reactie dus uitsluitend via de Werkbank-taak `partner_status_update` (en de `all_partners_responded`-taak), plus de `program_request_history`-regel. Bij `executed` en `acknowledge_price_change` wordt zelfs geen todo gemaakt (`:442`).

Verwante functies:
- `override-item-status/index.ts` (admin forceert `confirmed`): alleen DB-update, historie en `admin_activity_log` (`:86-123`). **Geen enkele e-mail.**
- `approve-quote-item/index.ts` (klant keurt item goed): mails alleen naar de partner (`program_request_partner`, `:367` bij re-approval na partnerreactie, `:489/511` bij eerste verzending; of indirect via `send-items-to-partners`, `:276-290`). Geen bureau-mail, geen todo voor het bureau (alleen `quote_status → akkoord_ontvangen` als alles is goedgekeurd, `:401-411`).
- `accept-quote-proposal/index.ts` (klant accepteert hele voorstel): klantmail `quote_accepted_customer` (`:446`) + todo `send_items_to_partners` (`:491-508`); admin-pad verstuurt `program_request_partner` naar partners (`:596-627`) en maakt `bureau_item_pricing`-todos (`:661-692`). Geen bureau-mail.
- DB-triggers: er is geen trigger die bij een item-statuswijziging een todo of mail aanmaakt (migraties met `admin_todos`-inserts betreffen partnerafspraken, partnersluiting, commissie, zelftest — niet `program_request_items.status`); er is ook geen `net.http_post` buiten de cron-jobs.

Conclusie: een partnerreactie (bevestigen/afwijzen/alternatief) levert het bureau **alleen een Werkbank-taak** op, nooit een e-mail; de klant krijgt wél direct een statusmail (behalve bij "alleen bevestigen"-onderdelen).

# Deel B — Overige kanalen


Alle paden relatief aan `/home/user/bureauvlieland`. E-mailnotificaties (email_log / email_type) zijn bewust buiten beschouwing gelaten; waar een functie óók mailt staat dat alleen als context.

## B.0. Samenvatting kanalen

| Kanaal | Bestaat? | Voor wie | Bron |
|---|---|---|---|
| `admin_todos` (Werkbank-taken) | Ja, hoofdkanaal | Admin (Erwin) | DB-tabel, gevuld door ~30 edge functions, 8 DB-triggers, 3 frontend-modules |
| Zijbalk-badges + "Te beantwoorden"-bel | Ja | Admin | `src/components/admin/AdminLayout.tsx`, `InboxBell.tsx`, `src/lib/openConversations.ts` |
| Partnerportaal: Werkbank-kop, banners, "Nieuw"-pill, chat-badge | Ja (afgeleid, geen notificatietabel) | Partners | `src/lib/partnerWerkbank.ts`, `PartnerDashboard.tsx`, `ChatWidget.tsx` |
| Klantportaal: tab-badges, chat-badge | Ja (afgeleid) | Klanten | `src/pages/CustomerProgram.tsx`, `ChatWidget.tsx` |
| WhatsApp (Twilio) | Ja, alleen handmatig door admin | Klanten/partners/deelnemers | `whatsapp-send`, `send-participant-broadcast`, inbound via `whatsapp-webhook` |
| Browser-push / Web Push / geluid / favicon-badge | **Nee** | — | geen `Notification(`, `serviceWorker`, `PushManager`, `new Audio(` in `src/` |
| SMS | **Nee** (alleen WhatsApp via Twilio) | — | — |
| Slack / Discord / Telegram | **Nee** | — | geen treffers in `src/` en `supabase/functions/` |
| Sentry | Ja, alleen foutrapportage frontend (geen notificaties naar gebruikers) | Ontwikkelaar | `src/lib/errorReporting*.ts`, `docs/foutrapportage.md` |
| Cron-watchdog / zelftest / heartbeat | Ja → admin_todo + e-mail | Admin | `cron-watchdog`, `critical-selftest`, `email-webhook-heartbeat`, `auto-close-monitor` |
| Notificatie-instellingen aan/uit | Beperkt: alleen admin via `app_settings`; partners en klanten hebben géén voorkeuren | Admin | `src/pages/admin/AdminSettings.tsx` |

---

## B.1. admin_todos (Werkbank)

### 1.1 Tabeldefinitie

| Migratie | Wijziging |
|---|---|
| `supabase/migrations/20260124145658_d83ae8e4-a6d3-46da-a4cf-7bf6265053e4.sql:73-88` | `CREATE TABLE admin_todos` (id, title, description, priority ∈ low/normal/high/urgent, status ∈ todo/in_progress/done, due_date, related_request_id FK program_requests ON DELETE SET NULL, related_partner_id, created_by, assigned_to, created_at, updated_at, completed_at). RLS: alleen admins (`is_admin`). |
| `20260126084247_f6b3f494-…sql:2-3` | `auto_type text`, `auto_entity_id text` + indexen; comment noemt oorspronkelijke 4 types |
| `20260309182704_58d04ede-…sql:1` | `snoozed_until date` |
| `20260512105627_f3307031-…sql:1-2` | status-check uitgebreid met `dismissed` → toegestaan: **todo, in_progress, done, dismissed** |
| `20260708203234_fbf5ffcb-…sql:3-4` | `completion_reason text` (bv. `auto_past_execution`) |

Dedupe-conventie overal: één open rij per (`auto_type`, `auto_entity_id`), gecontroleerd vóór insert.

### 1.2 Alle auto_types: waar aangemaakt, trigger, prioriteit, afsluiting, status

Legenda status: **actief** = in gebruik; **legacy** = alleen nog in reconcile/clusterkaart, geen aanmaakpad meer; **?** = onzeker.

| auto_type | Aangemaakt in (file:line) | Trigger | Prio | Auto-afsluiten | Status |
|---|---|---|---|---|---|
| `new_program_request` | DB-trigger `trg_create_todo_for_new_program_request` AFTER INSERT ON program_requests — `20260527142239_…sql:39-45`, herzien in `20261026120000_zelftest-taken-opruimen.sql:25-71` (slaat ZELFTEST-aanvragen over) | Elke nieuwe programma-aanvraag | normal | reconcile `case "new_program_request"` (`reconcile-admin-todos/index.ts:425-437`); auto-close-past-execution | actief |
| `new_request_received` | `supabase/functions/send-program-request/index.ts:350-356` | Klant verstuurt aanvraag via wizard (`send-program-request`) | high | reconcile :425; auto-close-past-execution | actief (overlapt met `new_program_request`: twee taken voor dezelfde aanvraag mogelijk — niet verder onderzocht) |
| `new_accommodation_request` | DB-trigger `trg_create_todo_for_new_accommodation_request` AFTER INSERT ON accommodation_requests — `20260423202658_…sql:35-47` | Elke nieuwe logiesaanvraag | normal | reconcile (project gewist/geannuleerd); auto-close-past-execution | actief |
| `partner_reminder` | `check-pending-items/index.ts:292-303` (CHECK 1) | Partner-item `pending` ouder dan 3 dagen (`DEFAULT_REMINDER_DAYS_PARTNER_ACTIVITY`, :26), niet gesnoozed/hot; stuurt tevens herinneringsmail als `reminder_email_enabled` | high als >7 dagen, anders normal | `update-partner-item-status/index.ts:448-451` zodra partner reageert; reconcile :493; cooldown-sweep (:523) | actief |
| `quote_pending_partner` | `check-pending-items/index.ts:400-411` (CHECK 2) | Logiesofferte `pending` ouder dan `reminder_days_partner_quote` (default 5) | high als >2× termijn | `notify-accommodation-quote:316-317`, `decline-accommodation-quote:171-172`, `withdraw-accommodation-quote:153-155`, reconcile :366 | actief |
| `quote_headcount_pending_partner` | `check-pending-items/index.ts:530-539` (CHECK 2b) | Gekozen logies, nieuw gastenaantal nog niet bevestigd door partner na `reminder_days_partner_quote` dagen (voorwaarden :500-534) | high als >2× termijn | `confirm-accommodation-headcount:215-216`, `approve-accommodation-headcount:238-239` | actief |
| `quote_pending_customer` | `check-pending-items/index.ts:637-646` (CHECK 3) | Doorgestuurde logiesofferte, klant kiest niet binnen `reminder_days_customer_quote` (7) | normal | `select-accommodation-quote:338-340`; reconcile :401; cooldown-sweep | actief |
| `request_no_response` | `check-pending-items/index.ts:721-730` (CHECK 4) | Programma `active`/`in_progress`, `updated_at` ouder dan `reminder_days_customer_request` (14), niet verlopen | high als >2× | reconcile :412; auto-close-past-execution | actief |
| `quote_expired_partner` | `check-pending-items/index.ts:884-894` (CHECK 5); ook frontend `src/components/partner-portal/PartnerAccommodationQuoteSheet.tsx:443-450` (partner verlengt geldigheid → "Offerte verlengd") | Logiesofferte `valid_until` verstreken | normal | reconcile :366; hard type (altijd zichtbaar in cooldown) | actief |
| `post_execution_feedback` | `check-pending-items/index.ts:995-1004` | 1 dag na `executed_at` van een item (:977-980) | low | reconcile (project afgerond); handmatig | actief |
| `post_execution_invoice_check` | `check-pending-items/index.ts:1075-1084` | 7 dagen na `executed_at`, geen inkoopfactuur (:1058) | high als partnerfacturatie niet vrijgegeven, anders normal | reconcile :280-296 (bureau_invoice aanwezig of fully_invoiced) | actief |
| `customer_aftersales` | `check-pending-items/index.ts:1193-1201` | N dagen (`customer_aftersales_days_after`, default 3) na uitvoering; als `customer_aftersales_auto_send` aan staat wordt de mail direct verzonden i.p.v. taak (:1170) | low | `send-customer-aftersales:188-189` | actief |
| `quote_expiring_soon` | `check-pending-items/index.ts:1386-1394` (CHECK 9) | `quote_status=offerte_verstuurd`, `quote_valid_until` binnen 3 dagen | high | reconcile :376-388 | actief |
| `quote_expired` | `check-pending-items/index.ts:1446-1454` (CHECK 9b) | Offerte verlopen zonder klantakkoord | high | reconcile :389-400 (akkoord of geldigheid verlengd) | actief |
| `customer_status_email_due` | `check-pending-items/index.ts:1563-1571` (CHECK 10) | Offerte verstuurd > `customer_status_email_pending_days` (5) zonder klantcontact | high als >2× | `cleanup-stale-todos:318-360, 476-507`; cooldown-sweep; escalatie naar high na 2× termijn (`cleanup-stale-todos:513-535`) | actief |
| `customer_status_update_due` | `check-pending-items/index.ts:1646-1654` (CHECK 11) | Klantakkoord binnen maar > `customer_status_email_stale_days` (5) geen uitgaande mail | normal | `cleanup-stale-todos:366-403` (uitgaande mail na aanmaak) | actief |
| `customer_inputs_missing` | `check-pending-items/index.ts:1733-1742` (CHECK 12) | T-`customer_inputs_warning_days` (14) tot event; voorwaarden/facturatie/logies ontbreekt | high als ≤7 dagen | reconcile :438-451; `cleanup-stale-todos:409-470` | actief |
| `terms_reminder` | `check-pending-items/index.ts:1833-1844` (CHECK 13, "bel de klant" vanaf T-3, update van bestaande taak :1833); `update-partner-item-status/index.ts:649-655` (alle partners bevestigd, voorwaarden niet getekend) | Klant heeft voorwaarden niet getekend | high (CHECK 13) / normal | `accept-quote-proposal:378-379`, `set-project-ready-for-invoice:118-121`, `update-customer-program:1333-1336` | actief |
| `lodging_board_missing` | `check-pending-items/index.ts:1924-1932` | Gekozen logiesofferte zonder `board_type` (:1872-1899) | normal | reconcile :452-474 | actief |
| `stale_pending_change` | DB-functie `scan_stale_pending_changes()` — `20260524120334_…sql:73-85`, cron `scan-stale-pending-changes` 07:00 UTC (:97-101) | Item met ongepubliceerde wijziging > 7 dagen | normal | reconcile :480; auto-close-past-execution | actief |
| `send_items_to_partners` | `src/lib/sendItemsTodo.ts:76-84` (`ensureSendItemsTodo`, aangeroepen uit `AdminRequestDetail.tsx:979`); `accept-quote-proposal/index.ts:499-505`; `cleanup-stale-todos/index.ts:275-281` (backfill) | Onderdelen klaar om naar partners te sturen; klantakkoord ontvangen | high bij akkoord, anders normal | `sendItemsTodo.ts:52-57, 91-98`; `send-items-to-partners:537-539`; `cleanup-stale-todos:190-226` | actief |
| `bureau_item_pricing` | `src/components/admin/AdminAddActivitySheet.tsx:238-243`; `accept-quote-proposal:683-689`; `send-items-to-partners:521-527`; `backfill-all-responded-todos:94-100` | Bureau-onderdeel zonder prijs | normal | `AdminEditActivitySheet.tsx:40` (`resolveAutoTodo`), `AdminRequestDetail.tsx:1522` | actief |
| `all_partners_responded` | `update-partner-item-status/index.ts:710-716`; `backfill-all-responded-todos:131-137` | Alle partners gereageerd én alle bureau-items geprijsd (:688-709) | high | reconcile :506-511 (7 dagen na aanmaak, informatief) | actief |
| `partner_status_update` | `update-partner-item-status/index.ts:470-477`; `update-customer-program/index.ts:846-850` ("Klant akkoord op …"), `:979-983` ("Klant annuleert …") | Partner bevestigt/afwijst/alternatief; klant keurt onderdeel goed of annuleert | high bij `unavailable`/annulering, anders normal | reconcile :493-505 | actief |
| `quote_ready_to_send` | `update-customer-program/index.ts:868-872` | Alle niet-geannuleerde onderdelen `accepted` (:856-868) | high | `send-quote-offer:306-308`; `cleanup-stale-todos:163-184` | actief |
| `customer_counter_proposal` | `update-customer-program/index.ts:1168-1175` | Klant stelt andere tijd voor | normal | handmatig/reconcile (referral) | actief |
| `customer_date_change_partner_notify` | `update-customer-program/index.ts:564-575` | Klant wijzigt datum; blijft altijd staan voor bureau-onderdelen/niet-verzonden partnermails (:553-563) | high | auto-close-past-execution; reconcile (project) | actief |
| `people_change_notify_failed` | `update-customer-program/index.ts:399-405` | Partnernotificatie bij aantalwijziging FAALDE (:384-398) | high | handmatig | actief |
| `customer_practical_info_updated` | `update-customer-program/index.ts:695-700` via `upsertOpenTodo` (:152-172) | Klant werkt praktische info bij | normal | handmatig | actief |
| `customer_accommodation_setup_changed` | `update-customer-program/index.ts:763-768` | Klant wijzigt kamers/verzorging | high als er open offertes zijn | handmatig | actief |
| `invoicing_ready` | `update-customer-program/index.ts:1365-1375` (tekenen voorwaarden, event voorbij); `set-project-ready-for-invoice/index.ts:137-148` | Project klaar voor facturatie; `snoozed_until` = dag na event (`computeInvoicingSnooze`) | normal | reconcile :360-365; `set-project-completion:118-123` | actief |
| `book_ferry_tickets` | `send-items-to-partners/index.ts:339-348` | Bureau-overtocht-item verzonden; gesnoozed tot 21 dagen vóór aankomst (:322-331); backfill `20260702140522_…sql` | normal | reconcile :475 | actief |
| `quote_review` | `create-quote-review-todo/index.ts:126-133` (aangeroepen uit `src/pages/PartnerAccommodation.tsx:295`) | Partner dient logiesofferte in via portaal | normal | `select-accommodation-quote:338-340`, `withdraw-accommodation-quote:153-155`, `cleanup-stale-todos:109-130` | actief |
| `forward_accommodation_quote` | `notify-accommodation-quote/index.ts:323-327` (admin-actie in `AdminAccommodationDetail.tsx:347`) | Nieuwe logiesofferte van partner, door te sturen | high | `select-accommodation-quote:338-340`; `cleanup-stale-todos:136-157`; `withdraw-accommodation-quote` | actief |
| `quote_headcount_review` | `confirm-accommodation-headcount/index.ts:199-206` (update als bestaand :196) | Partner bevestigt nieuw gastenaantal | normal | `approve-accommodation-headcount:238-239, 389-390` | actief |
| `accommodation_quote_declined` / `accommodation_alternative_dates` | `decline-accommodation-quote/index.ts:195-220` | Partner wijst logiesaanvraag af / stelt andere datums voor | high | handmatig; reconcile (referral) | actief |
| `accommodation_selected` | `select-accommodation-quote/index.ts:346-355` | Klant kiest logies — **direct `status: "done"`** (logregel, geen open taak) | low | n.v.t. | actief (informatief) |
| `commission_pending` | `register-partner-invoice/index.ts:444-451` | Partner registreert inkoopfactuur met commissie > 0 (:442-443) | normal | `dismiss-partner-invoice-item:144-146, 216-218`; reconcile :309 | actief |
| `purchase_invoice_pending` | `register-partner-invoice/index.ts:459-466` | Inkoopfactuur bij `invoicing_mode=bureau_central` en niet door klant betaald (:458) | normal | reconcile :297-308 | actief |
| `purchase_invoice_inbox` | `inbound-purchase-invoice/index.ts:290-295` | Inkomende e-mail met factuur-pdf in inkoop-inbox | normal | reconcile :297-308 | actief |
| `sales_inbox` | `inbound-email/index.ts:509-514` (sales-route) en `:674-682` ("Onbekend mailadres", niet-routeerbare ontvanger) | Inkomende mail naar sales/leads of onbekende route | normal | handmatig (hard type: nooit gedempt) | actief |
| `commission_missing_invoice` / `commission_unlinked_invoice` | `flag-missing-partner-invoices/index.ts:70-77, 156` (batch-insert) | Uitgevoerd onderdeel zonder inkoopfactuur na `commission_missing_invoice_days` (14) / factuur zonder koppeling na `commission_unlinked_invoice_days` (7) | high als commissie-risico ≥ €250, anders normal | reconcile :318-359; `set-commission-exempt:112-117` (→ dismissed) | actief |
| `commission_invoice_lost` | DB-functie `sync_item_invoice_fields` — `20261003120000_commissie-fase1-trigger-en-guard.sql:56-73` | Gefactureerd/betaald onderdeel verliest inkoopfactuur | normal | handmatig | actief |
| `partner_post_charge` | DB-trigger `trg_partner_post_charge_create_todo` — `20260603112039_…sql:127-135` | Partner voegt nacalculatie toe | normal | trigger `trg_partner_post_charge_close_todo` bij processed/rejected (:146-167) | actief |
| `availability_conflict` | `src/lib/conflictChecker.ts:143-151, 220-228` (`createAutoTodo`); DB-trigger `trg_partner_closure_check_requests` ON partner_unavailability — `20260916120000_…sql:87-106` | Partner sluit periode die lopende aanvragen raakt | high | DB-trigger `trg_partner_closure_withdrawn_close_todos` — `20260918100000_…sql:54-133` (alleen status `todo`, niet toegewezen) | actief |
| `partner_agreement_accepted` | DB-trigger `trg_partner_agreement_acceptances_after_insert` — `20260929130000_partnerafspraken.sql:181-211` | Partner klikt akkoord op afspraak | low | handmatig | actief |
| `wedding_referral_claim` | `wedding-referral-claim/index.ts:336-349` | Partner meldt "bruidspaar was al bekend" | normal | handmatig | actief |
| `customer_review_low` | `customer-review/index.ts:191-197` | Beoordeling ≤ 3 (`isLowRating`, :49) | high | handmatig | actief |
| `reference_case_approved` / `reference_case_feedback` | `reference-case/index.ts:187-193, 213-219` | Klant keurt referentiepagina goed / wil anders | normal / high | handmatig | actief |
| `email_undeliverable` | `_shared/undeliverable.ts:93-99` via `noteUndeliverableEmail`, aangeroepen uit `_shared/mailjet-send.ts:285, 388` (suppressielijst/geblokkeerd) en `mailjet-event-webhook/index.ts:405` (bounce/spam/blocked) | Mail kan niet bezorgd worden; één taak per e-mailadres, bijgewerkt bij herhaling | high | handmatig | actief |
| `email_webhook_silent` | `email-webhook-heartbeat/index.ts:127-134` | Dagelijks: mails verstuurd maar geen Mailjet-events in 24u, of webhook misconfigured (:105-107); entity-id bevat datum → kan per dag een nieuwe taak geven | high | handmatig | actief |
| `critical_selftest_failure` | `critical-selftest/index.ts:676-682` via `_shared/selftestTodo.ts` (vaste sleutel `critical-selftest`; update bij bestaande open taak :670-674; `dismissed` met zelfde titel → skip) | Dagelijkse zelftest faalt | high | `critical-selftest:685-694` zodra zelftest weer slaagt (`completion_reason: "Zelftest slaagt weer"`) | actief |
| `system_cron_failure` | `cron-watchdog/index.ts:101-108` | Cron-taak nooit gedraaid / stil / HTTP-fout (`logic.ts:judge`) | high | handmatig | **bug**: insert gebruikt `status: "open"`, wat de CHECK-constraint (todo/in_progress/done/dismissed, `20260512105627`) schendt → de insert faalt stil (geen foutafhandeling); alleen de e-mail komt aan. |
| `inbound_email` | niet meer aangemaakt — afgeschaft in `20261027120000_berichtencentrum-todo-afschaffen.sql` | — | — | legacy (openstaande rijen eenmalig gesloten) |
| `customer_cancellation`, `commission_ready_to_invoice`, `accommodation_commission_ready`, `invoicing_due`, `post_execution_invoicing` | geen aanmaakpad gevonden; komen alleen voor in reconcile/clusterkaart/`FinanceTodoList.tsx:32-38` | — | — | legacy |
| Handmatige taken (`auto_type` null) | `src/pages/admin/AdminTodos.tsx:505` | Admin maakt zelf | gekozen | handmatig | actief (route `/admin/todos-legacy`) |

### 1.3 Lifecycle-/opruimprocessen

| Proces | Waar | Trigger | Wat |
|---|---|---|---|
| `reconcile-admin-todos` | `supabase/functions/reconcile-admin-todos/index.ts` | Frontend: `src/pages/admin/AdminWerkbank.tsx:258-265` bij openen Werkbank en elke 5 min; knop (:307); géén cron gevonden in repo | Sluit taken waarvan de aanleiding weg is (per type, :257-521), cooldown-sweep voor `REMINDER_TYPES_GUARDED_BY_COOLDOWN` (`_shared/project-activity.ts:80-90`), snooze-sweep, referral-sweep (`REFERRAL_PAUSED_AUTO_TYPES`, :100-…), wezen van verwijderde projecten (`_shared/todoRequestLink.ts`), en roept daarna **check-pending-items** aan (:616). |
| `check-pending-items` | `supabase/functions/check-pending-items/index.ts` | Via reconcile (dus feitelijk elke 5 min terwijl Werkbank open is); aparte cron niet in repo gevonden (docs/deployen.md:241 noemt hem wel als cron-functie) | Maakt bovenstaande reminder-taken en stuurt herinneringsmails; slaat gesnoozede (:49-53), doorverwezen (:58-62) en "hot" (contact ≤2 d, :68-80) projecten over. |
| `cleanup-stale-todos` | `supabase/functions/cleanup-stale-todos/index.ts` | Handmatig: knop in `AdminTodos.tsx:745` | Sluit taken voor geannuleerde/afgeronde projecten, verouderde types, dedupe (:541-566), escalatie prio (:513-535), backfill send_items (:232-281). |
| `auto-close-past-execution` | `supabase/functions/auto-close-past-execution/index.ts:39-54, 304-324` | Cron (niet in repo; genoemd in docs/deployen.md:212) | Sluit `PRE_EXECUTION_TODO_TYPES` met `completion_reason: auto_past_execution` zodra event voorbij is. |
| `auto-close-monitor` | `supabase/functions/auto-close-monitor/index.ts` | Cron + knop `AdminEmailHealth.tsx:1159` | Bewaakt auto-close-past-execution; **alleen e-mail**, geen todo. |
| Werkbank-acties | `src/hooks/useInboxTodoActions.ts:15-90` | Admin | done / dismissed / snooze (7 dagen, `SNOOZE_DAYS`) / delete / heropenen. |

### 1.4 Hoe de Werkbank taken toont

- Route `/admin/werkbank` → `src/pages/admin/AdminWerkbank.tsx`; tabs **Inbox / Projecten / Financieel** (:291-300). `/admin/todos` redirect naar werkbank; oude lijst op `/admin/todos-legacy` (`src/App.tsx:300-301`) met filters status/prio/tijd, snooze-presets, bulkacties (`AdminTodos.tsx:331-760`), plus tabs E-maillog en Activiteitenlog.
- Inbox-opbouw: `src/lib/getInbox.ts` (ophalen) + `src/lib/inboxAssemble.ts` (zuiver). Eén rij per dossier met todo's eronder; losse taken met gelijke `auto_type`+titel samengevouwen (:1-18). Score per rij: prio-gewicht, due_date verstreken +15, open gesprek +score, communicatiestatus `stilte` +30 / `bij_bureau` +12 (:100-148). Demping: bij contact ≤2 d ("hot") of ≤7 d ("warm") worden normal/low-reminders verborgen, behalve harde types en verstreken due_date (`src/lib/projectActivity.ts:154-186`). Clusters per type (`CLUSTER_MAP`, :58-106): next_action_bureau / awaiting_partner / awaiting_customer / post_execution / inbound / other. Systeemtaken: `SYSTEM_AUTO_TYPES = {critical_selftest_failure}` (`inboxAssemble.ts:92`).
- Financieel-tab: `src/components/admin/werkbank/FinanceTodoList.tsx:32-38` toont open taken van `commission_missing_invoice`, `commission_unlinked_invoice`, `purchase_invoice_pending`, `invoicing_due`, `post_execution_invoicing` voor afgeronde/geannuleerde projecten.
- Verouderingskleur: `todo_age_thresholds` (amber 3 d / rood 7 d, per type instelbaar) via `src/lib/appSettings.ts:45-48, 86-97` en `TodoThresholdsEditor` in `AdminSettings.tsx:124`.

### 1.5 Badge / bel / geluid / push voor de admin

| Element | Bron | Telt | Verversing |
|---|---|---|---|
| Zijbalk "Werkbank" badge | `AdminLayout.tsx:139, 153` ← `useWerkbankInboxCount` (`src/hooks/useWerkbankInboxCount.ts`) | aantal inbox-rijen (niet gesnoozed) | 60 s |
| `useOpenTodoCount` (`AdminLayout.tsx:76-90`) | open todo's (todo/in_progress, niet gesnoozed) | wordt berekend maar **niet** als badge gebruikt in de nav-items (alleen `todoCount` variabele :138) | 60 s |
| "Berichtencentrum" badge + bel "Te beantwoorden" | `AdminLayout.tsx:145-146, 164`; `src/components/admin/InboxBell.tsx` | `openConversations.counts.total` (zie §6) | 60 s + realtime |
| Overige badges | `AdminLayout.tsx:155-188` | Sales Inbox, Tickets, Facturatie, Inkoop-inbox, Bankafschriften | 60 s |
| Geluid / browser-notificatie / favicon-badge / service worker | — | **niet aanwezig** (grep `new Notification(`, `new Audio(`, `serviceWorker`, `PushManager`, `document.title =` in `src/` leeg) | — |

---

## B.2. Partnerportaal in-app

Er is **geen** `partner_notifications`-tabel (grep migraties: geen `CREATE TABLE … notif`). `src/components/admin/PartnerNotificationsCard.tsx` is een **admin**-component die de e-maillog per project/partner toont — geen partnerkanaal. Alles wat een partner als "nieuw"/"aandacht" ziet wordt afgeleid uit de dashboarddata:

| Signaal | Waar | Regel / trigger |
|---|---|---|
| Werkbank-kop (één zin, `Notice` warning/info) | `src/pages/PartnerDashboard.tsx:36-45` ← `werkbankHeadline(summarizeWerkbank(buildWerkbankRows()))` in `src/lib/partnerWerkbank.ts:31-125` | Vier groepen: **review** (item `pending`/`alternative`, `counter_proposed`, logiesaanvraag `pending`), **changes** (bureau wijzigde prijs/aantal, `hasOpenAdminPriceChange`), **schedule** (bevestigd+klantakkoord+voorwaarden getekend maar geen tijd), **invoice** (`canPartnerInvoiceItem`, logies `selected` zonder factuurnummer). Koppen: "N aanvragen wachten op uw reactie" etc. |
| Banners boven werkbank | `PartnerDashboard.tsx:24-33` | `MissingPdfBanner` (facturen zonder pdf, `src/lib/partnerPortalView.ts:63-65`), `PartnerCompletenessBanner` (profielvolledigheid), `PartnerAgreementsBanner` (open afspraken zonder akkoord, `PartnerAgreementsBanner.tsx:16-21`) |
| "Nieuw"-pill op logiesaanvraag | `src/components/partner-portal/PartnerAccommodationRequestCard.tsx:122, 145` | Geen offerte ingediend én aanvraag < 24 uur oud |
| Zichtbaarheid van onderdelen | `supabase/functions/_shared/partnerDashboardItems.ts:59-…` (`isPartnerDashboardItemVisible`) | Lopende statussen altijd; gefactureerd altijd; geannuleerd 12 mnd; overig 3 mnd |
| Verloop (projectlog) | `supabase/functions/_shared/partnerProjectLog.ts` + `get-partner-project-log` | Filter op `program_request_history`: eigen item-acties (`PARTNER_ITEM_ACTIONS`, :17-37) en projectbrede acties (`PARTNER_PROJECT_ACTIONS`, :39-50). Geen "ongelezen"-markering. |
| "Sinds laatste bezoek" | `supabase/functions/get-partner-dashboard/index.ts:48-85, 652-653` (`partners.last_dashboard_seen_at`, migratie `20260524120334_…sql:145-160`) | Server berekent `changesSinceLastSeen` uit `program_change_log` en zet `last_dashboard_seen_at`; **frontend gebruikt het veld nergens** (grep `changesSinceLastSeen|previousLastSeenAt` in `src/` leeg) → dode code. |
| Chat-badge | `src/components/chat/ChatWidget.tsx:85-87, 105-108`, gemount in `PartnerLayout.tsx:270-276` (`source="partner_portal"`) | Aantal admin-berichten zonder `read_at`; realtime via `chat_messages`-channel (`src/hooks/useChat.ts:144-163`) |
| Nav-badges in partnerportaal | — | Niet gevonden (`PartnerLayout.tsx` heeft geen badge/count) |
| Partner heeft notificatie-instellingen | — | **Nee** (`src/pages/PartnerSettings.tsx` bevat geen notificatie/e-mailvoorkeur) |

Trigger-mechanisme: alles wordt bij elke dashboard-load (`get-partner-dashboard`) herberekend; er wordt niets opgeslagen als "nieuw" behalve `last_dashboard_seen_at`.

---

## B.3. Klantportaal in-app

| Signaal | Waar | Regel |
|---|---|---|
| Tab-badges in `ProgramNavigation` | `src/pages/CustomerProgram.tsx:552-599` ← `getCustomerPortalStatus` (`src/lib/customerPortalStatus.ts`) | **Logies**: "Nieuw" (warning) als er een `submitted` offerte is en nog geen `selected`; "✓" als gekozen. **Programma**: "N goed te keuren" (warning) = `customerActionsCount`; "Uitgevoerd" na afloop. **Praktisch**: "Aanvullen" als gastgegevens onvolledig. **Akkoord**: "Aan zet" als getekend kan worden / alles bevestigd; "✓" na tekenen. |
| Stepper (volgende stap) | `src/lib/customerPortalSteps.ts` | Drie stappen Logies/Programma/Akkoord, afgeleid uit dezelfde status |
| Chat-badge | `ChatWidget.tsx:85-108`, gemount `CustomerProgram.tsx:726` (`source="customer_portal"`) | Admin-berichten zonder `read_at`; klantportaal pollt `chat-visitor-thread` elke 5 s (`useChat.ts:94-102`); toont ook of admin online is (`isAdminOnline`, `chat_admin_presence`) |
| Ongelezen-markering e-mail/berichten | — | Niet aanwezig; `get-customer-program/index.ts` bevat geen unread/seen-logica (grep leeg) |
| Klant notificatie-instellingen | — | **Nee** |

---

## B.4. WhatsApp (Twilio)

| Functie | Richting | Wie / wanneer | Voorwaarden |
|---|---|---|---|
| `supabase/functions/whatsapp-send/index.ts` | Uit | **Alleen handmatig door admin**: antwoord in bestaand WhatsApp-gesprek (`useAdminChat.ts:249-262` als `conv.source === "whatsapp"`) of nieuw gesprek per telefoonnummer (`src/components/admin/SendWhatsAppDialog.tsx:33`). Slaat bericht op als `chat_messages` (sender_type admin) | Env `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID/SECRET`, `TWILIO_WHATSAPP_NUMBER` (:173-177). Foutcodes 63016 (24-uursvenster verlopen) en 20003 (sender geblokkeerd) worden vertaald (:200-219). Geen templates → vrije tekst alleen binnen 24u-venster. |
| `supabase/functions/send-participant-broadcast/index.ts` | Uit | Admin stuurt update naar alle `program_participants` van een programma (`SendParticipantsBroadcastDialog.tsx:34`) | Zelfde Twilio-koppeling; per-ontvanger foutafhandeling |
| `supabase/functions/whatsapp-webhook/index.ts` | In | Twilio POST; valideert `X-Twilio-Signature` (:46-100, overgeslagen als geen `TWILIO_AUTH_TOKEN`), maakt/vindt `whatsapp_contact`, koppelt partner op `partners.phone` (:127-131) of laatste open `program_request` op `customer_phone` (:134-138), slaat op als `chat_messages`, roept `notify-new-chat` aan (:242-259) | Idempotent op `twilio_message_sid` |
| `notify-new-chat` | — (e-mail naar bureau) | Aangeroepen door `chat-visitor-send:114, 197`, `whatsapp-webhook:245`, `useChat.ts:243`, `useProjectChat.ts:151` (partner schrijft in projectchat), `useAccommodationChat.ts:152` | Dedupe op recente `chat_notification` in email_log (:46-50). Valt onder e-mailinventaris. |
| `notify-new-chat-reply` | — (e-mail naar bezoeker/partner) | `useAdminChat.ts:282`, `ProjectChatSheet.tsx:180`, `useAccommodationChat.ts:152` | Throttle 2 min via `chat_conversations.last_email_notified_at` (migratie `20260310150052`). E-mail. |
| `whatsapp-diagnostics` | — | Admin-diagnose van Twilio-webhookconfig | Leest alleen |

Er is **geen automatische** WhatsApp-notificatie (geen cron, geen trigger stuurt WhatsApp). Instellingen voor WhatsApp staan niet in `app_settings`; alles via env-secrets.

---

## B.5. Browser push / SMS / Slack / Sentry / watchdog

| Kanaal | Bevinding |
|---|---|
| Web Push / `Notification` API / service worker | Niet aanwezig. `public/manifest.webmanifest` bestaat, maar geen `serviceWorker`, `PushManager` of PWA-plugin in `package.json`/`vite.config.ts`. |
| SMS | Niet aanwezig (Twilio alleen WhatsApp). |
| Slack / Discord / Telegram | Niet aanwezig (grep in `src/` en `supabase/functions/` leeg). |
| Sentry | `src/lib/errorReporting.ts`, `errorReporting.sentry.ts`, `errorReporting.init.ts`: handgeschreven envelope-transport, aan via `VITE_SENTRY_DSN` (`docs/foutrapportage.md`). Alleen frontend-fouten; geen gebruikersnotificaties. |
| Cron-watchdog | `supabase/functions/cron-watchdog/index.ts`: beoordeelt `get_scheduled_job_health()` (RPC, migraties `20260902045914`, `20260902050126`, `20260902050803`), registreert `cron_job_first_seen`; per falende taak een `system_cron_failure`-todo (**faalt door status "open"**, zie §1.2) en één verzamelmail per 12 u (`cron_watchdog_alert`). Handmatig uit `ScheduledJobsCard.tsx:64` (Admin → Email health). |
| Kritieke zelftest | `critical-selftest`: dagelijks 05:45 UTC; bij falen e-mail `[ALERT]` (12 u dedupe) + één bijgewerkte Werkbank-taak; bij herstel sluit hij de taak (:685-694). |
| Mailjet-heartbeat | `email-webhook-heartbeat`: dagelijks 06:15 UTC; mail + todo `email_webhook_silent` als >= `MIN_SENT_FOR_ALERT` mails verstuurd maar 0 events in 24 u, of misconfigured. |
| auto-close-monitor | Alleen e-mail met dedupe (:140-180), geen todo. |

---

## B.6. Admin-bel "Te beantwoorden"

`src/lib/openConversations.ts:1-19` + `src/hooks/useOpenConversations.ts`: één teller voor bel (`InboxBell.tsx`), zijbalk (`AdminLayout.tsx:146`), Berichtencentrum-tabs en Werkbank (`getInbox.ts:62-73` → `te_beantwoorden`-rijen). Telt **per gesprek**: (a) e-mailgesprek met ≥1 inkomend `project_communications`-bericht zonder `answered_at`, niet gearchiveerd, binnen 90 dagen (`OPEN_EMAIL_WINDOW_DAYS`); (b) chatgesprek met ≥1 niet-admin bericht zonder `read_at`, gesprek niet gearchiveerd/gesloten. Geen "gezien"-watermerk meer. Ververst elke 60 s en realtime op `project_communications`, `chat_messages`, `chat_conversations` (`useOpenConversations.ts:26-40`). Historie en motivatie: `docs/plan-berichtencentrum.md:75-85, 130, 203-215` (fase 1 verving de `inbound_email`-todo, migratie `20261027120000`).

---

## B.7. Instellingen / voorkeuren

| Instelling (`app_settings.id`) | Effect | Waar gelezen | UI |
|---|---|---|---|
| `reminder_email_enabled` (default true) | Zet **alle herinneringsmails** uit check-pending-items uit; todo's worden wél aangemaakt | `check-pending-items/index.ts:91, 109-113` (`canSendEmail`) | `src/pages/admin/AdminSettings.tsx` (generieke Switch voor booleans, :171) |
| `reminder_days_partner_quote` (5), `reminder_days_customer_quote` (7), `reminder_days_customer_request` (14) | Termijnen voor CHECK 2/3/4 | `check-pending-items:102-104` | AdminSettings (seed in migraties met labels "Herinnering …") |
| `customer_status_email_pending_days` (5), `customer_status_email_stale_days` (5), `customer_inputs_warning_days` (14) | CHECK 10/11/12 en escalatie | `check-pending-items:92-94, 106-108`; `cleanup-stale-todos:517-525` | AdminSettings |
| `customer_aftersales_days_after` (3), `customer_aftersales_auto_send` (false) | Aftersales: taak of automatische mail | `check-pending-items:1131-1141` | AdminSettings |
| `customer_review_reminder_enabled`, `customer_review_reminder_days` | Google-herinnering na beoordeling (mail) | `send-review-reminder/index.ts:130-133` | AdminSettings |
| `participant_google_review_enabled` | Review-knop in klantportaal | `get-customer-program:298-302` | AdminSettings |
| `commission_missing_invoice_days` (14), `commission_unlinked_invoice_days` (7) | Drempels commissietaken | `flag-missing-partner-invoices:98-107` | AdminSettings |
| `todo_age_thresholds`, `todo_due_soon_days` | Kleur/urgentie in Werkbank | `src/lib/appSettings.ts:45-97` | `TodoThresholdsEditor` (`AdminSettings.tsx:124`) |
| `bureau_admin_email` | Ontvanger van alarmmails (watchdog, zelftest) | `cron-watchdog:34-45` | AdminSettings |
| Per-project snooze (`program_requests.snoozed_until`) | Pauzeert alle auto-todo's en herinneringsmails voor dat project | `check-pending-items:49-53`; reconcile snooze-sweep :548 | Werkbank (`AdminWerkbank.tsx:148-191`) |
| Per-item `skip_partner_notification` | Geen partnermail voor dat onderdeel (admin zet bij toevoegen vanuit admin/templates) | o.a. `AdminAddActivitySheet.tsx:200`, `CopyFromProgramDialog.tsx:193` | impliciet |
| `email_suppressions` (migratie `20260708171713`) | Adressen die geen mail krijgen (bounce/spam/handmatig); leidt tot `email_undeliverable`-todo | `_shared/mailjet-send.ts` | Admin → Email health → Suppressies |
| Partner-voorkeuren | **Geen** notificatie-instellingen voor partners (geen kolommen `notif`/`opt_out`/`preferences` in migraties) | — | — |
| Klant-voorkeuren | **Geen** (geen unsubscribe-tabel buiten `email_suppressions`) | — | — |

---

## B.8. Cron-schema

In de repo zelf (migraties) staan maar vijf jobs; de overige cron-jobs (check-pending-items / auto-close-past-execution / flag-missing-partner-invoices / send-arrival-reminder / send-guest-details-reminder / send-partner-headsup-t3 / fetch-google-reviews / cron-watchdog zelf) zijn volgens `docs/deployen.md:202-250` destijds **rechtstreeks in de database (Lovable)** gezet en staan niet in migraties; hun schema is uit de repo niet af te leiden (alleen `get_scheduled_job_health()` in de admin toont ze). `supabase/config.toml` bevat geen schedules (alleen `verify_jwt` per functie); `.github/workflows/` (ci, deploy-supabase, restore-*, visuele-referenties) heeft geen `schedule:`.

| Jobnaam | Schema (UTC) | Bron | Notificatie-effect |
|---|---|---|---|
| `critical-selftest-daily` | `45 5 * * *` | `20260831124516_…sql:87-97` | E-mail `[ALERT]` + todo `critical_selftest_failure` bij falen; sluit todo bij herstel |
| `email-webhook-heartbeat-daily` | `15 6 * * *` | `20260901201703_…sql:32-42` | E-mail + todo `email_webhook_silent` bij stilte |
| `scan-stale-pending-changes` | `0 7 * * *` | `20260524120334_…sql:97-101` | Todo `stale_pending_change` |
| `map-sync-blocks-nightly` | `30 4 * * *` | `20260908160000_map-sync-bouwstenen.sql:22-32` | Geen notificatie (sync; fouten in `cron_dispatch_log`) |
| `wedding-referrals-expire-daily` | `15 3 * * *` | `20260928120000_bruiloftsdoorverwijzingen.sql:286-290` | Geen (zet status `expired`) |
| `claudia-*` | verwijderd | `20260908063000_claudia-opruimen.sql` | — |
| check-pending-items, auto-close-past-execution, auto-close-monitor, flag-missing-partner-invoices, send-arrival-reminder, send-guest-details-reminder, send-partner-headsup-t3 ("08:00 NL" volgens header), fetch-google-reviews (`refresh-google-reviews-daily`), cron-watchdog | **niet in repo** | genoemd in `docs/deployen.md:211-241` en functieheaders | zie §1.2/§5; check-pending-items draait bovendien via reconcile elke 5 min zolang de Werkbank open staat |

Watchdog-regel (`cron-watchdog/logic.ts:expectedSilenceHours`): uurtaken alarm na 3 u stilte, dagtaken na 26 u.

---

## B.9. Opvallende bevindingen

1. **`system_cron_failure`-todo wordt nooit aangemaakt**: `cron-watchdog/index.ts:106` zet `status: "open"`, niet toegestaan door `admin_todos_status_check` (todo/in_progress/done/dismissed). Alleen de e-mail komt aan.
2. **`changesSinceLastSeen`/`last_dashboard_seen_at`** (partner "sinds laatste bezoek") wordt server-side berekend en opgeslagen maar nergens in de frontend getoond.
3. **Dubbele taak bij nieuwe aanvraag**: DB-trigger `new_program_request` (normal) én `send-program-request` `new_request_received` (high) kunnen beide ontstaan voor dezelfde aanvraag (niet geverifieerd in data).
4. `email_webhook_silent` gebruikt een datum in `auto_entity_id` → bij aanhoudende storing elke dag een nieuwe taak (in tegenstelling tot de zelftest die één sleutel gebruikt).
5. `useOpenTodoCount` in `AdminLayout.tsx:76-90` wordt berekend maar niet als badge gebruikt.
6. Geen enkel push/geluid/SMS/Slack-kanaal; de admin ziet nieuwe zaken pas bij een open adminvenster (polling 60 s + realtime op chat/e-mailtabellen).

## B.Niet (volledig) onderzocht
- Exacte klant-acties (API-velden) in `update-customer-program` die de todo's op :846/:868/:979/:1168 triggeren; beschreven op basis van de todo-titels.
- Inhoud/ontvangers van de e-mails die naast todo's worden verstuurd (hoort bij de e-mailinventaris).
- Of de niet-in-repo cron-jobs daadwerkelijk actief zijn (alleen zichtbaar in de live database / `ScheduledJobsCard`).
