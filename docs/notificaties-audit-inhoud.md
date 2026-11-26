# Bijlage bij docs/plan-notificaties.md: inhoudelijke audit van alle mailteksten en Werkbank-taakteksten

Uitgevoerd 21 november 2026 (fase 0 van het plan). Elke mail is getoetst op
zes punten: A proces klopt nog (tegen de huidige docs), B links en adressen,
C variabelen gevuld, D toon en vorm, E dubbel met een andere mail, F oordeel.
Bronnen: de 59 templates in `email_templates` (export van 21 november), de
HTML in de edge functions, `src/App.tsx` voor de routes en de plannen in
`docs/`. "ok" staat er alleen waar het echt is nagekeken; onderaan elk deel
staat wat niet is onderzocht.

Deel A: mails aan de klant en bezoeker. Deel B: mails aan partners. Deel C:
mails aan het bureau en de boekhouding, systeemalarmen en de teksten van de
Werkbank-taken.

# Deel A — Klant en bezoeker


Stand repo 2026-11-21. Bronnen: `scratchpad/templates.txt` (export `email_templates`), `supabase/functions/**`, `src/App.tsx` (routes), docs/plan-*.md. Regelnummers verwijzen naar `supabase/functions/<functie>/index.ts` tenzij anders vermeld.

Algemene vaststellingen (gelden voor meerdere mails, hieronder niet steeds herhaald):

- **Aanspreekvorm klant = u.** Alle DB-klanttemplates en bijna alle inline-teksten gebruiken "u/uw". Afwijkingen: fallbacks in `update-customer-program` ("Je boeking is definitief", "Bekijk je programma", r. 1549-1577 en 1963-1980), fallback in `select-accommodation-quote` ("Je logies is bevestigd", r. 585-612, ook als onderwerp op r. 625 en logregel r. 652), fallback in `notify-new-chat-reply` ("Hallo …, Je hebt een nieuw bericht", r. 193-194), "Geachte" in `approve-accommodation-headcount` r. 267.
- **Huisstijlwrapper.** Alles wat via `getRenderedTemplate` loopt krijgt `wrapEmailHtml` (logo, voettekst met KvK/IBAN). Inline mails zonder wrapper: `quote_accepted_customer`, `catering_request_customer`, `bureau_invoice_to_customer`, `ticket_to_customer`, `partner_customer_message`, `program_draft_link`, `customer_link_resend`, en alle fallback-HTML's. Die hebben eigen (afwijkende) koppen/voetteksten: `#1e3a5f`/`#1a365d`/`#2563eb` in plaats van `#0F4C5C`.
- **`[TEST]`-prefix en test-omleiding** zijn bij klantmails overal aanwezig behalve waar genoemd.
- **Dubbele koppen:** templates die zelf een regel "Bureau Vlieland" bovenaan hebben (`inbound_reply_to_customer`, `counter_proposal_partner`) staan dubbel onder het logo van de wrapper.
- **Variabelenkolom in de DB** (`VARIABELEN`) klopt bij meerdere templates niet met de tekst; dat is alleen documentatie voor de template-editor (`src/content/emailTemplateVariables.ts`), de renderer kijkt er niet naar. Waar het inhoudelijk uitmaakt staat het bij C.

---

## Aanvragen vanaf de site

### program_request_customer — Bevestiging programma-aanvraag
- Ontvanger: klant. Verzonden door `send-program-request` r. 222-231 (template), 306 (log). Bron: DB-template "Programma aanvraag - Klant bevestiging", bijgewerkt 2026-03-11 (oudste klanttemplate). Callers: configurator-checkout én het ene aanvraagformulier `/programma-op-maat` (`ProgrammaOpMaat.tsx` r. 243-256, met `blocks: []`, `bureauFee: 0`).
- A: Verouderd. (1) Sinds fase 2 van docs/plan-klantreis-en-ondertekening.md (26 okt) is `/programma-op-maat` de hoofdingang; het plan zegt letterlijk "Bevestigingsmail `program_request_customer` nalopen op de nieuwe velden" — niet gebeurd (template van 11 maart). Voor het formulier zijn `coordinated_items`/`self_arranged_items` leeg, dus de klant krijgt alleen "Datum: Nog niet bekend (voorjaar 2027)" en "Aantal personen"; de vinkjes (activiteiten, eten, overnachting, boot) staan alleen in `notes`. (2) De sitebelofte is "binnen 5 werkdagen een voorstel" (`src/content/promises.ts`); de mail zegt "Bureau Vlieland beoordeelt uw aanvraag en neemt contact met u op over de volgende stappen" zonder termijn. (3) "U betaalt pas na bevestiging en ontvangt hiervan een factuur van Bureau Vlieland" is een wizard-zin die bij een maatwerkaanvraag vreemd staat (er is nog geen prijs). (4) "Handling fee: € {{bureau_fee}}" is interne jargon; de code geeft hem alleen bij factureerbare wizard-items (r. 230).
- B: `{{portal_url}}` → `/mijn-programma/<token>` bestaat; code vult hem alleen als `customerToken` meekomt (r. 162), anders blijft het hele blok weg (`{{#if portal_url}}`), ok. `mailto:hallo@bureauvlieland.nl` ok. "90 dagen geldig" klopt (migraties zetten `expires_at` op 90 dagen). Telefoon 0562 700 208 ok.
- C: Alle 8 variabelen worden gevuld. Code geeft `selected_date: 'Nog niet gekozen'` als fallback; het formulier stuurt zelf al "Nog niet bekend (…)" (`ProgrammaOpMaat.tsx` r. 251) — twee formuleringen voor hetzelfde.
- D: u-vorm ok. Onderwerp "Bevestiging programma aanvraag - Bureau Vlieland" zonder referentienummer (de referentie is bij verzending nog niet bekend in deze functie; de klant krijgt hem nergens). Emoji's 🔗📊📧📞 passen niet bij het ontwerpsysteem. Ondertekening "Erwin &amp; Team" afwijkend van "Bureau Vlieland" elders. Fallback (r. 248-255) is kaal en zonder wrapper.
- E: Geen overlap.
- F: **Tekst aanpassen.** Eén tekst voor beide ingangen: noem de 5 werkdagen, laat betaal- en fee-zinnen weg als er geen onderdelen zijn, en toon de gekozen "nodig"-vinkjes.

### quote_request_customer — Bevestiging offerte-aanvraag
- Ontvanger: klant. `send-quote-request` r. 194, 265. DB-template "Offerte aanvraag (Klant)", 2026-05-13.
- A: **Dood spoor.** Het offerteformulier `/offerte` is op 26 okt opgeheven (route is een `Navigate` naar `/programma-op-maat`, `App.tsx` r. 200; plan-klantreis besluit 2). De inventaris vond al geen UI-caller voor `send-quote-request`. Template en functie worden niet meer gebruikt.
- B: Geen links. ok.
- C: Alle 5 variabelen gevuld. ok.
- D: u-vorm ok; "binnen 5 werkdagen" klopt met promises.ts; onderwerp zonder referentie.
- E: Overlapt volledig met `program_request_customer` (zelfde moment, zelfde boodschap) voor de ingang die nu de enige is.
- F: **Schrappen** (template deactiveren, functie opruimen samen met `quote_request_bureau`); de tekst "binnen 5 werkdagen" verdient het om in `program_request_customer` terecht te komen.

### accommodation_request_customer — Bevestiging logiesaanvraag
- Ontvanger: klant. `send-accommodation-request` r. 238-253. DB-template "Logies aanvraag (Klant)", 2026-05-13.
- A: Klopt grotendeels. "Zodra we offertes ontvangen van onze partners, sturen we u een bericht zodat u deze kunt vergelijken en kiezen" — in de praktijk één offerte per aanvraag (plan-logieskeuze: "vergelijken komt zelden voor"), maar niet fout. De losse logiesaanvraag bestaat nog bewust (plan-klantreis, afwijking fase 2).
- B: `{{portal_link}}` → `/mijn-programma/<token>` of `/mijn-logies/<token>`, beide routes bestaan (`App.tsx` r. 238, 252). "90 dagen geldig" klopt.
- C: Alle 6 variabelen gevuld (r. 222-236). ok.
- D: u-vorm ok. Onderwerp "Uw logies-aanvraag is ontvangen" zonder LOG-referentie (wel beschikbaar: `request.reference_number`). Emoji 📊. Koppelteken "logies-aanvraag" overal, elders "logiesaanvraag". **Let op:** r. 240 `customerTemplate?.subject || \`${subjectPrefix}…\`` — de `[TEST]`-prefix staat alleen op de fallback, niet op het template-onderwerp; en de testmodus-omleiding gebruikt wel `getRecipientEmail` (r. 245), dus in preview gaat een mail zonder [TEST] naar Erwin.
- E: Geen.
- F: **Tekst aanpassen** (klein): referentie in onderwerp, prefix-bug, emoji weg.

### catering_request_customer — Bevestiging cateringaanvraag (inline)
- Ontvanger: klant. `send-catering-request` r. 117-150 (HTML), 203 (log). Geen DB-template, inline HTML zonder `wrapEmailHtml`.
- A: **Fout in de belofte.** "nemen binnen 2 werkdagen contact met u op met een definitieve offerte" (r. 121) — de site belooft overal "binnen 5 werkdagen een voorstel" (`promises.ts`), de cateringpagina zelf noemt geen termijn. Verder klopt het: cateringaanvraag blijft als losse stroom bestaan (plan-klantreis, afwijking fase 2). "Drank is altijd een p.m.-post … op nacalculatie" is een inhoudelijke toezegging die ik niet in docs terugvind; niet te verifiëren.
- B: Geen links behalve telefoon in tekst. Testmodus stuurt de klantmail naar `bureauEmail` (r. 169) in plaats van `getRecipientEmail` — consistent met de rest? Nee: elders gaat test naar `erwin@`. Cosmetisch.
- C: n.v.t. (inline). Referentie alleen in de tabel als `referenceNumber` meekomt; onderwerp "Bevestiging catering-aanvraag — Bureau Vlieland" zonder referentie.
- D: u-vorm ok. Geen huisstijlwrapper (eigen `#1a365d`-kop, ondertekening "Erwin & Team Bureau Vlieland"). Logging bevat `html_body`, prima.
- E: Geen.
- F: **Tekst aanpassen**: "2 werkdagen" → "5 werkdagen" (of de belofte uit `promises.ts`), in de wrapper zetten, referentie in onderwerp.

### program_draft_link — Conceptlink (exit-intent, inline)
- Ontvanger: bezoeker. `save-program-draft` r. 49-78 (HTML), 175 (log). Inline, eigen volledige HTML, geen wrapper.
- A: Proces klopt (concept 30 dagen, `/concept/:token`).
- B: **Fout adres**: voettekst "Bureau Vlieland · Vlieland · info@bureauvlieland.nl" (r. 73) — `info@` is geen bureau-adres; moet `hallo@bureauvlieland.nl`. Link `/concept/<token>` bestaat (`App.tsx` r. 251). `getOrigin(req)` (r. 43-47) gebruikt de request-origin voor de link: bij een preview-host gaat de link naar die host; de rest van de code gebruikt daarvoor `getPortalBaseUrl`. Geen Reply-To (geen project), ok.
- C: n.v.t.
- D: u-vorm ok. Eigen stijl (beige `#f4f1ea`, zwarte knop `#1a1a1a`): niet de huisstijl. Onderwerp "Uw programma staat klaar — Bureau Vlieland" is wat groot voor een bewaard concept.
- E: Geen.
- F: **Tekst aanpassen**: adres herstellen, `wrapEmailHtml` gebruiken, `getPortalBaseUrl`.

### customer_link_resend — Portaallink opnieuw (inline)
- Ontvanger: klant. `resend-customer-link` r. 122-148 (HTML), 164 (log). Inline, geen wrapper.
- A: ok ("wensen bekijken, aanvullen of aanpassen" klopt met het portaal).
- B: `/mijn-programma/<token>` ok; telefoon ok; Reply-To op referentie ok.
- C: n.v.t.
- D: u-vorm ok; onderwerp mét referentie, goed. Eigen `#1a365d`-stijl zonder wrapper.
- E: Geen.
- F: **Houden** (alleen wrapper).

### chat_reply_visitor — Chatantwoord aan bezoeker
- Ontvanger: sitebezoeker of klant (bij logies-chat de partner, r. 63-78 — dat deel hoort bij de partneraudit). `notify-new-chat-reply` r. 169-173 (template), 255 (log als `chat_reply_notification`). DB-template "Chat antwoord - Bezoeker notificatie", 2026-05-01.
- A: ok (chat blijft bestaan, plan-klantreis fase 5).
- B: `{{chat_url}}` → `/?chat=open`, `/mijn-programma/<token>?chat=open` of `/mijn-logies/<token>?chat=open`; `PreSalesChatWidget.tsx` r. 50 en `CustomerProgram.tsx` r. 732 lezen `?chat=open`, ok. Reply-To `reply+chat-<id>@` ok.
- C: Template gebruikt `message_preview` en `chat_url` die niet in VARIABELEN staan, maar de code levert ze (r. 170-173). ok.
- D: u-vorm ok. **Onderwerp-bug**: de code bouwt een specifiek onderwerp met referentie ("Nieuw bericht over uw aanvraag BV-…", r. 118-160) maar `template?.subject` wint altijd (r. 175), dus de klant krijgt het kale "Nieuw bericht van Bureau Vlieland". Fallback-HTML (r. 189-204) tutoyeert ("Je hebt een nieuw bericht") en wisselt naar "U kunt reageren".
- E: Geen.
- F: **Tekst aanpassen**: onderwerp met `{{reference_number}}`-variabele uit de code laten komen (of het template-onderwerp niet laten winnen), fallback in u-vorm.

---

## Offerte, akkoord en ondertekening

### quote_offer_customer — Voorstel versturen
- Ontvanger: klant. `send-quote-offer` r. 160-169 (variabelen/template), 244 (log). DB-template "Offerte versturen naar klant", 2026-05-13. Admin bewerkt onderwerp en tekst in `AdminSendQuoteDialog.tsx`.
- A: Proces klopt in grote lijn, met twee slijtplekken. (1) De standaardtekst in de dialoog (`AdminSendQuoteDialog.tsx` r. 89-108) zegt "U kunt het programma bekijken en goedkeuren" en "Zodra u het programma heeft goedgekeurd, zetten wij de uitvragen … uit" — sinds fase 4 (26 okt) is de stap "akkoord **en ondertekenen**" in één; de mail noemt de voorwaarden/handtekening niet. (2) De template-omschrijving zegt "De programmatabel en CTA-knop worden automatisch toegevoegd door het systeem": de code voegt géén programmatabel toe, alleen een PDF-downloadblok als er een PDF is (r. 207-224).
- B: `{{portal_url}}` → `/mijn-programma/<token>` ok. PDF-link: signed URL 90 dagen, ok. Reply-To ok.
- C: Alle 7 variabelen gevuld. Maar **dubbel blok**: de standaard-`emailBody` bevat al "Programmadetails: Data/Aantal personen/Geldig tot" (dialoog r. 94-97) en de template herhaalt onder `{{personal_message}}` dezelfde "Programmadetails"-tabel plus "Dit voorstel is geldig tot …". De klant leest de data drie keer. `company_name` wordt in de template niet gebruikt. De template heeft geen eigen aanhef; die zit in `personal_message` — zonder persoonlijke tekst begint de mail met "Uw maatwerkvoorstel / Programmadetails".
- D: u-vorm ok. Onderwerp "Uw maatwerkvoorstel van Bureau Vlieland" zonder referentie (admin kan het wijzigen, standaard staat er geen). Knop "Bekijk voorstel" terwijl de actie "akkoord en ondertekenen" is.
- E: Geen directe overlap; wel `sales_followup_offer_3d/7d` (ongebruikt, zie onder) en de automatische `customer_terms_request` na 7 dagen.
- F: **Tekst aanpassen**: standaardtekst dialoog + template één keer de details, referentie in onderwerp, actie "Bekijk en bevestig uw voorstel", voorwaarden noemen.

### quote_accepted_customer — "Uw akkoord is ontvangen" (inline)
- Ontvanger: klant. `accept-quote-proposal` r. 185-236 (`generateCustomerConfirmationEmail`), 420-446. Inline, eigen kop (gradient `#1e3a5f`), geen `wrapEmailHtml`.
- A: Tekst is op 26 okt aangepast aan fase 4 (voorwaarden "al ondertekend; onder voorbehoud van de bevestigingen", r. 207-212) — klopt. Plan-klantreis zegt dat deze mail "de geaccepteerde voorwaarden met link" noemt; er staat geen link naar de voorwaarden (`/algemene-voorwaarden`). "U ontvangt per activiteit een update in uw portaal": de klant krijgt die updates ook per mail (`status_*`).
- B: Portaallink ok; `mailto:hallo@` en 0562 700 208 ok; Reply-To ok.
- C: n.v.t.
- D: u-vorm ok. Onderwerp "Uw akkoord is ontvangen - Bureau Vlieland" zonder referentie. Geen wrapper; eigen voettekst dubbelt niet (er is geen wrapper), maar stijl wijkt af. Opsomming met "Bureau Vlieland verwerkt uw akkoord intern" is binnenkeuken. Logactor "klant → bureau (akkoord bevestiging)" is onjuist (het is systeem → klant), cosmetisch.
- E: **Dubbel.** Sinds fase 4 doet `handleAcceptTerms` (`CustomerProgram.tsx` r. 244-291) in één klik eerst `acceptTerms` (→ `update-customer-program` → `booking_confirmed_customer`) en daarna `acceptQuoteProposal` (→ deze mail). De klant krijgt binnen seconden twee bevestigingen: "Uw akkoord is vastgelegd (onder voorbehoud)" en "Uw akkoord is ontvangen". Zie ook `booking_confirmed_customer`.
- F: **Samenvoegen met booking_confirmed_customer**: één mail bij "akkoord en ondertekenen" (akkoord + handtekening + voorbehoud + voorwaardenlink); deze alleen nog sturen als er geen handtekening meekomt (admin-pad of oude flow).

### customer_terms_request / customer_terms_reminder_t14 / _t7 / _t3 — Ondertekenverzoek en herinneringen
- Ontvanger: klant. `send-terms-request` r. 97-135 (handmatig, `manual: true`) en `check-pending-items` r. 1854-1881 via `sendReminderEmail` (r. 116-205). Tekst: `_shared/customerTermsReminder.ts` `buildTermsMailCopy` r. 163-225. **Geen DB-template** voor geen van de vier ids (niet in de export, niet in migraties); `getRenderedTemplate` geeft `null` en de code valt terug op `copy.html` in `wrapEmailHtml` — dat is de bedoelde weg, maar de admin kan de tekst dus niet in de template-editor aanpassen en de variabelen (`days_until`, `billing_missing`, `stage`, `all_confirmed`, `first_date`) worden nergens gebruikt.
- A: Klopt met plan-klantreis fase 3/4 (trigger los van partnerbevestiging, fase "offerte" vraagt akkoord én handtekening, "akkoord" alleen handtekening, onder voorbehoud). De zin "Dat kost een minuut en is nodig zodat wij en onze partners alles correct kunnen afhandelen en factureren" (r. 198) is correct maar hard. `MIN_DAYS_BETWEEN_TERMS_MAILS = 2` en per fase één mail: bij een project dat laat binnenkomt (bijv. 10 dagen voor aankomst) krijgt de klant achtereenvolgens `_t14`? Nee: `pickTermsMail` kiest de meest urgente fase (t7), daarna t3 — maximaal 2 mails plus beltaak, ok.
- B: `/mijn-programma/<token>?view=akkoord` — route bestaat; `?view=akkoord` wordt door het portaal gelezen (plan fase 3). Reply-To alleen in `send-terms-request` (r. 118); `sendReminderEmail` in check-pending-items zet **geen Reply-To** (r. 166-172), terwijl de tekst zegt "Beantwoord gewoon deze mail" — het antwoord komt dan op `hallo@` zonder projectkoppeling.
- C: Zie boven: variabelen onbenut omdat er geen template is; niets blijft letterlijk zichtbaar.
- D: u-vorm ok. Onderwerpen hebben referentie, goed. Knop `#1a365d` (r. 207) in plaats van `#0F4C5C`. Twee acties in één zin bij `billingMissing` ("… en uw factuurgegevens invullen") — acceptabel, want fase 4 vraagt bedrijfsnaam/adres bij het tekenen.
- E: Fase "offerte" (7 dagen na verzending, `QUOTE_FOLLOWUP_AFTER_DAYS`) zegt hetzelfde als de ongebruikte `sales_followup_offer_7d`; na akkoord zegt het eerste verzoek hetzelfde als `sales_pre_signing` (ongebruikt). Geen dubbel in de praktijk, wel dubbele templates in de DB.
- F: **Houden**, met Reply-To in de cron-variant en de `sales_pre_signing`/`sales_followup_*`-templates opruimen of hierop laten aansluiten.

### booking_confirmed_customer — Boeking definitief / akkoord vastgelegd
- Ontvanger: klant. `update-customer-program` r. 1521-1591 (template + fallback). DB-template "Definitieve boeking - Klant", 2026-05-12.
- A: **Verouderd.** De template is geschreven voor het oude eindpunt ("Alle activiteiten zijn nu definitief in de planning vastgelegd", "Hartelijk dank voor uw boeking"). Sinds fase 4 tekent de klant meestal bij het akkoord, onder voorbehoud; de code plakt dan een geel "Onder voorbehoud"-blok vóór de template (r. 1536-1542) en wijzigt het onderwerp naar "Uw akkoord is vastgelegd (onder voorbehoud)" (r. 1532-1534), maar de kop in de body blijft "Uw boeking is definitief!" en "Alle activiteiten zijn nu definitief" — tegenstrijdig in één mail. De handtekeninggegevens (`booking_summary` = handtekeningtabel) staan zonder kop ("Handtekening-ID …" los in de tekst). "U ontvangt circa twee weken voor aankomst nog een vriendelijke herinnering" klopt met `send-guest-details-reminder` (13-15 dagen).
- B: `{{portal_link}}` ok. Reply-To ok.
- C: Code levert 11 variabelen; template gebruikt 4 (`customer_name`, `reference_number`, `booking_summary`, `portal_link`). `selected_dates`, `number_of_people`, `confirmed_count`, `signature_details`, `partner_terms_note`, `reservation_notice`, `portal_url` ongebruikt — `reservation_notice` had het voorbehoud netjes in de template kunnen zetten; nu doet de code het via string-prefix (werkt alleen omdat de template het woord "Onder voorbehoud" niet bevat). De zin "Dit document dient als bewijs van je digitale akkoord" uit de fallback (r. 1565) zit niet in de template; de template zegt niets over wat de handtekeningtabel is.
- D: u-vorm ok in template; fallback tutoyeert ("Je boeking is definitief!", "Bekijk je programma", r. 1549-1577). Onderwerp met referentie, goed. Lijstje "Gastenlijst / Dieetwensen / Kamerindeling" is één actie, goed.
- E: **Dubbel** met `quote_accepted_customer` (zelfde klik, zie boven). Inhoudelijk ook gelijk aan `sales_post_signing_welcome` (ongebruikt).
- F: **Tekst aanpassen en samenvoegen**: twee varianten in één template met `{{#if reservation_notice}}` (onder voorbehoud: "Uw akkoord en handtekening zijn vastgelegd"; anders "definitief"), handtekeningtabel met kop en uitleg, `quote_accepted_customer` erin opnemen.

---

## Statusmails over onderdelen

### status_confirmed — Activiteit bevestigd door partner
- Ontvanger: klant. `update-partner-item-status` r. 731-792. DB-template "Status: Bevestigd", 2026-05-13.
- A: Klopt met docs/plan-afhandeling-onderdelen.md: bij een bevestigings-onderdeel zonder offerte wordt de mail overgeslagen (`skipCustomerEmail`, r. 729). Maar de tekst zegt niet wat de klant moet doen: `actor_line` zegt "Aan zet: Klant" en de code zet voor `confirmed` actor = klant (r. 745-746, "klant moet akkoord geven") terwijl de template alleen zegt "Bekijk alle details en de voortgang". Het fallback-onderwerp zegt wél "Uw akkoord gevraagd" (r. 775). Of de klant echt opnieuw akkoord moet geven hangt af van prijswijziging (`program_partner_reapproval`); de template maakt dat niet duidelijk.
- B: `{{portal_link}}` ok; Reply-To via eigen Mailjet-helper (r. 49) ok.
- C: Alle 7 variabelen gevuld (r. 748-758). ok.
- D: u-vorm ok. Onderwerp "Uw activiteit {{activity_name}} is bevestigd!" zonder referentie. Symbolen ✓ als los teken. "partner" in klanttekst ("bevestigd door de partner", "Toelichting van partner") — klantportaal zegt "aanbieder"; `renderActorLine` zegt ook "Aanbieder".
- E: Als het item in `counter_proposed` stond, krijgt de klant **twee mails** tegelijk: `counter_proposal_response` (r. 485-619) én `status_confirmed` (r. 726-818); er is geen `else`.
- F: **Tekst aanpassen**: zeg wat er nog van de klant wordt verwacht (of niets), "aanbieder", referentie in onderwerp; dubbel met tegenvoorstel-mail oplossen (zie `counter_proposal_response`).

### status_alternative — Alternatief voorgesteld
- Ontvanger: klant. Zelfde pad als `status_confirmed`. DB-template "Status: Alternatief voorgesteld", 2026-05-18.
- A: ok ("laat ons weten of u akkoord gaat of een ander tijdstip wenst" klopt met tegenvoorstel-flow in het portaal).
- B: LINKS zegt `{{portal_link}}` terwijl VARIABELEN `portal_url` noemt; code levert `portal_link` → link werkt. ok.
- C: Template gebruikt `proposed_date` en `quoted_price` (niet in VARIABELEN); code levert ze (r. 752-754). ok.
- D: u-vorm ok. Onderwerp zonder referentie; "Partner" als label. Symbool ↻ los.
- E: Zelfde dubbel met `counter_proposal_response` bij `counter_proposed`.
- F: **Houden** (cosmetisch: referentie, "aanbieder").

### status_unavailable — Niet beschikbaar
- Ontvanger: klant. Zelfde pad. DB-template "Status: Niet beschikbaar", 2026-05-13. Wordt ook bij bevestigings-onderdelen verstuurd (alleen `confirmed` wordt overgeslagen) — klopt met het plan ("'Niet beschikbaar' wel").
- A: ok. "Neem contact op of bekijk uw programma in het portaal" — actor is bureau (r. 746), `actor_line` zegt "Aan zet: Bureau Vlieland"; dan is "Neem contact op" een onnodige dubbele actie; beter "wij nemen contact met u op".
- B/C: ok (alle 6 variabelen gevuld).
- D: Kop "Update, {{customer_name}}" is kaal; onderwerp zonder referentie; ✕ los.
- E: Zelfde dubbel met `counter_proposal_response`.
- F: **Tekst aanpassen** (klein).

### counter_proposal_response — Reactie op uw tegenvoorstel
- Ontvanger: klant. `update-partner-item-status` r. 485-619. DB-template "Reactie op tegenvoorstel (Klant)", 2026-05-13.
- A: ok inhoudelijk. `action_text` bij `confirmed`: "bevestig uw akkoord in het klantenportaal" — na een geaccepteerd tegenvoorstel is er niets meer te bevestigen voor de klant? Niet uit docs vast te stellen; portaal-logica niet onderzocht.
- B: `{{portal_link}}` ok; Reply-To ok.
- C: 12 variabelen geleverd; template gebruikt 8; `status_color/bg/border` ongebruikt (alleen in fallback). ok.
- D: u-vorm ok ("klantenportaal" vs elders "klantportaal"/"portaal"). Onderwerp zonder referentie. Geen "Aan zet"-regel terwijl `status_*` die wel hebben.
- E: **Dubbel**: direct erna gaat ook `status_confirmed`/`_alternative`/`_unavailable` voor hetzelfde onderdeel (geen `else` tussen r. 485 en r. 730). De klant krijgt twee mails over één partnerreactie.
- F: **Samenvoegen met status_***: één statusmail met een `{{#if was_counter_proposal}}`-regel ("Dit is de reactie op uw tegenvoorstel van …"), of de statusmail overslaan als deze is verstuurd.

### item_added_customer_approval — Nieuw onderdeel, akkoord gevraagd
- Ontvanger: klant. `publish-program-changes` r. 812-840 (alleen als `addedItemsNeedingApproval.length > 0`). DB-template, 2026-08-19.
- A: ok (admin voegt na akkoord onderdeel toe; klant keurt goed via `approve-quote-item`; partner wordt daarna pas benaderd — klopt met "Zodra u het nieuwe onderdeel heeft goedgekeurd, stemmen wij dit direct af met de betreffende aanbieder"). De code schuift `quote_valid_until` 14 dagen op (r. 788-795); de mail noemt geen termijn — mag.
- B: `{{portal_url}}` ok; Reply-To ok.
- C: Code levert 6, template gebruikt `customer_name`, `reference_number`, `changes_summary`, `portal_url`; `new_item_count`/`new_item_names` ongebruikt. ok.
- D: u-vorm ok; onderwerp met referentie, één actie, goed. "programmapagina" vs "klantportaal".
- E: Geen (het is óf deze óf `item_changes_customer`).
- F: **Houden.**

### item_changes_customer — Programma bijgewerkt
- Ontvanger: klant. (a) `publish-program-changes` r. 815-840 (admin publiceert), (b) `update-customer-program` r. 1950-1992 (klant wijzigde zelf tijd/aantal/notities). DB-template "Programmawijzigingen - Klant bevestiging", 2026-05-01.
- A: Tekst is generiek ("Uw programma is bijgewerkt. Hieronder vindt u een overzicht") en dekt beide situaties, maar in situatie (b) mist de belangrijkste informatie uit de fallback (r. 1966-1972): dat de aanbieders zijn geïnformeerd en de klant bericht krijgt zodra zij reageren. Bij (a) kan de admin een `adminNote` meegeven (r. 807-809) — ok.
- B: `{{portal_url}}` staat als kale URL in de tekst ("bekijken: {{portal_url}}") — werkt, maar is geen knop zoals overal elders. Reply-To ok.
- C: Template gebruikt `{{changes_summary}}` (VARIABELEN zegt `changes_list`); beide callers leveren `changes_summary` (r. 817, 1953). ok.
- D: u-vorm ok in template; fallback in update-customer-program tutoyeert ("Je wijzigingen zijn doorgevoerd", "Bekijk je programma", r. 1963-1980). Onderwerp met referentie, goed.
- E: Geen.
- F: **Tekst aanpassen**: knop i.p.v. kale URL; één regel "{{#if by_customer}}De betrokken aanbieders zijn geïnformeerd en bevestigen opnieuw{{/if}}" (variabele toevoegen in update-customer-program).

### date_change_customer — Datumwijziging bevestigd
- Ontvanger: klant. `update-customer-program` r. 580-612. DB-template "Datumwijziging - Klant bevestiging", 2026-03-11.
- A: **Claim klopt niet altijd.** Template: "Alle betrokken aanbieder(s) … zijn op de hoogte gesteld en wij wachten op hun bevestiging." De code weet of `notify-date-change` (deels) mislukte (`notifyIssues`, r. 553-562) en maakt dan een todo "informeer partners handmatig", maar stuurt de klant dezelfde zin. Bureau-onderdelen (overtocht, fiets, bagage) worden nooit automatisch gemaild (todo r. 565-575); daarover zegt de mail niets.
- B: `{{portal_url}}` ok. **Geen Reply-To** op deze mail (r. 603-608), anders dan de andere mails in dezelfde batch.
- C: Template gebruikt `{{#if has_accommodation}} en logiespartner(s){{/if}}`; code levert **geen `has_accommodation`** (wel een ongebruikte `providers_note`, r. 583). Het logies-deel verschijnt dus nooit, ook niet als `selectedQuoteIds` gevuld is (r. 544).
- D: u-vorm ok. Onderwerp "Datumwijziging bevestigd" zonder referentie en suggereert dat de wijziging rond is, terwijl de body zegt "wij wachten op hun bevestiging". Fallback-onderwerp "Datumwijziging ontvangen" is eerlijker.
- E: Geen.
- F: **Tekst aanpassen**: onderwerp "Datumwijziging ontvangen — {{reference_number}}", `has_accommodation` en referentie meegeven, voorbehoud over bureau-onderdelen/mislukte mails, Reply-To.

---

## Vóór en na het verblijf

### guest_details_reminder — Gastenlijst en wensen (T-14)
- Ontvanger: klant. `send-guest-details-reminder` r. 80-114. DB-template, 2026-05-12. Alleen verstuurd als er een template is (`if (!tpl …) continue`, r. 88) — geen fallback.
- A: ok. Venster 13-15 dagen klopt met "Over twee weken". "Wij willen graag voor de laatste keer met u meedenken over de invulling" is een vreemde zin voor een gegevensverzoek. "Kamerindeling — eventuele voorkeuren voor logies" wordt ook gevraagd als er geen logies is (code checkt alleen catering, r. 59-66).
- B: `{{portal_link}}` ok. **Geen Reply-To** (r. 97-105) terwijl de tekst zegt "Reageer gerust op deze e-mail".
- C: Alle 4 gevuld; `reference_number` staat niet in de tekst of het onderwerp.
- D: u-vorm ok. Onderwerp zonder referentie.
- E: Herhaalt de drie punten uit `booking_confirmed_customer` — bedoeld (aangekondigd daar), ok.
- F: **Tekst aanpassen** (klein): zin herschrijven, referentie, Reply-To.

### arrival_reminder — Aankomstmail met programma (T-3 tot T-5)
- Ontvanger: klant, cc `hallo@` (r. 136). `send-arrival-reminder` r. 86-160. DB-template "Aankomstmail (programma + bootinfo)", 2026-05-12. Geen fallback (r. 94-97).
- A: Grotendeels ok. "In de bijlage vindt u het volledige programma met alle tijden, locaties en kaartjes": de docx bevat een "Locatie op de kaart"-sectie (`generate-program-docx` r. 390) maar geen tickets; "kaartjes" leest als tickets, die apart via `ticket_to_customer` gaan. Dubbelzinnig, beter "kaarten". De bootinstructies (Harlingen, 30 minuten, groepsticket aan de balie) kan ik niet uit docs verifiëren; staat alleen in deze template.
- B: `{{portal_link}}` ok; `{{ferry_info_link}}` = `https://www.rederij-doeksen.nl` ok. **Geen Reply-To** (r. 133-139) terwijl de tekst zegt "antwoord op deze mail".
- C: Alle 6 gevuld. ok.
- D: u-vorm ok; "Nog een paar nachtjes slapen" is informeel maar bewust (omschrijving: "enthousiast"). Onderwerp zonder referentie (wel onderaan in de body).
- E: Overlapt met de ongebruikte `sales_post_signing_welcome` die "ongeveer tien dagen voor aankomst een definitieve programmaversie met bootgegevens" belooft (klopt niet met 3-5 dagen).
- F: **Houden** ("kaartjes" → "kaarten", Reply-To, referentie in onderwerp).

### customer_aftersales_review — Bedankt, deelt u uw ervaring?
- Ontvanger: klant. `send-customer-aftersales` r. 114-161. DB-template "Aftersales / review", 2026-09-23.
- A: ok, conform docs/plan-reviews-oogsten.md (eigen pagina eerst, Google als tweede regel, automatisch na 3 dagen, `late_intro` voor de inhaallijst).
- B: `{{own_review_url}}` → `/beoordeling/<review_token>` bestaat (`App.tsx` r. 248); `{{google_review_url}}` uit instelling `customer_aftersales_google_url`. Reply-To op referentie ok ("wordt automatisch gekoppeld aan {{reference_number}}" klopt daarmee).
- C: Template gebruikt `late_intro` (niet in VARIABELEN); code levert hem (r. 121). Alle gevuld.
- D: u-vorm ok, onderwerp met referentie, één knop. Goed.
- E: Geen.
- F: **Houden.**

### customer_review_google_reminder — Herinnering Google (eenmalig)
- Ontvanger: klant. `send-review-reminder` r. 183-223. DB-template, 2026-09-22.
- A: ok (plan fase 4: één herinnering, zeven dagen, uitzetbaar). "Een week geleden vulde u …" klopt alleen bij `mode: due` met standaard 7 dagen; bij "Herinner nu" vanuit admin of een andere instelling kan het korter/langer zijn. Klein.
- B: links ok; Reply-To ok.
- C: Alle 5 gevuld.
- D: u-vorm ok; referentie in onderwerp; "Dit is de enige herinnering die u van ons krijgt" — goed.
- E: Geen.
- F: **Houden.**

### reference_case_approval — Mag deze referentiepagina online?
- Ontvanger: klant. `send-reference-approval` r. 85-127. DB-template, 2026-09-22. Geen fallback.
- A: ok (plan-reviews fase 3).
- B: `{{approval_url}}` → `/referentie-akkoord/<token>` bestaat (`App.tsx` r. 250). Reply-To ok.
- C: Alle 4 gevuld.
- D: u-vorm, referentie in onderwerp, één knop. Goed.
- E: Geen.
- F: **Houden.**

---

## Logies

### accommodation_quote_notification — Nieuwe logiesofferte
- Ontvanger: klant. `notify-accommodation-quote` r. 213-293; alleen via admin-knop "Doorsturen" (`AdminAccommodationDetail.tsx`). DB-template "Logies offerte notificatie", 2026-05-18.
- A: **Eén zin klopt niet**: "U ontvangt automatisch bericht bij nieuwe offertes." De mail gaat alleen uit als Erwin hem doorstuurt (plan-logieskeuze besluit 1: offertes zijn direct zichtbaar in het portaal, "Doorsturen" is alleen de mail). "vergelijk met eventuele andere offertes" is zelden van toepassing (één offerte per aanvraag), maar niet fout.
- B: `{{portal_link}}` ok; Reply-To ok. Via `sendMailjet` met suppressiecontrole, goed.
- C: Template gebruikt `price_per_person_per_night` (VARIABELEN zegt `price_per_person`); code levert `price_per_person_per_night` (r. 224). Code levert 16 variabelen; template gebruikt 7 — extra's, inbegrepen, aantal nachten, aankomst/vertrek staan niet in de mail. `price_total` = basis + extra's (r. 203), dus "Totaalprijs" klopt wel.
- D: u-vorm ok. Kop "Goed nieuws, {{customer_name}}!" en 🏠. Onderwerp zonder LOG-referentie. **Logregel** r. 295 `subject: emailSubject` zonder prefix, cosmetisch.
- E: Geen.
- F: **Tekst aanpassen**: laatste zin schrappen, aankomst/vertrek/gasten tonen (variabelen zijn er al), referentie in onderwerp.

### accommodation_selected_customer — Uw logies is geboekt
- Ontvanger: klant. `select-accommodation-quote` r. 548-650. DB-template "Logies gekozen (Klant)", 2026-05-13.
- A: **Tegenstrijdig met de partnermail.** Klant: "De accommodatie neemt binnenkort contact met u op om de reservering definitief te maken." Partner (`accommodation_selected_partner`, template en fallback r. 463): "Bureau Vlieland neemt contact met de gast op over de verdere afhandeling." Beide partijen wachten op de ander. Volgens het bureau-centraal model (partner factureert aan Bureau Vlieland, bureau communiceert) hoort de klantzin te zijn dat Bureau Vlieland het verder regelt. Bovendien is de reservering na de keuze al definitief (klant tekende de logiesvoorwaarden, `termsAcceptedLine`); "om de reservering definitief te maken" klopt niet.
- B: `{{portal_link}}` ok; Reply-To ok.
- C: **Dubbel euroteken**: template "Totaalprijs:€ {{price_total}}" en code levert `formatCurrencyNL(grandTotal)` = "€ 1.234,00" → "€ € 1.234,00". Code levert 23 variabelen, template gebruikt 7: adres, telefoon, inbegrepen, kamerindeling, extra's en het voorwaarden-akkoordblok staan niet in de template; de code plakt `termsAcceptedBlock` daarom achter de body als de handtekening ontbreekt (r. 615-622) — werkt, maar het blok staat dan ná de wrapper-voettekst? Nee: template-body heeft geen `</body>` meer na wrapper… de wrapper levert wél `</body>`, dus het blok komt **buiten de witte kaart onder de voettekst** terecht. Visueel fout.
- D: u-vorm in template; fallback en **onderwerp-fallback** tutoyeren ("Je logies is bevestigd", r. 585-612, 625, 652, 668). Onderwerp "Uw logies is geboekt: {{accommodation_name}}" zonder referentie.
- E: Geen.
- F: **Tekst aanpassen**: contactzin corrigeren (één partij), "€ " uit template, adres/kamers/inbegrepen/voorwaardenblok als `{{#if}}` opnemen zodat de code-hack weg kan, fallback in u-vorm.

### accommodation_headcount_confirmed_customer — Logies aangepast aan N gasten (inline)
- Ontvanger: klant. `approve-accommodation-headcount` r. 257-298. Inline in `wrapEmailHtml`.
- A: ok, conform docs/plan-logies-aantalwijziging.md ("klant krijgt na goedkeuring een mail met het nieuwe totaal; hoeft niets te doen").
- B: `/mijn-programma/<token>` of `/mijn-logies/<token>` ok; Reply-To ok; `sendMailjet` ok.
- C: n.v.t. Referentie in onderwerp (`refSuffix`) en body, goed.
- D: **"Geachte {{naam}}"** (r. 267) waar alle andere mails "Beste" zeggen. Wrapper gebruikt, huisstijlkleur `#0F4C5C`, goed. "inclusief btw" ok.
- E: Geen.
- F: **Houden** ("Geachte" → "Beste").

---

## Annulering, berichten, facturen, tickets

### cancellation_customer — Aanvraag geannuleerd
- Ontvanger: klant. `cancel-program-request` r. 333-360; zowel klant- als admin-annulering (admin met `notify_partners: false`, `AdminRequestDetail.tsx` r. 1108). DB-template "Annulering (Klant)", 2026-05-19.
- A: **Claim klopt niet bij admin-annulering.** "Alle {{providers_count}} betrokken aanbieder(s) zijn automatisch op de hoogte gesteld." Bij de admin-flow gaat er niets automatisch uit (r. 288-291: "Bij notify_partners=false gaat er niets uit"); de admin kiest zelf wie bericht krijgt. De mail zegt dan iets wat niet gebeurd is. Ook `sent_by: "customer"` (r. 364) bij admin-annulering, cosmetisch. "Uw aanvraag … is succesvol geannuleerd" — "succesvol" is systeemtaal.
- B: `{{programma_url}}` → `/programma-samenstellen` bestaat, maar sinds plan-klantreis fase 1 is de voordeur `/programma-op-maat`; de wizard is "tweede laag". Knop "Nieuw programma samenstellen" stuurt de klant dus de oude route in. Reply-To ok.
- C: VARIABELEN noemt `event_dates`, tekst gebruikt `{{dates}}`; code levert `dates` (r. 335). `programma_url` niet in VARIABELEN maar wel geleverd. ok.
- D: u-vorm ok. Onderwerp zonder referentie.
- E: Geen.
- F: **Tekst aanpassen**: aanbieder-zin afhankelijk van `notify_partners` (variabele meegeven), link naar `/programma-op-maat`, referentie in onderwerp.

### partner_customer_message — Bericht van de accommodatie (inline)
- Ontvanger: klant, Bcc `hallo@`. `send-partner-customer-message` r. 131-192. Inline, geen wrapper, afzendernaam "<accommodatie> via Bureau Vlieland".
- A: ok (plan-berichtencentrum: partner ↔ klant via reply+REF; `inbound-email` zet een antwoord met `audience customer_partner` door). "Uw reactie komt automatisch terecht bij {{accommodatie}}": een antwoord gaat naar `reply+BV-…@`, komt in het dossier en wordt via `inbound-email` naar de klant genotificeerd als het van de partner komt — of het bureau het antwoord van de klant ook aan de partner doorzet, heb ik niet in `inbound-email` gevonden (zie "Niet onderzocht"). De zin belooft mogelijk meer dan het systeem doet.
- B: Reply-To `reply+REF@reply.bureauvlieland.nl` ok; portal-link `/mijn-programma/<token>` ok.
- C: n.v.t.
- D: u-vorm ok. Eigen kop `#1e3a5f` zonder wrapper. Onderwerp = partneronderwerp zonder referentie.
- E: Geen.
- F: **Houden**, zin over "komt automatisch terecht bij" verifiëren/afzwakken, wrapper.

### inbound_reply_to_customer — Nieuw bericht over uw reservering
- Ontvanger: klant. `inbound-email` r. 234-311, alleen bij `audience === "customer_partner"` (r. 797-808). DB-template "Klantnotificatie bij partnerantwoord", 2026-03-24. Geen fallback (r. 268-271).
- A: ok. "als reactie op uw communicatie" is stijf; `partner_name` = de geparste afzendernaam (`contactName || contactEmail`), kan dus ook een kaal e-mailadres zijn.
- B: `{{portal_url}}` ok; Reply-To ok; `hallo@` ok. **Let op** r. 275-276: `getRecipientEmail(pr.customer_email)` en `getSubjectPrefix()` zonder origin → altijd productie; voor een webhook juist.
- C: Alle 6 gevuld. `message` afgekapt op 2000 tekens, zonder "…"-melding.
- D: u-vorm ok; referentie in onderwerp. **Dubbele kop en voet**: template begint met "Bureau Vlieland" en eindigt met "Bureau Vlieland 📧 hallo@bureauvlieland.nl", beide staan al in de wrapper.
- E: Geen.
- F: **Tekst aanpassen** (cosmetisch): kop/voet uit template, zin herschrijven.

### bureau_invoice_to_customer — Factuur (inline)
- Ontvanger: factuurcontact of klant. `send-bureau-invoice-to-customer` r. 157-256. Inline, geen wrapper; admin kan onderwerp/tekst overschrijven.
- A: ok (verkoopfactuur met pdf; betaaltermijn "op de factuur vermeld").
- B: Reply-To ok; voettekst `hallo@` + telefoon ok.
- C: n.v.t.
- D: u-vorm ok; onderwerp "Factuur {{nr}} – Bureau Vlieland" (factuurnummer is hier de juiste referentie; projectreferentie staat in de tabel). "via een reply op deze e-mail" (r. 188) is Engels jargon. Eigen `#1e3a5f`-stijl. `TrackOpens`/`TrackClicks` ontbreken (andere inline mails zetten ze) — cosmetisch.
- E: Geen.
- F: **Houden** ("reply" → "door deze e-mail te beantwoorden", wrapper).

### ticket_to_customer — Uw tickets (inline)
- Ontvanger: klant (meerdere adressen mogelijk). `send-ticket-email` r. 182-267. Inline, geen wrapper.
- A: ok (bijlagen tot limiet, daarboven 14-daagse links).
- B: signed URLs ok; Reply-To ok.
- C: n.v.t.
- D: u-vorm ok; onderwerp met boekingsreferentie (niet de BV-referentie). Eigen stijl.
- E: Overlapt licht met `arrival_reminder` als die "kaartjes" belooft (zie daar).
- F: **Houden.**

---

## Doorverwijzing

### wedding_referral_customer / event_referral_customer — Doorverwijzing (partner in cc)
- Ontvanger: bruidspaar/klant, cc partner. `send-wedding-referral` r. 390-444; de DB-template is **alleen voorzet in het dialoog** (`WeddingReferralDialog.tsx`), de admin bewerkt en de functie stuurt de bewerkte platte tekst via `plainTextToHtml` + `wrapEmailHtml` (r. 403-404). DB-templates 2026-10-04 / 2026-11-03.
- A: ok, conform docs/plan-bruiloftsdoorverwijzingen.md (klantmail met cc, partner krijgt eigen mail met "al bekend"-link).
- B: Geen links in de template; `{{partner_email}}` als tekst. Reply-To op projectreferentie als die er is. Cc valt weg in testmodus (r. 141).
- C: Variabelen `voornaam`, `trouwdatum`/`datum`, `partner_naam`, `aantal_gasten`, `partner_email` worden in het dialoog gevuld (niet gecontroleerd in `WeddingReferralDialog.tsx`; zie "Niet onderzocht"). Omdat de admin de tekst ziet, blijft een lege variabele niet onopgemerkt.
- D: u-vorm ok; onderwerp "Uw bruiloft op Vlieland" zonder referentie (er is vaak geen project) — acceptabel.
- E: Geen.
- F: **Houden.**

---

## DB-templates zonder code: sales_* en presales_*

Gezocht in `src/` en `supabase/functions/`: de ids `sales_followup_offer_7d`, `sales_followup_offer_3d`, `sales_pre_signing`, `sales_post_signing_welcome`, `presales_intake_followup`, `presales_clarification`, `presales_proposal_intro`, `presales_partner_question` komen alleen voor in de migraties die ze aanmaakten (`20260609092340_…sql`, `20260430202331_…sql`) en in `src/content/emailTemplateVariables.ts` (variabelenlijst voor de editor). `compose-followup-email` en `send-project-email` lezen geen `email_templates` (compose gebruikt de AI-intenties uit `_shared/emailComposerIntents.ts`; `SendProjectEmailSheet.tsx` doet geen `from("email_templates")`). De enige lezers van `email_templates` in `src/` zijn de template-editor (`AdminEmailTemplates.tsx`) en `AdminQuotePreview.tsx` (alleen `quote_offer_customer`). **Conclusie: alle acht zijn ongebruikt** (alleen te bekijken/bewerken in Admin → Berichten → Templates).

- `sales_followup_offer_3d` / `_7d`: inhoud overlapt met de AI-intentie `reminder_proposal` én met de automatische `customer_terms_request` in fase "offerte" (7 dagen). De 3d-variant bestaat nergens als trigger. **Schrappen.**
- `sales_pre_signing`: "Voordat wij de boeking definitief maken, vragen wij u om de reserveringsvoorwaarden door te nemen" — dekt exact `customer_terms_request` na akkoord (die geen DB-template heeft). **Samenvoegen**: óf deze template hernoemen naar `customer_terms_request` met de variabelen uit `buildTermsMailCopy`, óf schrappen.
- `sales_post_signing_welcome`: **verouderd** ("Ongeveer tien dagen voor aankomst sturen wij u een definitieve programmaversie met … bootgegevens" → aankomstmail gaat 3-5 dagen vooraf; "rond die tijd ook … gastenlijst" → 14 dagen vooraf) en overlapt met `booking_confirmed_customer`. **Schrappen.**
- `presales_intake_followup`, `presales_clarification`, `presales_proposal_intro`: placeholders "(vul hier uw vragen in)" — bedoeld als handmatige voorzet, maar geen enkel scherm laadt ze; de AI-composer (`status_update`, `reply_last`, `free`) dekt dit. `presales_clarification` belooft "wij ontvangen deze direct in uw projectdossier" (klopt via reply+REF, mits de admin die Reply-To zet — in `send-project-email` niet gecontroleerd). **Schrappen** of als snippets in `SendProjectEmailSheet` aanbieden.
- `presales_partner_question`: partnermail ("Hi {{partner_name}}", je-vorm), hoort niet in de klantlijst; ook ongebruikt. **Schrappen** (melden aan partneraudit).

---

## Samenvattende tabel

| Template / functie | Ernst | Actie |
|---|---|---|
| program_request_customer | verouderd | Tekst aanpassen: 5 werkdagen, nieuwe formuliervelden (vinkjes), betaal/fee-zinnen conditioneel, emoji weg |
| quote_request_customer | verouderd (dood) | Schrappen (formulier /offerte bestaat niet meer) |
| accommodation_request_customer | cosmetisch | Referentie in onderwerp; [TEST]-prefix ontbreekt op template-onderwerp (r. 240) |
| catering_request_customer (inline) | fout | "2 werkdagen" → sitebelofte 5 werkdagen; wrapper |
| program_draft_link (inline) | fout | `info@bureauvlieland.nl` → `hallo@`; wrapper; `getPortalBaseUrl` |
| customer_link_resend (inline) | ok | Houden (wrapper) |
| chat_reply_visitor | fout | Template-onderwerp overschrijft het referentie-onderwerp uit de code; fallback tutoyeert |
| quote_offer_customer | verouderd | Dubbele "Programmadetails" (dialoog + template); noem akkoord én ondertekenen; referentie in onderwerp |
| quote_accepted_customer (inline) | verouderd (dubbel) | Samenvoegen met booking_confirmed_customer (zelfde klik sinds fase 4); voorwaardenlink; wrapper |
| customer_terms_request + _t14/_t7/_t3 (inline) | ok | Houden; Reply-To toevoegen in check-pending-items `sendReminderEmail`; knopkleur |
| booking_confirmed_customer | verouderd | "Alle activiteiten definitief" vs onder voorbehoud; `reservation_notice` in template; fallback je-vorm; samen met quote_accepted |
| status_confirmed | verouderd | "Aan zet: Klant" zonder te zeggen wat; "partner" → "aanbieder"; dubbel met counter_proposal_response |
| status_alternative | cosmetisch | Referentie, "aanbieder" |
| status_unavailable | cosmetisch | "Neem contact op" vs "Aan zet: Bureau" |
| counter_proposal_response | fout (dubbel) | Samenvoegen met status_*: nu twee mails per partnerreactie (geen `else`, r. 485/730) |
| item_added_customer_approval | ok | Houden |
| item_changes_customer | cosmetisch | Knop i.p.v. kale URL; melden dat aanbieders zijn geïnformeerd (klantpad); fallback je-vorm |
| date_change_customer | fout | `has_accommodation` nooit geleverd; claimt melding aan alle aanbieders ook als notify faalde/bureau-items; onderwerp "bevestigd" te stellig; geen Reply-To |
| guest_details_reminder | cosmetisch | Vreemde zin; Reply-To; referentie |
| arrival_reminder | cosmetisch | "kaartjes" → "kaarten"; Reply-To; referentie in onderwerp |
| customer_aftersales_review | ok | Houden |
| customer_review_google_reminder | ok | Houden |
| reference_case_approval | ok | Houden |
| accommodation_quote_notification | verouderd | "U ontvangt automatisch bericht bij nieuwe offertes" klopt niet (handmatig doorsturen); toon data/gasten |
| accommodation_selected_customer | fout | "€ € …" dubbel euroteken; klant: "accommodatie neemt contact op" vs partner: "bureau neemt contact op"; voorwaardenblok landt buiten de kaart; fallback je-vorm |
| accommodation_headcount_confirmed_customer (inline) | cosmetisch | "Geachte" → "Beste" |
| cancellation_customer | fout | Claimt automatische partnermelding ook bij admin-annulering zonder notify; link naar wizard i.p.v. `/programma-op-maat` |
| partner_customer_message (inline) | cosmetisch | Belofte "komt automatisch terecht bij accommodatie" verifiëren; wrapper |
| inbound_reply_to_customer | cosmetisch | Dubbele kop/voet onder wrapper; stijve zin |
| bureau_invoice_to_customer (inline) | cosmetisch | "reply" → Nederlands; wrapper |
| ticket_to_customer (inline) | ok | Houden |
| wedding_referral_customer / event_referral_customer | ok | Houden |
| sales_followup_offer_3d / _7d | ongebruikt | Schrappen (overlap AI-intentie + terms-mail) |
| sales_pre_signing | ongebruikt | Samenvoegen met customer_terms_request of schrappen |
| sales_post_signing_welcome | ongebruikt, verouderd | Schrappen (10 dagen/bootgegevens klopt niet) |
| presales_intake_followup / _clarification / _proposal_intro | ongebruikt | Schrappen of als snippets in SendProjectEmailSheet |
| presales_partner_question | ongebruikt (partner) | Schrappen; doorgeven aan partneraudit |

Zwaarste punten in volgorde: (1) twee bevestigingsmails bij één klik "Akkoord en ondertekenen" (`booking_confirmed_customer` + `quote_accepted_customer`), (2) twee mails per partnerreactie op een tegenvoorstel, (3) tegenstrijdige contactbelofte logies klant/partner plus dubbel euroteken, (4) onjuiste claims in `cancellation_customer` en `date_change_customer`, (5) verkeerd adres in `program_draft_link` en verkeerde termijn in `catering_request_customer`, (6) `program_request_customer` nooit aangepast aan het ene aanvraagformulier.

## Niet onderzocht

- `WeddingReferralDialog.tsx`: of alle template-variabelen (`voornaam`, `trouwdatum`/`datum`, `aantal_gasten`, `partner_email`) daar worden gevuld.
- `inbound-email`: of een antwoord van de **klant** op `partner_customer_message` ook aan de logiespartner wordt doorgezet (de klantmail belooft dat). Alleen de richting partner → klant (`notifyCustomer`) is gecontroleerd.
- Of na een geaccepteerd tegenvoorstel (`counter_proposal_response`, status `confirmed`) de klant in het portaal werkelijk nog iets moet bevestigen (`action_text` zegt van wel).
- De feitelijke juistheid van de bootinstructies in `arrival_reminder` (Harlingen, 30 minuten, groepsticket aan de balie) en de "drank op nacalculatie"-toezegging in `catering_request_customer`: niet in docs.
- `send-project-email` / `compose-followup-email` (vrije projectmail, `admin_project_email`): buiten de lijst; alleen vastgesteld dat ze geen DB-templates laden.
- Exacte tijden van de cron-jobs (alleen in productie) en of `check-pending-items` nog twee keer per dag draait (inventaris): niet uit de repo af te leiden; raakt alleen dubbele herinneringen, die door de 2-dagen-regel in `pickTermsMail` voor de terms-mails zijn afgedekt.
- Rendering in e-mailclients (bijv. of `<ul>` in `changes_summary` binnen de template netjes valt): niet getest.

# Deel B — Partners


Stand `main`, 21 november 2026. Bronnen: `email_templates`-export (scratchpad/templates.txt), `supabase/functions/*`, `src/App.tsx` (routes), docs/plan-inkoopfacturen-via-inbox.md, docs/plan-afhandeling-onderdelen.md, docs/plan-logies-aantalwijziging.md, docs/plan-logieskeuze.md, docs/plan-commissiefacturen.md, docs/plan-bruiloftsdoorverwijzingen.md, docs/plan-klantreis-en-ondertekening.md, docs/factuur-aan-de-gast.md, docs/plan-notificaties.md.

**Toon-norm (vastgesteld):** alle 25 DB-templates aan partners tutoyeren in de lopende tekst ("je/jouw"), behalve `chat_reply_visitor` ("U heeft"). Aanhef: "Hoi {{partner_name}}" in 17, "Beste" in 6 (chat_reply_visitor, quote_expired_partner, partner_intro_portal, partner_invitation, proforma_commission_notification, counter_proposal_partner), "Hallo" in 1, geen aanhef in 1 (accommodation_selected_partner). De norm is dus "Hoi … je"; de inline mails die "Beste … u" zeggen (aantalwijziging, headcount-beoordeling, intrekking, commissiefactuur, admin-reset) wijken af. Alle partnerlinks gaan naar `/partner/login` of een diepere `/partner/...`-route; die bestaan allemaal (`src/App.tsx:259-277`) behalve waar hieronder anders staat.

**Rode draad A (facturatie):** de geldende werkwijze is "mail de pdf naar invoices@reply.bureauvlieland.nl met onze BV-referentie erop; wij factureren centraal aan de klant" (plan-inkoopfacturen-via-inbox.md, fase 1 gebouwd 17 nov). Alles met "upload in het portaal", "Factuur registreren", "PDF toevoegen" of `inkoop@` is verouderd. Zes partnermails zeggen dat nog (zie tabel).

**Rode draad A (drie soorten onderdelen):** alleen `send-items-to-partners` kent `partner_handling` (bevestiging/mededeling) en `billing_route`. De DB-template `program_request_partner` (gebruikt door `approve-quote-item`), `accept-quote-proposal`, `send-partner-headsup-t3`, de factuurherinneringen T+3/T+7 en `reminder_activity_pending` behandelen elk onderdeel als offerte-onderdeel met bureaufactuur.

---

## program_request_partner — Aanvraag aan partner (zes varianten)

### 1a. send-items-to-partners (inline, admin "Verstuur naar partners") en "Herinnering"-variant
- Ontvanger: partner (`provider_email` of `contact_email`/`email`). Verzonden door `send-items-to-partners/index.ts` (`generatePartnerNotificationEmail`, regel 72-154). Bron: **inline HTML**, de DB-template `program_request_partner` wordt hier NIET gebruikt. Force-mode op al verzonden items = herinnering (`:437-449`).
- A: (1) Facturatie-alinea `:140`: "Stuur jouw factuur na uitvoering naar invoices@… **(of upload in het partnerportaal)**" — upload bestaat niet meer (plan §3.1/§6: "Een uploadknop in het portaal … bewust niet"). Ook ontbreekt "met onze referentie erop", wat de kern van de route is. (2) Kop en intro `:103-109` "Aanvraag bevestigd door klant … de klant heeft akkoord gegeven op het programmavoorstel" staan vast, ook als de admin met `override_reason` verstuurt vóór ondertekening (klantreis fase 4, `:168-175, :556-563`). Dan is de zin onwaar. (3) Bevestiging/mededeling worden netjes aangegeven per onderdeel (`:80-85`, conform plan-afhandeling-onderdelen) en de facturatie-alinea valt weg als geen onderdeel op de bureaufactuur landt — ok. Maar `partnerBillingNote` (`_shared/itemHandling.ts:107-112`) zegt "op **uw** eigen verblijfsnota … **U** hoeft niets in te dienen" in een mail die verder "je/jouw" zegt.
- B: knop → `${baseUrl}/partner/login` (`:441`), bestaat; geen deeplink naar het project terwijl `/partner/project/:id` bestaat. Reply-To via `buildReplyTo(reference)` ok. `mailto:invoices@…` ok.
- C: n.v.t. (inline). Let op: `email_log.metadata.template_name = program_request_partner` suggereert de DB-template, maar die wordt niet gerenderd.
- D: geen `wrapEmailHtml` → geen logo/voettekst (huisstijl ontbreekt; alle andere recente mails hebben hem). Aanhef "Hoi {bedrijfsnaam}" (`provider_name`, niet de contactpersoon). Onderwerp "Nieuwe aanvraag via Bureau Vlieland — BV-…" terwijl de kop "Aanvraag bevestigd door klant" zegt. Herinnering: onderwerp "Herinnering: aanvraag via Bureau Vlieland — BV-…" zonder onderdeelnaam.
- E: inhoudelijk dezelfde mail als 1c (`accept-quote-proposal`) en de DB-template van 1b; drie teksten voor één moment. De herinnering overlapt met `reminder_activity_pending` (cron na 3 dagen) — admin kan handmatig een tweede herinnering sturen op dezelfde dag.
- F: **Tekst aanpassen**: "(of upload…)" weg, "met onze referentie erop" erbij, intro afhankelijk maken van `terms_accepted_at`/override, `partnerBillingNote` tutoyeren, `wrapEmailHtml` gebruiken. Daarna 1b en 1c hierop laten leunen (zie E).

### 1b. approve-quote-item — DB-template `program_request_partner` (klant keurt item goed → auto-send)
- Ontvanger: partner. Verzonden door `approve-quote-item/index.ts:451-484` (per item). Bron: DB-template "Programma aanvraag (Partner)", bijgewerkt 2026-05-28; fallback `generatePartnerNotificationEmailFallback` `:55-98`.
- A: (1) Template: "Stuur jouw factuur na uitvoering naar **inkoop@reply.bureauvlieland.nl**" — oud alias, geen referentie genoemd. (2) Template vraagt altijd "bevestig de aanvraag via je partnerportaal" en toont altijd de facturatie-alinea; `partner_handling`/`billing_route` worden niet meegegeven → een mededeling of een onderdeel op de verblijfsnota krijgt een verzoek om te bevestigen en te factureren. (3) **Fallback** (`:68-77`) stuurt klantnaam, e-mail en telefoon mee en zegt "Dit is een vrijblijvende aanvraag" en "Beheer deze aanvraag in **uw** Partner Portal" — strijdig met "wij staan tussen jou en de klant in" en met de status (klant heeft al akkoord gegeven).
- B: `portal_url` = `/partner/login` ok. `mailto:inkoop@` → verouderd adres (werkt als alias, maar plan noemt alleen invoices@).
- C: template-variabelen `partner_name, customer_name, customer_company, block_name, dates, number_of_people, effective_time, portal_url` worden alle gevuld (`:451-462`); `preferred_time`, `customer_email`, `customer_phone` worden meegegeven maar niet gebruikt (ok). Onderwerp "Aanvraag bevestigd door klant — {{block_name}}" heeft **geen referentienummer** (code geeft `reference_number` niet mee).
- D: template tutoyeert, huisstijl via `getRenderedTemplate` ok. Fallback: "Beste", "uw", kleur `#1a365d`, emoji-koppen, geen wrapper.
- E: zie 1a.
- F: **Tekst aanpassen** (template: inkoop@ → invoices@ + referentie; `reference_number` in onderwerp; `{{#if}}`-blok voor bevestiging/mededeling). Fallback gelijktrekken of weghalen.

### 1c. accept-quote-proposal — admin-pad na klantakkoord (inline)
- Ontvanger: partner. Verzonden door `accept-quote-proposal/index.ts:587-630` (aanroep uit `AdminRequestDetail.tsx:1291` en klantportaal `useCustomerProgram.ts:947`). Bron: inline `generatePartnerNotificationEmail` `:121-186` (kopie van 1a, oudere versie).
- A: `:175` "(of upload in het partnerportaal)" verouderd. Geen `partner_handling`-logica: elk onderdeel "bevestigen", altijd facturatie-alinea (anders dan 1a `:97-99`).
- B: `/partner/login` ok; `mailto:invoices@` ok.
- C: n.v.t.
- D: geen wrapper; verder gelijk aan 1a.
- E: duplicaat van 1a.
- F: **Samenvoegen met 1a**: één gedeelde generator in `_shared/` of `send-items-to-partners` aanroepen; nu lopen twee kopieën uit elkaar.

### 1d. approve-quote-item — re-approval ("program_partner_reapproval", inline)
- Ontvanger: partner. Verzonden door `approve-quote-item/index.ts:343-385` als de klant definitief akkoord geeft op het aangepaste voorstel van de partner. Bron: inline.
- A: inhoud klopt (geen actie als al bevestigd; anders bevestigen).
- B: `/partner/login` ok.
- C: n.v.t.
- D: onderwerp "Klant akkoord op **uw** voorstel" en kop "Klant geeft akkoord op **uw** voorstel", maar tekst "Hoi …, je aangepaste voorstel" (`:343-349`). Geen wrapper, kleur `#1a365d`. Prijsregel toont `quoted_price` zonder "excl./incl." (`:336`).
- E: ok.
- F: **Tekst aanpassen** (uw → je in onderwerp/kop, wrapper).

### 1e. notify-partners-informational (inline, "Bevestiging boeking via Bureau Vlieland")
- Ontvanger: partner. Verzonden door `notify-partners-informational/index.ts:100-128`. Bron: inline. **Geen aanroeper in `src/`** (alleen `edgeFunctionTestCoverage.ts`).
- A: tekst "een boeking die eerder rechtstreeks met jullie is afgestemd … reeds bevestigd" is precies de "mededeling"-variant uit plan-afhandeling-onderdelen; die wordt nu door 1a gedekt ("Ter kennisgeving, je hoeft hier niets mee te doen"). Mail noemt geen klantnaam.
- B: `/partner/login` ok; `mailto:hallo@` ok.
- C: n.v.t.
- D: "Beste {bedrijfsnaam}", emoji-koppen, `#1a365d`, geen wrapper.
- E: overlapt volledig met de inform-variant van 1a.
- F: **Schrappen** (dode functie; 1a dekt het).

### 1f. notify-date-change — `template_name: date_change_partner` (inline) en `date_change_accommodation_partner`
- Ontvanger: activiteitenpartner (`:284-333`) en gekozen logiespartner (`:460-500`). Verzonden door `notify-date-change/index.ts` (admin-dialoog `NotifyDateChangeDialog` en klant via `update-customer-program:538`). Bron: inline.
- A: Activiteit: reset naar `pending` + "je eerdere bevestiging vervalt … opnieuw bevestigen" klopt met de code (`:240-262`). Logies `:463-467`: "Wil je controleren of je op de nieuwe data nog beschikbaar bent en **je offerte indien nodig aanpassen** in het partnerportaal?" — de offerte heeft status `selected` (`:437`) en wordt niet gereset (geen update op `accommodation_quotes`, alleen de select op `:431`). Per plan-logies-aantalwijziging kan de partner bij `selected` niets aanpassen; voor datumwijzigingen is de reset-route (nieuwe offerte, `AdminAccommodationDetail`) bedoeld. De mail vraagt dus iets wat de partner niet kan.
- B: `/partner/login` ok; voor logies bestaat `/partner/logies/:id`, niet gebruikt. Reply-To op BV-/LOG-referentie ok.
- C: n.v.t.
- D: "Hoi/je" ok; geen wrapper; `#1a365d`.
- E: voor logies overlapt dit met de admin-flow die bij een reset `send-accommodation-quote-request` stuurt ("Wijziging aantal gasten"); bij een datumwijziging mét reset krijgt de partner twee mails.
- F: **Tekst aanpassen** (logiesvariant: óf resetten en om nieuwe offerte vragen, óf alleen informeren; wrapper).

### 1g. notify-headcount-change-bulk — `headcount_change_partner_bulk` (inline) en `headcount_change_accommodation_partner` (lodging-mail.ts)
- Ontvanger: partners van goedgekeurde onderdelen (`:170-335`) en gekozen logiespartner (`:338-437`). Bron: inline / `notify-headcount-change-bulk/lodging-mail.ts`.
- A: Activiteiten: "prijs per persoon blijft staan; alleen het totaal beweegt mee … U hoeft niets te doen" klopt. "Nieuw totaal" wordt berekend uit `admin_price_override` (`:258-265`); dat is de prijs die het bureau op het onderdeel zet, niet per se wat de partner offreerde (`quoted_price`). Niet vastgesteld of die altijd gelijk zijn — zie "Niet onderzocht". Logies: tekst volgt plan-logies-aantalwijziging exact (bevestigen via "Nieuw aantal bevestigen", geen nieuwe offerte) — ok.
- B: `/partner/login` (activiteit) en `/partner/logies/:id?actie=aantal` (logies) bestaan. Reply-To ok.
- C: n.v.t.
- D: **beide varianten vousvoyeren** ("Beste …, De met u afgesproken prijs … U hoeft", `:275-281`; lodging-mail.ts:42-48) terwijl `notify-partner-headcount-change` voor hetzelfde moment "Hoi … jou … Je hoeft" zegt. Geen wrapper, `#1a365d`.
- E: `notify-partner-headcount-change` (per item, `AdminRequestDetail.tsx:2757`) en deze bulk-variant sturen bij dezelfde aantalwijziging vrijwel dezelfde mail; beide zijn vanuit de admin te starten.
- F: **Samenvoegen met notify-partner-headcount-change** (één tekst, tutoyeren, wrapper).

### 1h. notify-partner-headcount-change — `partner_headcount_change` (inline)
- Ontvanger: partner van één item. Verzonden door `notify-partner-headcount-change/index.ts:183-250`. Bron: inline.
- A: ok (herberekening p.p.-items, ter info). Alleen p.p.-items (`:94-99`).
- B: `/partner/login` ok.
- C: n.v.t.
- D: "Hoi/je" ok; geen wrapper; `#1a365d`.
- E: zie 1g.
- F: **Samenvoegen met 1g**.

---

## reminder_activity_pending — Herinnering activiteit open
- Ontvanger: partner. Verzonden door `check-pending-items/index.ts:308-337` (cron, item `pending` ouder dan 3 dagen, `DEFAULT_REMINDER_DAYS_PARTNER_ACTIVITY = 3`, herhaling elke 7 dagen). Bron: DB-template, bijgewerkt 2026-05-27; fallback `:323-328`.
- A: "Wij hebben {{days_since}} dagen geleden een aanvraag aan je verstuurd" — `days_since` is `created_at` van het item (`:288-290`), niet het moment van versturen aan de partner (`status_updated_at`/`skip_partner_notification=false`). Items worden vaak weken eerder aangemaakt in de werkbank → getal te hoog. Query filtert niet op `skip_partner_notification`/`customer_approved_at` (`:226-245`; vergelijk de T-7-check `:1265-1274` die dat wél doet) → items die nog nooit naar de partner zijn gegaan krijgen "we hebben nog geen reactie van je". "Bevestiging"-onderdelen krijgen dezelfde tekst ("beschikbaar bent, een alternatief voorstel doen") — plan-afhandeling-onderdelen accepteert dat bewust.
- B: `{{portal_url}}` = `/partner/project/:id` bestaat, gevuld (`:310`).
- C: alle vijf variabelen gevuld. Onderwerp zonder referentienummer.
- D: template "Hoi/je" ok, wrapper via renderer ok. Fallback: "Beste … u/uw", blauwe knop `#2563eb`.
- E: overlapt met de handmatige herinnering uit 1a (zelfde boodschap) en, 7 dagen vóór uitvoering, met `partner_activity_unconfirmed_t7`.
- F: **Tekst aanpassen** (days_since op verzendmoment; filter op verzonden items; referentie in onderwerp).

## partner_activity_unconfirmed_t7 — Reactie nodig, uitvoering over 7 dagen
- Ontvanger: partner. Verzonden door `check-pending-items/index.ts:1310-1335` (status `pending`, precies 7 dagen vooruit, alleen verzonden + klantgoedgekeurde items). Bron: DB-template 2026-05-27.
- A: ok.
- B: `/partner/project/:id` ok.
- C: alle variabelen gevuld.
- D: ok ("Hoi/je", wrapper). Onderwerp zonder referentie.
- E: kan op dezelfde dag vallen als `reminder_activity_pending` (andere `email_type`, dus geen dedupe).
- F: **Houden**.

## partner_headsup_t3 — Heads-up 3 dagen vooraf (inline) vs. DB-template partner_briefing_t3 (ongebruikt)
- Ontvanger: partner. Verzonden door `send-partner-headsup-t3/index.ts:214-300` (cron). Bron: inline; `getRenderedTemplate` wordt niet aangeroepen, de DB-template `partner_briefing_t3` (2026-05-27) is dood.
- A: (1) `:292`: "Je factureert Bureau Vlieland (niet de klant) en **uploadt je factuur via de knop 'Factuur registreren'** in het partnerportaal" — verouderd; moet "mail de pdf naar invoices@… met referentie BV-… erop". (2) Selectie `.eq("status","accepted")` (`:119`): `accepted` wordt alleen gezet door `update-customer-program:822` bij per-item klantakkoord; een door de partner bevestigd item houdt `confirmed` (`update-partner-item-status:348`). Items die alleen `confirmed` zijn krijgen dus geen heads-up. (3) `admin_price_notes` (`:271-277`) gaat als "Toelichting" naar de partner — dat veld heet in de admin prijsnotitie; of dat partner-geschikt is, is niet vastgesteld. (4) Geen `partner_handling`-check: een mededeling (bijv. reservering op verblijfsnota) krijgt een briefing met facturatie-alinea.
- B: `/partner/login` ok.
- C: n.v.t. DB-template heeft `time_info`, `number_of_people` etc. maar wordt niet gebruikt.
- D: geen aanhef ("Hoi …" ontbreekt), geen wrapper; kleuren wel huisstijl.
- E: DB-template `partner_briefing_t3` zegt hetzelfde korter. plan-notificaties 2.2 noemt 0% geopend bij 6.
- F: **Tekst aanpassen** (facturatiezin) en **DB-template `partner_briefing_t3` schrappen** of de functie erop laten renderen; status-filter nalopen.

## booking_confirmed_partner — Definitieve boeking (klant tekent)
- Ontvanger: partners met `confirmed` items. Verzonden door `update-customer-program/index.ts:1429-1489` bij `acceptTerms`. Bron: DB-template 2026-05-28; fallback `:1441-1463`.
- A: Template: "**upload de factuur in je partnerportaal of** mail de PDF naar **inkoop@reply.bureauvlieland.nl**" — twee verouderingen in één zin. Fallback `:1456-1457` idem met invoices@. Alleen `confirmed` items (`:1388-1392`), dus partners van `accepted`/`executed` items niet — niet getoetst of dat bewust is. "Het onderdeel staat hiermee vast" (enkelvoud) bij meerdere onderdelen.
- B: `{{portal_url}}` = `https://bureauvlieland.nl/partner` (hardcoded `:1436`; route redirect → login, bestaat). `mailto:inkoop@` verouderd.
- C: `billing_details` wordt gevuld maar niet gebruikt (goed, privacy). Alle template-variabelen gevuld.
- D: "Hoi/je" ok, wrapper ok. Onderwerp "Definitieve boeking — {{customer_name}}" zonder referentie.
- E: ok.
- F: **Tekst aanpassen** (facturatiezin; referentie in onderwerp).

## item_added_partner — Nieuw onderdeel toegevoegd door klant
- Ontvanger: partner. Verzonden door `update-customer-program/index.ts:1679-1750`. Bron: DB-template 2026-08-17; fallback `:1695-1725`.
- A: Template vraagt "beoordelen … en bevestigen of afwijzen" — ok voor offerte-onderdelen; klant-toegevoegde onderdelen zijn altijd offerte. Fallback: "Reageer via de Partner Portal **of neem direct contact op met de klant**" + klant-e-mail/telefoon — strijdig met de tussenpositie.
- B: template heeft **geen link** (LINKS leeg) terwijl hij "via het partnerportaal" vraagt.
- C: **Dubbel label**: code geeft `preferred_time` als `<p><strong>Voorkeurstijd:</strong> 10:00</p>` (`:1676`) en `notes` als `<p><strong>Opmerking:</strong> …</p>`; template zet er zelf "Voorkeurstijd: {{preferred_time}}" en "Opmerking: {{notes}}" voor → "Voorkeurstijd: Voorkeurstijd: 10:00". Typo in template: "partnerportaa".
- D: "Hoi/je" ok. Onderwerp zonder referentie.
- E: ok.
- F: **Tekst aanpassen** (platte waarden meegeven of template-labels weghalen; typo; knop toevoegen).

## item_changes_partner — Programmawijzigingen (twee aanroepers)
- Ontvanger: partner. Verzonden door `publish-program-changes/index.ts:893-932` (admin publiceert) en `update-customer-program/index.ts:1870-1935` (klant wijzigt). Bron: DB-template 2026-05-27.
- A: Template: "De klant {{customer_name}} heeft wijzigingen doorgevoerd" — bij `publish-program-changes` is de **admin** de actor (metadata "admin → partner (gebundelde publicatie)"), dus de zin is daar onjuist. "Bevestig de wijziging via het partnerportaal" zonder link.
- B: geen link in template. `publish-program-changes` doet `if (!rendered) continue;` (`:906`): staat de template uit, dan gaat er stilzwijgend niets.
- C: `publish-program-changes` geeft `partner.name`, `customer_name` **ongesanitized** mee (`:894-895`; HTML-injectie via klantnaam). `update-customer-program` vult alles. Onderwerp "Wijziging in aanvraag — {{customer_name}} — {{selected_dates}}" zonder referentie.
- D: Template "Hoi/je"; `update-customer-program:1858` plakt "**Uw** eerdere voorstel (…) vervalt" in `changes_list`. Fallback in `update-customer-program` deelt klant-e-mail/telefoon en zegt "neem direct contact op met de klant".
- E: ok (plan-notificaties wil bundelen per dag).
- F: **Tekst aanpassen** (actor-neutraal formuleren of variabele `actor_line`; link; uw → je; sanitizen).

## counter_proposal_partner — Tegenvoorstel van klant
- Ontvanger: partner. Verzonden door `update-customer-program/index.ts:1049-1110`. Bron: DB-template 2026-01-29 (oudste partnertemplate).
- A: ok.
- B: `{{partner_portal_link}}` hardcoded `https://bureauvlieland.nl/partner/login` (`:1046`) — bestaat; negeert `origin` (lokaal). Geen Reply-To gezet op dit bericht (`:1083-1088`, anders dan de andere mails in dit bestand).
- C: alle variabelen gevuld; `provider_name` i.p.v. `partner_name` (afwijkende naam, werkt).
- D: "**Beste** {{provider_name}}" + "Jouw voorstel" (mix), "Partner Portal" (Engels), eigen kop "Bureau Vlieland" bovenin terwijl de wrapper al een logo zet. Onderwerp zonder referentie.
- E: ok.
- F: **Tekst aanpassen** (Hoi, partnerportaal, dubbele kop weg, Reply-To).

## item_cancelled_partner — Onderdeel geannuleerd door klant
- Ontvanger: partner. Verzonden door `update-customer-program/index.ts:928-975`. Bron: DB-template 2026-05-27.
- A: ok. `cancellation_reason` is altijd de vaste zin "Geannuleerd door de klant via het klantportaal." (`:934`).
- B: geen link, ok (geen actie).
- C: alle variabelen gevuld; `reference_number` wél in onderwerp — goed.
- D: ok. Geen Reply-To gezet (`:949-953`).
- E: zegt hetzelfde als `partner_item_cancellation` (hieronder), andere trigger.
- F: **Houden**; `partner_item_cancellation` hierop laten renderen.

## partner_item_cancellation — Onderdeel vervalt (admin verwijdert) (inline)
- Ontvanger: partner. Verzonden door `notify-partner-item-deletion/index.ts:50-62`. Bron: inline. **Geen aanroeper in `src/`.**
- A: grammatica `:54`: "de volgende onderde**el** … **is komen te vervallen**" → "komt te vervallen". Geen klantnaam, geen datum.
- B: geen link; Reply-To ok.
- C: n.v.t.
- D: "Beste … je" (mix), geen wrapper.
- E: duplicaat van `item_cancelled_partner`.
- F: **Samenvoegen met item_cancelled_partner** (template renderen met `cancellation_reason` "Verwijderd door Bureau Vlieland") of schrappen als de functie echt ongebruikt is.

## cancellation_partner — Aanvraag geannuleerd (project)
- Ontvanger: benaderde partners (`itemWasSentToPartner`). Verzonden door `notify-partner-cancellation/index.ts:155-233` (admin en via `cancel-program-request:306`). Bron: DB-template 2026-05-18.
- A: ok. plan-notificaties wil alleen sturen als het onderdeel `confirmed`/`accepted` was; nu krijgen ook partners met een open `pending`-aanvraag de mail (dat is een beleidskeuze, geen fout).
- B: `portalLinkBlock` (`:191-201`) wordt **achter** de al gewrapte template geplakt (`${baseBody}${portalLinkBlock}` `:201`): de knop "Bekijk in je partnerportal" komt ná `</html>` terecht, buiten de huisstijl. Link `/partner/dashboard?tab=projecten&q=BV-…` → redirect naar `/partner/projecten?q=…` (bestaat, query blijft; `PartnerDashboard.tsx:171-178`).
- C: `customer_name` wordt leeg meegegeven (`:157`) → `{{#if customer_name}}` valt weg, ok. Onderwerp met referentie ok.
- D: template ok; "partnerportal" (zonder -aal) in de losse knop.
- E: ok.
- F: **Tekst aanpassen** (knop in de template zetten als `{{portal_url}}` i.p.v. erachter plakken).

## cancellation_accommodation_partner — Logiesaanvraag geannuleerd
- Ontvanger: logiespartners met offerte op de gekoppelde aanvraag. Verzonden door `notify-partner-cancellation/index.ts:300-370`. Bron: **inline**; de DB-template `cancellation_accommodation_partner` (2026-05-18) wordt door geen enkele functie gerenderd (grep: alleen als `email_type`).
- A: Tekst klopt inhoudelijk (geselecteerd → boeking vervalt; anders → reactie niet meer nodig). `periodLine` (`:300-302`) toont rauwe ISO-datums ("2026-05-03") i.p.v. `formatDateNL`.
- B: `/partner/dashboard?tab=projecten&q=LOG-…` ok. Reply-To op BV-ref i.p.v. LOG-ref (werkt, `inbound-email` kent beide).
- C: DB-template-variabelen (`dates`, `accommodation_name`, …) worden nergens gevuld omdat de template niet gebruikt wordt.
- D: "Beste … je" + "**Uw** offerte was reeds geselecteerd" (`:323-324`), geen wrapper, "partnerportal".
- E: ok.
- F: **Tekst aanpassen**: de DB-template renderen (die is al "Hoi/je" en gewrapt) en de inline HTML weghalen; datums formatteren.

## accommodation_quote_request_partner — Logiesofferte gevraagd (drie bronnen)
- (a) `send-accommodation-quote-request/index.ts:205-212`: tekst komt uit de admin-dialoog (`SendAccommodationQuoteRequestDialog.tsx:91-108`), eigen wrapper `wrapInEmailTemplate` `:43-80`. (b) `notify-date-change` logiesvariant (zie 1f). (c) `notify-headcount-change-bulk` logiesvariant (zie 1g). Plus `AdminAccommodationDetail.tsx:542-543` dat via (a) "Wij vragen u vriendelijk een aangepaste offerte in te dienen" stuurt bij de reset-route.
- A: (a) default-tekst ok ("offerte indienen via het partnerportaal, binnen 5 werkdagen"); de offerte krijgt `valid_until` +14 dagen (`:169,196`) — niet genoemd. Knopblok `:60-63` "Je vindt de aanvraag onder 'Logies aanvragen'" — tab heet "Logiesaanvragen" (`PartnerAccommodation.tsx:405`). Markdown-bullets "- " worden niet omgezet (`markdownToHtml` `:37-41` kent alleen `**` en `\n`).
- B: knop → `${portalBaseUrl}/partner` (redirect → login) ok. **Geen Reply-To** op de LOG-referentie (`:207-212`); antwoorden van de partner komen niet in het dossier.
- C: n.v.t.
- D: Eigen groene gradient-header `#0f766e` i.p.v. `wrapEmailHtml`; voettekst "Bureau Vlieland - Je partner voor Vlieland evenementen" (slogan nergens anders). Default-tekst "Beste partner, … jullie" (meervoud) terwijl de rest "je" zegt. Onderwerp zonder LOG-referentie.
- E: ok.
- F: **Tekst aanpassen** (wrapper, Reply-To, tabnaam, referentie in onderwerp); de reset-tekst in `AdminAccommodationDetail.tsx:543` tutoyeren.

## reminder_quote_pending — Herinnering logiesofferte
- Ontvanger: logiespartner. Verzonden door `check-pending-items/index.ts:419-453` (cron, 5 dagen, elke 7 dagen). Bron: DB-template 2026-05-27.
- A: ok. `days_since` telt vanaf `quote.updated_at` (`:401-403`); elke tussentijdse update (bijv. admin wijzigt iets) zet de teller terug — klein risico.
- B: `/partner/logies/:id` ok.
- C: alle variabelen gevuld.
- D: ok. Fallback "Beste/u".
- E: ok.
- F: **Houden**.

## reminder_headcount_pending — Herinnering nieuw aantal bevestigen
- Ontvanger: gekozen logiespartner. Verzonden door `check-pending-items/index.ts:547-585`. Bron: **geen DB-template** (id bestaat niet in de export) → altijd de fallback `:566-571`, gewrapt.
- A: tekst volgt plan-logies-aantalwijziging — ok.
- B: `/partner/logies/:id?actie=aantal` ok.
- C: variabelen (incl. `previous_number_of_guests`) worden klaargezet maar er is geen template om ze in te vullen.
- D: fallback "Beste … u/uw" (de andere herinneringen tutoyeren); blauwe knop `#2563eb`.
- E: ok.
- F: **Tekst aanpassen**: DB-template aanmaken in de toon van `reminder_quote_pending`.

## quote_expired_partner — Logiesofferte verlopen
- Ontvanger: logiespartner (`partner.email`, niet `contact_email`, `:751,793`). Verzonden door `check-pending-items/index.ts:811-868`. Bron: DB-template 2026-05-01.
- A: **De mail gaat nooit weg.** In de lus staat `const req = quote.request as any;` (`:790`) dat de `Request` `req` overschaduwt; `:838-839` roepen `req.headers.get("origin")` aan → `TypeError`, gevangen door de `catch` (`:866`) → log "Error sending expired quote email", geen `email_log`-rij. De offerte is dan al op `expired` gezet (`:780-783`) en de werkbank-taak zegt "De partner heeft een notificatie ontvangen" (`:889`). plan-notificaties 2.2 telt 0 verzendingen in 180 dagen; dit is de oorzaak.
- B: `/partner/logies/:id` ok.
- C: alle vijf variabelen gevuld.
- D: "**Beste** … Je offerte" (mix); onderwerp "**Uw** logiesofferte … is verlopen". "Je kunt de geldigheid verlengen via je partnerportaal" — niet vastgesteld of een `expired` offerte in het portaal te verlengen is (zie Niet onderzocht).
- E: ok.
- F: **Fout herstellen** (variabele hernoemen), daarna tekst (uw/je) gelijktrekken.

## accommodation_quote_withdrawn — Offerteaanvraag ingetrokken (inline)
- Ontvanger: logiespartner. Verzonden door `withdraw-accommodation-quote/index.ts:68-116` (admin, optioneel). Bron: inline.
- A: ok (alleen `pending`-offertes).
- B: geen link, ok; Reply-To op LOG ok.
- C: n.v.t. `partner.name` niet gesanitized (`:74`).
- D: "Beste … u", geen wrapper, geen klantnaam of referentie in de tekst (wel in onderwerp). Status wordt als "sent" gelogd zonder de Mailjet-response te controleren (`:85-110`).
- E: ok.
- F: **Tekst aanpassen** (Hoi/je, wrapper).

## accommodation_selected_partner — Offerte gekozen
- Ontvanger: logiespartner. Verzonden door `select-accommodation-quote/index.ts:403-530`. Bron: DB-template 2026-05-13.
- A: "**Facturatie**: Factureer het verblijf aan Bureau Vlieland. **Je ontvangt hierover apart bericht via het partnerportaal.**" — er komt geen apart bericht; de werkwijze is: na het verblijf de pdf mailen naar invoices@ met de LOG-/BV-referentie (plan §3.6). Bij `billed_to = customer`/`excluded_fees = accommodation` (factuur-aan-de-gast.md) klopt "Factureer aan Bureau Vlieland" niet; de code kent die uitzondering hier niet. Verder "Je offerte … is geaccepteerd door Bureau Vlieland" terwijl de klant koos (klein).
- B: `{{partner_portal_link}}` = `/partner/logies/:id` ok.
- C: Template gebruikt `guest_name` en `extras_list` die niet in VARIABELEN staan maar wél gevuld worden (`:403-418`); `customer_name/company_name/customer_email/customer_phone` worden gevuld met bureaugegevens (`:423-426`) en niet gebruikt. `extras_list` zet `e.name` ongesanitized in HTML (`:412`). **Geen aanhef**: template begint met "Je offerte is geaccepteerd!" zonder "Hoi {{partner_name}}" (variabele wordt wel gevuld).
- D: onderwerp zonder LOG-referentie; verder ok.
- E: ok.
- F: **Tekst aanpassen** (facturatie-alinea naar de inboxroute met referentie; aanhef; gastbetaald-variant).

## accommodation_rejected_partner — Niet gekozen
- Ontvanger: overige logiespartners. Verzonden door `select-accommodation-quote/index.ts:690-770`. Bron: DB-template 2026-05-01.
- A/B/C: ok (alle variabelen gevuld; geen link nodig).
- D: ok ("Hoi/je"). Onderwerp "Logiesaanvraag — niet gekozen" zonder referentie of klant.
- E: ok.
- F: **Houden** (referentie in onderwerp is een kleinigheid).

## accommodation_headcount_confirmed_partner / _rejected_partner — Nieuw aantal verwerkt / niet overgenomen (inline)
- Ontvanger: gekozen logiespartner. Verzonden door `approve-accommodation-headcount/index.ts:325-370` en `:406-455`. Bron: inline, gewrapt.
- A: volgt plan-logies-aantalwijziging. "Na het verblijf factureert **u** dit bedrag zoals gebruikelijk" (`:336`) — had de kans om de inboxroute te noemen; niet fout.
- B: `/partner/logies/:id` en `?actie=aantal` ok; Reply-To ok.
- C: n.v.t.
- D: "Beste … u/uw" in beide (`:330-336, :410-418`), afwijkend van de norm; wrapper ok; referentie in onderwerp ok.
- E: ok.
- F: **Tekst aanpassen** (tutoyeren).

## partner_invoice_reminder_t1 (feitelijk T+3) en partner_invoice_reminder_t7 — Factuurverzoek / factuur ontbreekt
- Ontvanger: partner. Verzonden door `check-pending-items/index.ts:1017-1052` (T+3) en `:1091-1120` (T+7); herhaling elke 7 dagen. Bron: DB-templates bijgewerkt 2026-11-19 (inboxroute: "Mail de pdf van je factuur naar invoices@…, met onze referentie erop" — goed).
- A: (1) T+3-template: "**Gisteren** is {{block_name}} … uitgevoerd" — de mail gaat na 3 dagen (`:1022, :1012-1013 "Was T+1 — te kort dag"`); fallback zegt al "Een paar dagen geleden". (2) **Partners die al gemaild hebben krijgen toch "factuur ontbreekt".** `hasInvoice` (`:937-949`, `_shared/partner-invoice-presence.ts:64-81`) kijkt alleen naar `partner_purchase_invoices.item_id`, allocaties en `invoiced_number` op het item. Een mail in `purchase_invoice_inbox` (status `new`) telt niet, en een verwerkte inboxfactuur hangt sinds het doorbelasten-plan **aan het project** (`item_id` leeg, plan-inkoopfacturen-via-inbox §3.4) → ook die telt niet, tot het werkblad allocaties schrijft. plan-notificaties 1 "moeten dan wel weten dat een mail in de inbox ook een factuur is" bevestigt dit. (3) Geen filter op `expectsPartnerInvoice` (`executedItems` selecteert `partner_handling`/`billing_route` niet, `:914-918`): een bevestiging op de verblijfsnota of een mededeling krijgt "factuur ontbreekt". (4) "Bedrag (excl. BTW, indicatief)" = `proforma_amount_excl_vat ?? invoiced_amount ?? quoted_price` (`:1030`); `quoted_price` is de offerteprijs van de partner, niet per se excl. btw — label kan misleiden.
- B: `mailto:invoices@` ok; `{{portal_url}}` = `/partner/facturatie` bestaat.
- C: alle zes variabelen gevuld.
- D: ok ("Hoi/je", wrapper, referentie in tekst). Onderwerp zonder BV-nummer (wel klantnaam).
- E: T+3 en T+7 lopen na dag 7 beide wekelijks door (plan-notificaties 3.3 punt 1).
- F: **Tekst aanpassen** ("Gisteren" → "Een paar dagen geleden") en **fout herstellen** (inbox meetellen, project-facturen meetellen, `expectsPartnerInvoice`).

## partner_missing_pdf_reminder — PDF ontbreekt (inline)
- Ontvanger: partner met portaalregistratie zonder pdf. Verzonden door `notify-partners-missing-invoice-pdf/index.ts:130-166` (knop `MissingPdfReminderButton` op `/admin/inkoopfacturen`; `mode: auto` via cron niet in repo). Bron: inline.
- A: Hele premisse is verouderd: "Je hebt … geregistreerd zonder PDF … Log in … **Financieel** → tab **Gefactureerd** → **PDF toevoegen**" (`:158-160`). Registratie is uitgezet (`partner_invoice_registration_enabled` standaard uit) en de functie staat op de schraplijst (plan §3.7). Juiste instructie zou zijn: mail de pdf naar invoices@ met referentie.
- B: **Kapotte link**: `/partner/financieel?missingPdf=1#gefactureerd` (`:57`) — route bestaat niet (wel `/partner/facturatie`, `App.tsx:269`) → 404. Geen Reply-To.
- C: n.v.t.
- D: "Beste … je", rode kop `#9b1c1c`, geen wrapper.
- E: overlapt met T+3/T+7 zodra de factuurrij zonder pdf niet als "factuur" telt.
- F: **Schrappen** (conform plan fase 4); tot die tijd link en instructie corrigeren.

## commission_invoice_sent — Commissiefactuur (inline, met pdf)
- Ontvanger: partner (`invoice.recipient_email` → `contact_email` → `email`). Verzonden door `send-commission-invoice-to-partner/index.ts:175-240`. Bron: inline; admin kan onderwerp/tekst overschrijven.
- A: tekst "In de bijlage vindt u commissiefactuur … binnen de op de factuur vermelde betaaltermijn over te maken" klopt met plan-commissiefacturen (verzenden vanaf `final`, status `sent`). Doeksen-variant ("verrekend door partner", incasso-inkoopfacturen.md) wordt niet uitgezonderd, maar die krijgt geen commissiefactuur — ok.
- B: **Reply-To is `reply+BVC-JJMM-NNNN@reply.bureauvlieland.nl`** (`buildReplyTo(invoice.invoice_number)`, `:227`). `inbound-email/index.ts:15` matcht dat patroon, maar `:711-740` kent alleen `BV-` en `LOG-` → antwoord wordt met `status: "ignored", reason: "project_not_found"` weggegooid. Een partner die op de factuurmail antwoordt ("dit klopt niet") bereikt niemand. `mailto:hallo@` in de voettekst ok.
- C: n.v.t.
- D: "Beste … u/uw" (verdedigbaar bij een factuur, maar afwijkend), geen wrapper, kleur `#1e3a5f`, eigen voettekst zonder KvK/IBAN (die staat wel in de wrapper).
- E: ok.
- F: **Fout herstellen** (Reply-To naar `hallo@` of `BVC-` routeren in inbound-email) en wrapper gebruiken.

## proforma_commission_notification — Commissie-opgave (DB-template)
- Bron: DB-template 2026-05-13. **Wordt door geen enkele edge function gerenderd** (grep over `supabase/functions`: alleen de constante in `_shared/email-templates.ts:370`). Tekst beschrijft een proces dat niet meer bestaat ("Geef afwijkingen vóór {{deadline_date}} door via je partneromgeving … dan ontvang je na de deadline onze commissiefactuur"); plan-commissiefacturen rekent commissie over de inkoopfactuur ex btw, zonder opgave-/bezwaarronde.
- F: **Schrappen** (template en `TemplateIds.PROFORMA_COMMISSION`; ook uit `emailTemplateVariables.ts:314` en `AdminEmailTemplates.tsx:53`).

## partner_invitation — Uitnodiging partnerportaal (invite-partner, resend-partner-invitation, bulk-invite-partners)
- Ontvanger: partner (`partner.email`, loginadres). Verzonden door `invite-partner/index.ts:125-160`, `resend-partner-invitation/index.ts:100-150`, `bulk-invite-partners/index.ts:86-120`. Bron: DB-template 2026-05-28 (geen fallback: `if (!rendered) return 500`).
- A: (1) "Jij stuurt jouw factuur (voor de geoffreerde prijs) naar **inkoop@reply.bureauvlieland.nl**" — oud alias, referentie niet genoemd. (2) "Dit is het eerste jaar dat we met dit nieuwe systeem werken" — dateert. (3) "Met één klik bevestig je de aanvraag, stel je een alternatief voor, of geef je aan dat je niet beschikbaar bent" — ok, maar de drie soorten onderdelen (bevestiging/mededeling) en de logiesofferte-flow ontbreken; voor logiespartners is de uitleg ("activiteiten, catering") niet passend.
- B: `{{set_password_link}}` = Supabase recovery-link met redirect `/partner/reset-password` (bestaat). `{{partner_portal_link}}` = `/partner/login` ok. `mailto:inkoop@` verouderd. Resend-TextPart: "Inloggen kan daarna op: `${portalLink}/login`" → `/partner/login/login` (`resend-partner-invitation:84` + TextPart).
- C: Gedeclareerde variabelen `partner_password` en `login_link` worden niet gebruikt en niet gevuld (ok, blijven leeg). `set_password_link` staat niet in VARIABELEN maar wordt gevuld (ok). `commission_activity/accommodation` gevuld.
- D: "**Beste** {{partner_name}}" + "je" (mix); emoji-koppen (🔑📋💡💼); onderwerp goed. Resend overschrijft het onderwerp met "Herinnering: activeer je … account" — goed.
- E: `partner_intro_portal` (hieronder) vertelt deels hetzelfde.
- F: **Tekst aanpassen** (inkoop@ → invoices@ + referentie; "eerste jaar" weg; logies-alinea; Hoi).

## partner_intro_portal — Introductie portaal (send-partner-intro-email)
- Ontvanger: alle actieve partners (bulk) of testadres. Verzonden door `send-partner-intro-email/index.ts:89-140`. Bron: DB-template 2026-03-11. **Geen aanroeper in `src/`.**
- A: eenmalige campagnetekst ("De afgelopen weken heb je … een uitnodiging ontvangen", "Ik zou graag een keer langskomen") — hoort niet in een permanente template.
- B: `mailto:hallo@` ok; telefoon 0562 700 208 ok.
- C: geen variabelen → "Beste partner" zonder naam.
- D: wrapper ok; "Beste".
- E: zie `partner_invitation`.
- F: **Schrappen** (template inactief zetten; functie opruimen).

## partner_password_reset — Wachtwoord resetten (send-partner-reset-email) en admin-reset-partner-password (inline)
- Ontvanger: partner. Verzonden door `send-partner-reset-email/index.ts:76-140` (zelfservice, DB-template 2026-03-11) en `admin-reset-partner-password/index.ts:93-140` (admin, inline `getResetHtml` `:15-44`, zelfde `email_type`).
- A: template zegt "Deze link is 1 uur geldig" — Supabase recovery-links zijn standaard 1 uur; ok mits de projectinstelling niet is aangepast (niet gecontroleerd). Admin-variant: "Deze link is persoonlijk en beperkt geldig" ok. *Update 26 nov 2026: termijn naar 24 uur (migratie `20261126090000_resetlink-24-uur.sql`, dashboardinstelling Email OTP expiration 86400); teksten overal "24 uur".*
- B: `{{reset_link}}` = recovery-link met redirect `/partner/reset-password` (bestaat) ok; `mailto:hallo@` ok.
- C: `partner_name`, `reset_link` gevuld.
- D: template "Hallo … je" ok; "Partner Portal" (Engels) in onderwerp en tekst; eigen kop "Bureau Vlieland" boven de wrapper-logo. Admin-variant: "Beste … u/uw", eigen `#1e3a5f`-header, geen wrapper.
- E: twee teksten voor één sleutel.
- F: **Samenvoegen**: admin-variant op de DB-template laten renderen (met zin "Bureau Vlieland heeft een nieuwe link voor je aangemaakt").

## partner_mailing — Bulkmailing (send-partner-mailing)
- Ontvanger: actieve partners met account (`partner.email`, niet `contact_email`, `:76-80,108`). Verzonden door `send-partner-mailing/index.ts:106-160`; tekst uit `SendPartnerMailingDialog`. Bron: admin-invoer.
- A/C: n.v.t. (vrije tekst, `{{partner_name}}`/`{{missing_list}}` via `personalize`).
- B: geen Reply-To; ok (hallo@ is afzender).
- D: geen `wrapEmailHtml` → de mailing komt zonder logo/voettekst aan, tenzij de admin dat zelf meestuurt.
- F: **Houden**; overweeg wrapper.

## customer_accommodation_message — Bericht van klant aan logiespartner
- Ontvanger: logiespartner (`booking_contact_name`). Verzonden door `send-customer-accommodation-message/index.ts:159-215`. Bron: DB-template 2026-05-18.
- A: "je reactie gaat naar {{reply_info}} en wordt gelogd in je partner-dashboard onder 'Berichten met klant'" — paneel heet zo (`PartnerCustomerMessagesPanel.tsx:117`) ok. Bij `bureau_central` is `sender_label` "Bureau Vlieland" en `reply_info` "Bureau Vlieland" (`:143-148`) — dan zegt de mail "Bureau Vlieland heeft een bericht over de reservering", terwijl de klant het schreef; bewust (tussenpositie), maar de partner weet dan niet dat het een klantvraag is.
- B: Reply-To `reply+BV-…` ok (`:144-146`); `contact_info` bevat bij niet-centrale facturatie klant-e-mail/telefoon (`:152-155`) — alleen bij `partner_direct`, dat sinds maart 2026 niet meer voorkomt.
- C: alle acht variabelen gevuld.
- D: ok ("Hoi/je", wrapper). Onderwerp = klantonderwerp, zonder LOG-referentie.
- E: ok.
- F: **Houden**.

## wedding_referral_partner / event_referral_partner — Doorverwijzing aan partner
- Ontvanger: partner (doorverwijsadres → contact → login). Verzonden door `send-wedding-referral/index.ts:700-740`. Bron: DB-templates 2026-10-04 / 2026-11-03.
- A: volgt plan-bruiloftsdoorverwijzingen "Mail aan de partner" exact (vijf werkdagen, uiterlijk-datum, al-bekend-link, lege velden vallen weg). Ondertekening "Erwin Soolsma" persoonlijk — bewust.
- B: `{{al_bekend_link}}` = `/doorverwijzing/:token` bestaat (`App.tsx:249`); `mailto:{{email_klant}}` gevuld. Reply-To op referentie ok.
- C: alle tien variabelen gevuld (`:255-265`); onderwerp met aparte platte-tekstwaarden (`PartnerSubjectVars`) — goed.
- D: ok ("Hoi", voornaam contactpersoon).
- E: ok.
- F: **Houden**.

## chat_reply_visitor — Nieuw chatbericht (als de ontvanger een logiespartner is)
- Ontvanger: bij `conv.accommodation_id` + `source_partner_id` de partner (`notify-new-chat-reply/index.ts:62-78`). Bron: DB-template 2026-05-01.
- A: ok.
- B: `{{chat_url}}`/`{{portal_link}}` = `/partner/logies` (`:133`) bestaat, maar niet de specifieke aanvraag (`/partner/logies/:id` bestaat). Template gebruikt `{{chat_url}}`, code vult zowel `chat_url` als `portal_link`.
- C: `message_preview` gevuld (niet in VARIABELEN gedeclareerd, wel gebruikt). Onderwerp uit template "Nieuw bericht van Bureau Vlieland" overschrijft het betere code-onderwerp "Nieuw bericht inzake logiesaanvraag LOG-…" (`template?.subject || emailSubject`, `:176`).
- D: "**Beste** {{visitor_name}}, **U** heeft een nieuw bericht" — klanttoon naar een partner; `visitor_name` = bedrijfsnaam.
- E: ok.
- F: **Tekst aanpassen** (template-onderwerp met referentie laten vullen; of een partnervariant met "Hoi/je" en deeplink).

---

## Samenvattende tabel

| Template / functie | Ernst | Actie |
|---|---|---|
| program_request_partner — send-items-to-partners (incl. Herinnering) | verouderd | "(of upload…)" weg, referentie noemen, intro afhankelijk van akkoord, `partnerBillingNote` tutoyeren, wrapper |
| program_request_partner — DB-template via approve-quote-item | verouderd | inkoop@ → invoices@ + referentie; referentie in onderwerp; bevestiging/mededeling-variant; fallback zonder klantcontactgegevens |
| program_request_partner — accept-quote-proposal | verouderd | samenvoegen met send-items-to-partners (één generator) |
| program_partner_reapproval (approve-quote-item) | cosmetisch | uw → je in onderwerp/kop, wrapper |
| notify-partners-informational | ok/dood | schrappen (geen aanroeper; inform-variant zit in send-items) |
| date_change_partner / date_change_accommodation_partner | fout (logies) | logiesvariant vraagt aanpassing die bij `selected` niet kan; wrapper |
| headcount_change_partner_bulk + headcount_change_accommodation_partner | cosmetisch | tutoyeren, wrapper, samenvoegen met partner_headcount_change |
| partner_headcount_change | cosmetisch | wrapper; samenvoegen met bulk |
| reminder_activity_pending | verouderd | days_since vanaf verzendmoment; alleen verzonden items; referentie in onderwerp |
| partner_activity_unconfirmed_t7 | ok | houden |
| partner_headsup_t3 (inline) | verouderd | "Factuur registreren"-zin → inboxroute; status-filter `accepted` nalopen; aanhef; `partner_handling` |
| partner_briefing_t3 (DB) | dood | schrappen of gebruiken |
| booking_confirmed_partner | verouderd | "upload … of inkoop@" → inboxroute met referentie; referentie in onderwerp |
| item_added_partner | fout (cosmetisch zichtbaar) | dubbel label Voorkeurstijd/Opmerking; typo "partnerportaa"; knop |
| item_changes_partner | fout | actor klopt niet bij admin-publicatie; sanitizen; link; "Uw" → "je" |
| counter_proposal_partner | cosmetisch | Beste → Hoi, dubbele kop, "Partner Portal", Reply-To |
| item_cancelled_partner | ok | houden; Reply-To toevoegen |
| partner_item_cancellation | cosmetisch/dood | grammatica; samenvoegen met item_cancelled_partner of schrappen |
| cancellation_partner | cosmetisch | knopblok staat buiten de wrapper (na `</html>`) |
| cancellation_accommodation_partner | verouderd | DB-template wordt niet gebruikt; inline tekst mixt u/je; rauwe ISO-datums |
| accommodation_quote_request_partner (send-accommodation-quote-request) | cosmetisch | wrapper, Reply-To LOG, tabnaam "Logiesaanvragen", referentie in onderwerp, "- " bullets |
| reminder_quote_pending | ok | houden |
| reminder_headcount_pending | cosmetisch | DB-template ontbreekt → fallback met u/uw; template maken |
| quote_expired_partner | **fout** | `req` overschaduwd (`check-pending-items:790/838-839`) → mail gaat nooit weg; daarna uw/je gelijktrekken |
| accommodation_quote_withdrawn | cosmetisch | Hoi/je, wrapper, status pas na response |
| accommodation_selected_partner | verouderd | "apart bericht via het portaal" → inboxroute met referentie; aanhef; gast-betaald-variant |
| accommodation_rejected_partner | ok | houden |
| accommodation_headcount_confirmed_partner / _rejected_partner | cosmetisch | tutoyeren |
| partner_invoice_reminder_t1 (T+3) | **fout** | "Gisteren" → "een paar dagen geleden"; inboxmails en projectfacturen tellen niet als factuur; geen `expectsPartnerInvoice`-filter; "excl. BTW"-label |
| partner_invoice_reminder_t7 | **fout** | idem (zelfde `hasInvoice`) |
| partner_missing_pdf_reminder | **fout** + verouderd | link `/partner/financieel` is 404; instructie "PDF toevoegen" bestaat niet meer; schrappen (plan §3.7) |
| commission_invoice_sent | **fout** | Reply-To `reply+BVC-…` wordt door inbound-email genegeerd (`project_not_found`); wrapper |
| proforma_commission_notification | dood | schrappen (geen enkele functie rendert hem; proces bestaat niet) |
| partner_invitation | verouderd | inkoop@ → invoices@ + referentie; "eerste jaar" weg; logies-alinea; Beste → Hoi; TextPart `/login/login` |
| partner_intro_portal | dood | schrappen (campagnetekst, geen aanroeper) |
| partner_password_reset (DB) | cosmetisch | "Partner Portal" → partnerportaal; dubbele kop |
| admin-reset-partner-password (inline) | cosmetisch | op DB-template laten renderen |
| partner_mailing | ok | houden (wrapper overwegen) |
| customer_accommodation_message | ok | houden |
| wedding_referral_partner / event_referral_partner | ok | houden |
| chat_reply_visitor (naar partner) | cosmetisch | onderwerp met referentie; partnertoon; deeplink |

**Prioriteit 1 (fout):** quote_expired_partner (gaat nooit weg), factuurherinneringen T+3/T+7 (herinneren partners die al gemaild hebben; ook bij onderdelen zonder bureaufactuur), partner_missing_pdf_reminder (404-link), commission_invoice_sent (antwoord verdwijnt), item_changes_partner bij admin-publicatie (verkeerde actor, ongesanitized).

**Prioriteit 2 (verouderde factuurinstructie, zes plekken):** send-items-to-partners `:140`, accept-quote-proposal `:175`, DB-template program_request_partner, DB-template booking_confirmed_partner (+ fallback `update-customer-program:1456`), send-partner-headsup-t3 `:292`, DB-template partner_invitation, DB-template accommodation_selected_partner ("apart bericht via het portaal"). Overal dezelfde zin gebruiken: "Mail na uitvoering de pdf van je factuur naar invoices@reply.bureauvlieland.nl, met onze referentie {{reference_number}} erop. Wij factureren centraal aan de klant."

## Niet onderzocht
- Of `admin_price_override` (gebruikt als "afgesproken prijs p.p." in de aantalwijzigingsmails) altijd gelijk is aan de partnerprijs, of een bureau-verkoopprijs kan zijn.
- Of `admin_price_notes` (meegestuurd in partner_headsup_t3 als "Toelichting") bedoeld is voor partnerogen.
- Of een `expired` logiesofferte in het partnerportaal daadwerkelijk te verlengen is (quote_expired_partner belooft dat).
- Of `booking_confirmed_partner` bewust alleen `confirmed` items pakt (niet `accepted`/`executed`), en of `send-partner-headsup-t3` bewust alleen `accepted` pakt.
- De exacte geldigheid van Supabase recovery-links in dit project (template zegt 1 uur).
- Of `partner_handling`-velden sinds oktober ook in oudere projecten gevuld zijn (anders vallen alle items terug op `quote`, en zijn de ontbrekende filters in de herinneringen minder zichtbaar).
- Of de cron voor `notify-partners-missing-invoice-pdf` (`mode: auto`) in de live database nog draait; het staat niet in de repo.
- Live `email_log`-cijfers per sleutel; alleen de getallen uit plan-notificaties 2.2 zijn gebruikt.

# Deel C — Bureau, boekhouding, systeemalarmen en Werkbank-taken


Werkwijze volgens audit-briefing.md (punten A–F). Alles hieronder is gecontroleerd in de code op 21 november 2026; "ok" staat er alleen waar dat echt is nagekeken. Regelverwijzingen zijn naar de huidige werkkopie.

Algemene vaststellingen die voor meerdere mails gelden:

- **Twee adresbronnen voor "het bureau".** `send-program-request`, `send-quote-request`, `send-catering-request`, `register-partner-invoice` en de vier monitors lezen `getBureauAdminEmail()` (instelling `bureau_admin_email`). `notify-new-chat` (:110), `update-customer-program` (:1137), `_shared/lodging-bureau-alert.ts` (:184) en `wedding-referral-claim` (:206) sturen hard naar `hallo@bureauvlieland.nl` (`GENERAL_CONTACT_EMAIL`). Zolang de instelling op hallo@ staat maakt het niets uit; wijzigt Erwin de instelling, dan gaat de helft van de meldingen ergens anders heen. Eén bron kiezen.
- **Huisstijlwrapper.** Alleen de mails via `getRenderedTemplate` (program_request_bureau, quote_request_bureau, chat_notification_bureau) en `send-project-email` gaan door `wrapEmailHtml` (logo + voettekst uit instellingen). `sendMailjet` wrapt niet (`_shared/mailjet-send.ts:351-375`). Catering, tegenvoorstel, logies-alerts, bruiloft-melding, alle boekhoudmails en alle alarmen gaan dus zonder logo/voettekst. Voor interne meldingen is dat verdedigbaar; voor de boekhouding ook. Ik noem het per mail niet apart meer.
- **Fallback-boekhoudadres.** `snelstart_email` valt in vier functies terug op `bureauvlieland@boekhouding.nl` (forward-purchase-invoice:130, finalize-collective-invoice:265, forward-bureau-invoice:304, forward-commission-invoice:101; ook in `ForwardToAccountingDialog.tsx:38`). Dat lijkt een plaatshouder. Of de instelling in productie gevuld is, is uit de repo niet te zien (zie "Niet onderzocht").
- **Bedragen.** Alle boekhoudmails en de meeste taakteksten gebruiken `toFixed(2)` → "€1234.50" met punt. `formatCurrencyNL` bestaat (`email-templates.ts`) en wordt alleen door de logies-alert en flag-missing-partner-invoices gebruikt. Cosmetisch, maar voor een boekhouder slordig.

---

## Deel 1 — mails aan het bureau en de boekhouding

### program_request_bureau — Nieuwe programma-aanvraag (bureau)
- Ontvanger: `getBureauAdminEmail()`. Verzonden door `send-program-request/index.ts:197-209` (variabelen), `:245-261` (verzending). Bron: DB-template "Programma aanvraag - Bureau notificatie", bijgewerkt 2026-05-13. Fallback-HTML `:216-231`.
- A: **"Handling fee: € {{bureau_fee}}" toont altijd "€ 0"**: beide aanroepers sturen `bureauFee: 0` (`src/components/configurator/CheckoutContactForm.tsx:464`, `src/pages/ProgrammaOpMaat.tsx:254`). De regel is dus informatieloos en suggereert dat er geen fee is. De zin "Facturatie: Bureau Vlieland factureert centraal alle onderdelen aan de klant (bureau-centraal model)" is intern jargon; de kop "Door Bureau Vlieland zelf uitgevoerd" klopt, maar de fallback-HTML zegt op dezelfde plek "Bureau Vlieland factureert" (`:226`) — twee teksten voor één ding.
- B: Geen enkele link. De mail noemt klant, aantal en datum, maar Erwin moet het project zelf opzoeken. De code kent `customerToken`/`programReq.id` (`:331-338`), maar pas ná de verzending; de route `/admin/aanvragen/:id` bestaat. Geen Reply-To (ok: geen BV-nummer op dat moment).
- C: Template vraagt `customer_name, customer_company, customer_email, customer_phone, number_of_people, selected_date, bureau_fee, bureau_items, partner_items, self_arranged_items, notes`; de code geeft precies die mee. `bureau_items` e.d. zijn `<li>`-fragmenten (`:171-190`); of de template er een `<ul>` omheen heeft is in de platte export niet te zien.
- D: Onderwerp "Nieuwe programma aanvraag - {{number_of_people}} personen": zonder klantnaam, zonder koppelteken ("programma-aanvraag"). "Email:" i.p.v. "E-mail". Geen "Aan zet"-regel. Afzendernaam "Bureau Vlieland Website" (`:247`).
- E: Op hetzelfde moment ontstaan **twee Werkbank-taken** voor dezelfde aanvraag: `new_request_received` uit deze functie (`:353-358`, "Nieuwe aanvraag: X — programma samenstellen") en `new_program_request` uit de DB-trigger (`supabase/migrations/20261026120000_zelftest-taken-opruimen.sql:52-72`, "Nieuwe programma-aanvraag: X"). Zie Deel 3.
- F: **Tekst aanpassen**: fee-regel en facturatiezin weg, klantnaam in het onderwerp, knop naar het project (verzending na de lookup zetten of de knop op `/admin/werkbank` richten).

### quote_request_bureau — Offerte-aanvraag via website (bureau)
- Ontvanger: `getBureauAdminEmail()`. Verzonden door `send-quote-request/index.ts:208-230`. Bron: DB-template "Offerte aanvraag (Bureau)", bijgewerkt 2026-05-18.
- A: **De functie heeft geen aanroeper meer in `src/`** (alleen `edgeFunctionTestCoverage.ts:110` en `supabase/config.toml:17`); de inventaris stelde dat ook al vast. Het offerteformulier is vervangen door `/programma-op-maat` → `send-program-request`. Het plan voor grote groepen (`docs/plan-grote-groepen.md:3`) is geparkeerd tot voorjaar 2027. De mail wordt dus niet meer verstuurd.
- B: `mailto:{{customer_email}}` en `tel:{{customer_phone}}` worden gevuld. Code geeft `admin_link` mee (`:197`) dat de template niet gebruikt — onschuldig.
- C: Alle template-variabelen worden gevuld; `budget_per_person` krijgt "Niet opgegeven" als terugval. ok.
- D: Onderwerp "Nieuwe offerte-aanvraag van {{customer_name}}" is goed. Emoji-koppen (📋 📅 💬). Geen actie/link naar admin.
- E: Geen.
- F: **Schrappen** (functie, beide templates `quote_request_*`, config-regel en testdekking), of uitdrukkelijk parkeren bij het grote-groepen-plan. Nu is het dood gewicht dat wél in de templatelijst staat.

### catering_request_bureau — Nieuwe catering-aanvraag (bureau)
- Ontvanger: `getBureauAdminEmail()` (ook de klantmail in testmodus). Verzonden door `send-catering-request/index.ts:140-166` (HTML), `:192-200` (verzending). Bron: inline in code.
- A: Inhoud (type, datum, gasten, locatie, horeca ter plaatse, indicatieve prijs, samenstelling, dieet, opmerkingen) klopt met wat `CateringQuickRequest.tsx` vraagt. De klant krijgt "binnen 2 werkdagen een definitieve offerte" beloofd (`:113`); de bureaumail zegt nergens dat er een termijn loopt.
- B: Eén link "→ Open in admin" naar `https://bureauvlieland.nl/admin/projecten` (`:164`): bestaat, maar is het overzicht. De functie kent `p.requestId` (`:33`) en zou direct naar `/admin/aanvragen/${requestId}` kunnen. Geen Reply-To (BV-nummer is wel beschikbaar als `referenceNumber`; `buildReplyTo` wordt niet gebruikt).
- C: n.v.t. (inline).
- D: Onderwerp "Nieuwe catering-aanvraag — {type} · {gasten}p · {datum}" is helder, maar zonder referentie (die staat alleen in de kop). "Horeca op locatie: Ja/Nee/Onbekend" ok. Geen "Aan zet".
- E: `send-catering-request` maakt geen Werkbank-taak; de aanvraag landt in `program_requests` en valt dus onder de DB-trigger `new_program_request` (als de insert via dezelfde tabel loopt — niet gecontroleerd). Geen dubbele mail.
- F: **Tekst aanpassen** (deeplink naar het project, referentie in het onderwerp, "binnen 2 werkdagen" als actie noemen).

### chat_notification_bureau — Nieuw chatbericht (bureau)
- Ontvanger: hard `hallo@bureauvlieland.nl` (`notify-new-chat/index.ts:110`), niet `getBureauAdminEmail()`. Verzonden door `notify-new-chat` na `chat-visitor-send:114` en `whatsapp-webhook:245`. Bron: DB-template "Chat notificatie - Bureau", bijgewerkt 2026-03-11.
- A: **Bronlabel klopt niet voor WhatsApp en pre-sales**: `sourceLabel` is "Partnerportaal" bij `partner_portal`, anders "Klantportaal" (`:69`); `chat_conversations.source` kent ook `whatsapp` en `presales` (`src/hooks/useChat.ts:17`). Een WhatsApp-bericht komt dus binnen als "Nieuw chatbericht van Bezoeker (Klantportaal)" met e-mail "onbekend".
- B: `{{chat_url}}` = `/admin/chat` (`:90`): route bestaat. Geen link naar het specifieke gesprek of dossier.
- C: Template-variabelen `visitor_name, visitor_email, source_label, message_preview, chat_url` worden alle gevuld. ok. Het logiesreferentienummer (`subjectExtra`, `:75-85`) wordt alleen in de fallback gebruikt; de template heeft er geen variabele voor, dus in de praktijk ontbreekt het.
- D: Onderwerp begint met 💬. Verder sober en duidelijk. Dedupe 5 minuten per gesprek (`:46-58`) is zinnig.
- E: Zelfde bericht is zichtbaar in Berichtencentrum → Chat; dat is de bedoeling van de mail (signaal). Geen Werkbank-taak. ok.
- F: **Tekst aanpassen**: labels voor whatsapp/presales, referentie als variabele in de template, adres via instelling.

### customer_counter_proposal_bureau — Klant stelt andere tijd voor (bureau)
- Ontvanger: hard `hallo@` (`update-customer-program/index.ts:1137`). Verzonden door `update-customer-program` bij actie tegenvoorstel, `:1115-1156`. Bron: inline in code.
- A: Inhoud klopt met `docs/plan-afhandeling-onderdelen.md` (tegenvoorstel tijd gaat naar partner; bureau krijgt melding en taak). Tegelijk gaat `counter_proposal_partner` naar de partner (`:1049-1083`).
- B: Knop "Open werkbank" linkt naar `/admin/aanvragen/${program.id}` (`:1118`, `:1133`) — route bestaat, maar dat is het projectdetail, niet de Werkbank. Geen Reply-To.
- C: n.v.t.
- D: Aanhef "Hoi team," (`:1121`) — het bureau is één persoon en alle andere bureaumails hebben geen aanhef. Onderwerp "Klant stelt andere tijd voor — {onderdeel}" zonder klantnaam/BV-nummer (die staan wel in de tekst, `:1120`).
- E: **Dubbel met de Werkbank-taak** `customer_counter_proposal` die direct erna wordt aangemaakt (`:1161-1175`, "Klant X stelt andere tijd voor "Y"") met dezelfde inhoud. Niet gedocumenteerd als bewust "mail als extra signaal" zoals bij logies.
- F: **Samenvoegen met de taak** (mail schrappen) óf houden als signaal met aangepaste aanhef, onderwerp met klant/BV-nummer en knoptekst "Open het project".

### partner_invoice_registered_bureau — Factuur geregistreerd door partner (bureau)
- Ontvanger: `getBureauAdminEmail()`. Verzonden door `register-partner-invoice/index.ts:494-534`. Bron: inline in code. Reply-To met BV-nummer (`:3`, `sendEmailNotification`).
- A: De hele route (partner typt factuur in het portaal) **gaat weg** volgens `docs/plan-inkoopfacturen-via-inbox.md` §3.7 en fase 4; sinds fase 1 (17 nov) staan de registratiedialogen achter `partner_invoice_registration_enabled` (standaard uit, `src/hooks/usePartnerInvoiceRoute.ts`). De mail wordt dus alleen nog verstuurd als Erwin de noodrem aanzet. Tekst zelf ("heeft een factuur geregistreerd", banner "via e-mail", banner "aan de gast: … stuurt de factuur niet door naar Snelstart") klopt met `docs/factuur-aan-de-gast.md`.
- B: Geen link naar de factuur of het project; alleen tekst.
- C: n.v.t.
- D: Onderwerp "Factuur geregistreerd (via e-mail) (aan de gast): {partner} - {BV-nummer}" wordt bij beide vlaggen onhandig lang maar is informatief. Bedragen met punt.
- E: Maakt tegelijk taken `commission_pending` en `purchase_invoice_pending` aan (`:444-467`) → mail + twee taken voor één gebeurtenis.
- F: **Schrappen met de functie** (fase 4 van het inboxplan). Tot dan niets aan doen.

### lodging_quote_submitted_bureau / lodging_quote_revised_bureau / lodging_quote_declined_bureau / lodging_headcount_confirmed_bureau — Logies-alerts (bureau)
- Ontvanger: hard `GENERAL_CONTACT_EMAIL` (`_shared/lodging-bureau-alert.ts:184`). Verzonden door `create-quote-review-todo`, `decline-accommodation-quote`, `confirm-accommodation-headcount` via `sendLodgingBureauAlert`. Bron: inline (`buildHtml`, `:111-161`).
- A: Stappen kloppen met `docs/plan-logies-aantalwijziging.md:12,31` (bureau beoordeelt; taak + alert). Maar de ondertitel zegt bij ingediend/herzien/afgewezen "Interne melding — geen actie voor de klant of partner." (`:139`) terwijl het bureau juist wél aan zet is (beoordelen en doorsturen). Alleen de headcount-variant zegt dat ("beoordeel het voorstel in de admin, daarna informeren wij de klant"). `renderActorLine("bureau")` bestaat en wordt niet gebruikt.
- B: Knop "Bekijk in de admin" → `/admin/aanvragen/${linked_program_id}` of `/admin/werkbank?kind=logies` (`:206-208`); beide routes bestaan. De pagina waar de offerte wordt beoordeeld en doorgestuurd is echter `/admin/logies/${request.id}` (`AdminAccommodationDetail`); `input.request.id` is beschikbaar. Zonder gekoppeld programma landt Erwin nu op de hele logieslijst.
- C: n.v.t. Tabelrijen worden netjes weggelaten als een waarde ontbreekt. Bedragen via `formatCurrencyNL`. ok.
- D: Onderwerpen ("Nieuwe logiesofferte — {partner} voor {klant} (BV-…)", "Logies: alternatieve datums — …") zijn goed en hebben referentie. Toon zakelijk, geen Engels. "Interne melding" ok.
- E: Bewust dubbel met de Werkbank-taken `quote_review` / `accommodation_quote_declined` / `quote_headcount_review` ("De werkbanktaak blijft leidend; de mail is een extra signaal", `:3-8`). Idempotentiesleutel voorkomt herhaling (`:187-199`).
- F: **Tekst aanpassen** (klein): "Aan zet: Bureau Vlieland" bij ingediend/herzien/afgewezen, knop naar de logiesdetailpagina, adres via instelling.

### wedding_referral_claim_bureau — Partner meldt "al bekend" (bureau)
- Ontvanger: hard `GENERAL_CONTACT_EMAIL` (`wedding-referral-claim/index.ts:206`). Verzonden door `wedding-referral-claim` (actie `report`), `:203-270`. Bron: inline (`bureauMailHtml`, `:160-196`).
- A: Klopt één op één met `docs/plan-bruiloftsdoorverwijzingen.md:328-349` (onderwerp, velden, twee knoppen, logging op project en partner, dossierregel). Sinds november ook "aanvrager" bij evenementen (`:61-62`). ok.
- B: Knop "Bekijk de doorverwijzing" → `/admin/bruiloften` (bestaat; navigatielabel "Doorverwijzingen", `AdminLayout.tsx:158`, en de tekst zegt "onder Doorverwijzingen" — consistent). "Open het project" → `/admin/aanvragen/:id`. ok.
- C: n.v.t.
- D: Onderwerp "Al bekend gemeld — {partner} over {namen} (BV-…)" duidelijk met referentie. Tekst zegt wat er gebeurt met de vergoeding ("Bij een boeking is de vergoeding dan nul"). ok.
- E: Bewust dubbel met taak `wedding_referral_claim` (`:336-351`), gedocumenteerd.
- F: **Houden.**

### purchase_invoice_forward — Inkoopfactuur doorsturen naar boekhouding
- Ontvanger: `snelstart_email` (Name "Boekhouding"). Twee verzenders met hetzelfde `email_type`: `forward-purchase-invoice/index.ts:139-196` (losse factuur, `template_name: purchase_invoice_forward`) en `finalize-collective-invoice/index.ts:256-335` + `buildSummaryHtml` `:347-382` (verzamelfactuur, `template_name: collective_invoice_forward`). Bron: inline.
- A: Klopt met `docs/plan-inkoopfacturen-via-inbox.md` ("Doorsturen naar Snelstart … werkt al op de factuurrij") en `docs/factuur-aan-de-gast.md:89` (weigering bij `customer_billed`, `:89-99`). Verzamelfactuur: kolom "Project" toont "✓ gekoppeld" / "intern" / "—" (`:350`) — voor de boekhouding zonder betekenis.
- B: `ReplyTo: reply+BV-…@reply.bureauvlieland.nl` bij een losse factuur met project (`:178-187`). Een antwoord van de boekhouder komt daardoor via `inbound-email` in het klantdossier terecht. Of dat gewenst is, is een keuze; het staat nergens beschreven. De verzamelfactuurmail heeft geen Reply-To en **geen testmodus** (`:272` stuurt naar het echte adres, geen `getRecipientEmail`/`[TEST]`), anders dan de losse variant (`:177`, `:168`).
- C: n.v.t.
- D: Kop "Inkoopfactuur Partner" en onderwerp "Inkoopfactuur: {partner} - {nummer}" zijn duidelijk. Bedragen "€402.97" met punt (`:155-163`); verzamelfactuur idem. Afzendernaam "Bureau Vlieland Admin".
- E: Geen.
- F: **Houden**, cosmetisch: NL-bedragen, projectkolom in de verzamelmail leesbaar maken ("gekoppeld aan BV-…"), testmodus en logging (`logEmail` i.p.v. directe insert, `:316-330`) gelijktrekken met de losse variant.

### bureau_invoice_forward — Verkoopfactuur naar boekhouding
- Ontvanger: `snelstart_email`. Verzonden door `forward-bureau-invoice/index.ts:479-522`. Bron: inline, bewust minimaal ("keeps Snelstart from saving the message itself as a separate e-mail.pdf", `:478`).
- A: PDF + UBL/XML als bijlagen, onderwerp met type en nummer. Klopt met de factuurflow. ok.
- B: Reply-To met BV-nummer; zelfde opmerking als hierboven.
- C/D: Eén zin, geen opmaak; "€1234.50" met punt. Prima voor dit doel.
- E: Geen.
- F: **Houden.**

### commission_invoice_forward — Commissiefactuur naar boekhouding
- Ontvanger: `snelstart_email`. Verzonden door `forward-commission-invoice/index.ts:124-161`. Bron: inline.
- A: Alleen vanaf status `sent`/`forwarded` (`:78-83`), conform `docs/plan-commissiefacturen.md:452` ("PDF altijd mee"). Maar als `pdf_path` ontbreekt gaat de mail toch zonder bijlage (`:111-121`, `:153`) — het plan zegt "PDF altijd mee". Geen UBL/XML, terwijl de verkoopfactuur dat wél meestuurt "voor boekhoudkundige verwerking" — de boekhouding krijgt commissiefacturen dus anders aangeleverd.
- B: Geen Reply-To, geen link. ok voor dit doel.
- C: n.v.t.
- D: Kop "Verkoopfactuur Bureau Vlieland (commissie)", rij "Klant (debiteur): {partner}" is correct boekhoudjargon. Bedragen met punt.
- E: Geen.
- F: **Houden**; overweeg UBL mee te sturen zoals bij de verkoopfactuur en te weigeren zonder PDF.

### email_chain_probe — Proefverzending e-mailketen
- Ontvanger: opgegeven adres of `GENERAL_CONTACT_EMAIL`. Verzonden door `mailjet-webhook-status/index.ts:109-131` (admin-knop). Bron: inline.
- A: Doel en instructie kloppen (open de mail, kijk daarna op de gezondheidspagina).
- B: Geen link; verwijst in tekst naar "Admin → E-mail gezondheid" (`:117`), terwijl de pagina en het menu "Email health" heten (`AdminLayout.tsx:198`, `AdminEmailHealth.tsx:220`). Zelfde pagina, andere naam.
- C/D: ok; onderwerp met tijdstempel.
- E: Geen.
- F: **Houden**, cosmetisch: naam van de pagina gelijktrekken (liefst de pagina hernoemen naar Nederlands en overal dezelfde naam gebruiken).

### admin_project_email — Ad-hoc projectmail (vaste delen) + AI-opsteller
- Ontvanger: door Erwin gekozen. Verzonden door `send-project-email/index.ts`. Bron: tekst van Erwin; vaste delen in code; opsteller in `_shared/emailComposerIntents.ts` (identiek aan `src/lib/emailComposerIntents.ts`, alleen commentaar verschilt) en `compose-followup-email/index.ts`.
- A (vaste delen): **Afsluiting verdwijnt.** `send-project-email:129-133` haalt "Met vriendelijke groet,\nBureau Vlieland" aan het eind van de tekst weg "omdat de wrapper die al toevoegt" — maar `wrapEmailHtml` voegt géén groet toe (alleen logo en voettekst, `email-templates.ts:457-500`). Een mail die zo eindigt gaat dus zonder afsluiting weg. De opsteller schrijft zonder afzendernaam precies die afsluiting voor (`emailComposerIntents.ts:259`); mét afzendernaam ("…groet,\nErwin\nBureau Vlieland") matcht de regex niet en blijft de groet staan. Uitkomst wisselt dus per situatie.
- A (opsteller): "Je bent een ervaren accountmanager bij Bureau Vlieland, een lokale reisspecialist en boekingskantoor op Vlieland" (`:250`) — het bureau stelt groepsprogramma's samen; "reisspecialist en boekingskantoor" is niet hoe de site het noemt. `ask_approval` ("voorstel goedkeuren en de algemene voorwaarden ondertekenen … geldigheidsdatum", `:37-42`) klopt met akkoord-en-tekenen-in-één-stap (`docs/plan-klantreis-en-ondertekening.md:198`). `payment_followup` en `confirm_change` verbieden terecht verzonnen bedragen/wijzigingen. `aftercare` overlapt met de automatische `customer_aftersales_review`-template (Erwin kan dezelfde vraag twee keer stellen; dat is zijn keuze). Formeel u/uw voor klant, je/jouw voor partner (`:251-253`) is consistent met de rest van het systeem.
- B: `{{portal_url}}` → klantportaal of `/mijn-logies/`, voor partners `/partner` (login-redirect, bestaat). Reply-To alleen met BV-/LOG-nummer. ok.
- C: Placeholders `{{portal_url}}, {{portal_link}}, {{customer_name}}, {{reference_number}}, {{recipient_name}}` worden vervangen (`:103-116`). ok.
- D: Vrije tekst wordt ge-escaped en in de wrapper gezet; HTML-templates worden niet dubbel gewrapt. ok.
- E: n.v.t.
- F: **Tekst aanpassen**: de groet-strip weghalen of de wrapper een echte afsluiting laten toevoegen (één van de twee), en de zelfomschrijving in de systeemprompt gelijktrekken met de site.

---

## Deel 2 — systeemalarmen (begrijpelijk voor een niet-technische lezer?)

Alle vier: afzender `MAILJET_FROM_EMAIL` → `noreply@bureauvlieland.nl` met naam "Bureau Vlieland Monitor"; ontvanger `bureau_admin_email` → `ADMIN_ALERT_EMAIL` → terugval. Terugval verschilt: `hallo@` (watchdog, heartbeat) tegenover `administratie@bureauvlieland.nl` (zelftest `:611`, auto-close `:56`). Alleen de watchdog logt in `email_log`; de andere drie staan dus niet in het maillog/Berichtencentrum.

### cron_watchdog_alert — Geplande taken falen (`cron-watchdog/index.ts`)
- Mail: onderwerp "[ALERT] N automatische taak/taken falen"; tekst "De volgende geplande taken draaien niet of eindigen met een fout:" + per taak de technische jobnaam en een reden uit `logic.ts` ("heeft nog nooit gedraaid", "geen run in 36 uur (verwacht: 0 7 * * *)", "pg_cron-status …", "aanroep mislukt (HTTP 500)"). Link `/admin/email-health` (bestaat). **Wat Erwin moet doen staat er niet**; cron-uitdrukkingen en HTTP-codes zeggen hem niets.
- **Fout: de Werkbank-taak wordt nooit aangemaakt.** `:98-105` insert met `status: "open"`; de check-constraint staat alleen `todo`, `in_progress`, `done`, `dismissed` toe (`supabase/migrations/20260512105627…sql:2`). De insert faalt, de fout wordt niet gelezen. Daardoor ontbreekt bij een falende cron juist het signaal dat dit systeem moest geven; alleen de mail (max. 1 per 12 uur) komt aan.
- Taaktekst "Automatische taak faalt: {jobname}" is technisch; de taak valt in Werkbank-cluster "Overig" (niet in `CLUSTER_MAP`) en wordt niet als "Systeemmelding" getoond (`SYSTEM_AUTO_TYPES` bevat alleen `critical_selftest_failure`, `src/lib/inboxAssemble.ts:92`).
- Oordeel: **Fout** — status corrigeren, in de mail en taak één zin "Wat te doen: open Email health en klik bij de taak op 'Nu uitvoeren'; blijft het rood, meld het bij de ontwikkelaar."

### Kritieke zelftest — `critical-selftest/index.ts:588-650`
- Mail: onderwerp "[ALERT] Kritieke zelftest: N probleem(en) — {labels}"; tabel met per controle een icoon, Nederlands label ("Online aanvraag (programma samenstellen)", "Mailconfiguratie", …), detail en "Fix: …". Link "Systeemgezondheid in de admin" → `/admin/email-health` (pagina heet "Email health").
- De labels zijn begrijpelijk; de fix-hints zijn voor een ontwikkelaar ("GRANT SELECT ON public.building_blocks TO anon", "Controleer public.submit_self_service_program_request: kolomtypen (selected_dates = jsonb)", `:139`, `:194`). Voor Erwin ontbreekt de ene zin die hij nodig heeft: of klanten nu wel of niet kunnen aanvragen/mailen, en of hij iets moet doen of moet doorgeven.
- Werkbank-taak (`_shared/selftestTodo.ts`) is goed opgezet: één taak, bijgewerkt bij aanhoudende fout, automatisch afgerond bij herstel, toont in de Werkbank als "Systeemmelding" met knop "Bekijk zelftest" (`OrphanTodoPanel.tsx:167-180`). Alleen de omschrijving herhaalt de technische fix-hints.
- Oordeel: **Tekst aanpassen** — per controle een leesbare gevolg-zin naast de technische hint ("Gevolg: het aanvraagformulier op de site werkt niet; neem contact op met …"), paginanaam gelijktrekken, mail loggen.

### email-webhook-heartbeat — Geen terugkoppeling van Mailjet (`email-webhook-heartbeat/index.ts:120-170`)
- Mail: "[ALERT] Geen e-mail-terugkoppeling van Mailjet"; tekst legt uit wat er mis is, wat het gevolg is ("we weten niet of mail wordt afgeleverd en onbereikbare adressen worden niet geblokkeerd") en wat te doen ("open Email health, kopieer de webhook-URL en zet die in Mailjet bij alle event-types …"). Dit is het best leesbare alarm van de vier. De opsomming "(sent, open, click, bounce, blocked, spam, unsub)" is Engels maar dat zijn de namen in Mailjet zelf.
- Taak "E-mail: geen terugkoppeling van Mailjet" met dezelfde uitleg en "Fix: kopieer de webhook-URL uit /admin/email-health …" — goed. Maar `auto_entity_id` bevat de datum (`:136`), dus **elke dag een nieuwe taak** zolang het probleem duurt (de zelftest lost dat juist op met één vaste sleutel); cluster "Overig", geen "Systeemmelding".
- Oordeel: **Houden**, klein: vaste sleutel zoals de zelftest, `SYSTEM_AUTO_TYPES` uitbreiden, mail loggen.

### auto-close-monitor — Bewaking automatisch afsluiten (`auto-close-monitor/index.ts:58-91`)
- Mail: onderwerpen "[ALERT] Auto-close monitor · Bureau Vlieland: geen run in >26 uur" / "laatste run had errors" / "run staat vast op 'running'". Tekst: "De `auto-close-past-execution` cron heeft … geen enkele run geregistreerd. Controleer de cron in de backend of draai de functie handmatig via …", "Laatste run (id …, gestart 2026-…T…Z) eindigde met status error … (zie result JSON)" + JSON-dump, "Waarschijnlijk is de edge function gecrasht zonder afronding. Check logs."
- Voor een niet-technische lezer onleesbaar: cron, backend, edge function, run-id, JSON, logs. Nergens staat wat het voor het bureau betekent (projecten worden niet automatisch op "uitgevoerd" gezet en de nazorg-/factuurtaken komen niet). Link naar `/admin/email-health` bestaat. Geen Werkbank-taak, niet gelogd.
- Oordeel: **Tekst aanpassen** of **samenvoegen met cron-watchdog**: de watchdog bewaakt dezelfde job al via `get_scheduled_job_health()`; twee alarmen over één taak, in twee stijlen.

---

## Deel 3 — Werkbank-taakteksten (per auto_type)

Hoe ze getoond worden: de live Werkbank (`/admin/werkbank`) toont titel + omschrijving en daarnaast **de ruwe sleutel** (`OrphanTodoPanel.tsx:165` als badge, `ProjectDetailPanel.tsx:200` als "· purchase_invoice_inbox") en de prioriteit in het Engels ("Prio: high", "Prioriteit: normal"). De Nederlandse labels in `autoTodoTypeConfig` (`src/lib/autoTodoCreator.ts:214-379`) en de linkteksten in `AdminTodos.tsx:149-286` worden alleen op de legacy-pagina `/admin/todos-legacy` gebruikt, die niet in het menu staat. Van de 60+ sleutels in gebruik ontbreken er ruim twintig in `autoTodoTypeConfig` (o.a. alle `commission_*`, `purchase_invoice_*`, `sales_inbox`, `system_cron_failure`, `email_webhook_silent`, `critical_selftest_failure`, `lodging_board_missing`, `stale_pending_change`, `people_change_notify_failed`, `customer_date_change_partner_notify`, `customer_practical_info_updated`, `customer_accommodation_setup_changed`, `book_ferry_tickets`, `wedding_referral_claim`, `partner_agreement_accepted`, `partner_post_charge`, `commission_invoice_lost`, `customer_status_*`, `customer_inputs_missing`). Dezelfde sleutels staan niet in `CLUSTER_MAP` (`src/lib/projectActivity.ts:58-105`; ook `availability_conflict`, `customer_review_low`, `reference_case_*` niet) en vallen in de inbox onder "Overig".

Legacy-links die niet kloppen (alleen `/admin/todos-legacy`): `quote_review`, `quote_headcount_review`, `quote_headcount_pending_partner`, `quote_expired_partner`, `forward_accommodation_quote`, `accommodation_selected`, `accommodation_quote_declined` linken naar `/admin/logies/${related_request_id}` (`AdminTodos.tsx:158-171, 227-231, 267-275`), maar `related_request_id` is een programma-id en de route verwacht een logiesaanvraag-id (`AdminAccommodationDetail.tsx:184, 214`). Overige legacy-doelen (`/admin/aanvragen`, `/admin/partners`, `/admin/logies`) zijn redirects en werken.

### Nieuwe aanvragen
- **new_request_received** (`send-program-request:353-358`) "Nieuwe aanvraag: {klant} — programma samenstellen" / "Er is een nieuwe programma-aanvraag binnengekomen van … voor N personen." en **new_program_request** (DB-trigger, `20261026120000…sql:52-72`) "Nieuwe programma-aanvraag: {klant}" / idem + datum + referentie. **Twee taken per aanvraag**, zelfde cluster "Aan zet", beide door reconcile gesloten (`reconcile-admin-todos:425-436`). De trigger dekt ook aanvragen die niet via de website komen en heeft de referentie. **Samenvoegen**: `new_request_received` schrappen, trigger-titel met "— programma samenstellen" aanvullen.
- **new_accommodation_request** (trigger `20260423202658…sql:19-26`) "Nieuwe logies-aanvraag: {klant} — offertes uitzetten" / "… voor N gasten van dd-mm t/m dd-mm." **ok.**
- **sales_inbox** (`inbound-email:510-514`, `:675-682`) "Nieuwe sales-aanvraag van {afzender}" / "Onderwerp: … Bekijk in de Sales Inbox." en "Onbekend mailadres: {adres}". Menu heet "Sales Inbox". **ok** (Engelse naam is de menunaam).

### Inkoopfacturen en commissie (het meest verouderde deel)
- **purchase_invoice_inbox** (`inbound-purchase-invoice:291-295`) "Nieuwe inkoopfactuur in inbox van {afzender}" / "Onderwerp: "…"" — zegt wat er gebeurd is, niet wat Erwin moet doen; geen project/partner gekoppeld (wees-taak); de Inkoop-inbox heeft al een teller in het menu (`AdminLayout.tsx:186`). **Tekst aanpassen**: "Verwerk de factuur in de Inkoop-inbox: partner en project bevestigen, bedrag naast de pdf controleren, opslaan." Of schrappen ten gunste van de teller.
- **purchase_invoice_pending** (`register-partner-invoice:460-466`) "Inkoopfactuur verwerken: {partner} - {nummer}" / "Partner … heeft inkoopfactuur … geregistreerd … Factuur doorsturen naar Snelstart." Verouderd ("geregistreerd"); verdwijnt met de functie (plan §3.7). **Schrappen met de functie.**
- **commission_pending** (`register-partner-invoice:445-451`) "Commissie factureren: {partner} - €123.45" / "… heeft factuur … geregistreerd … Commissie van 15% moet worden gefactureerd." Idem verouderd; bedrag met punt. **Schrappen met de functie** (de commissiewerklijst `commission_missing_invoice`/`flag-missing` neemt dit over).
- **post_execution_invoice_check** (`check-pending-items:1074-1079`) "Factuur partner {partner} nog niet ontvangen voor "{onderdeel}"" / "De activiteit is meer dan 7 dagen geleden uitgevoerd maar er is nog geen inkoopfactuur **geregistreerd**." — woord verouderd; en de variant "… kan niet factureren …: geef project vrij" verwijst correct naar de knop "Markeer als klaar voor facturatie" (`MarkReadyForInvoiceButton.tsx:76`). **Dubbel** met **commission_missing_invoice** (`flag-missing-partner-invoices:66-74`, na 14 dagen, zelfde `auto_entity_id` = onderdeel-id, andere sleutel) "Inkoopfactuur ontbreekt: {partner} — {onderdeel} (BV-…)" / "… geen inkoopfactuur van … geregistreerd. Zonder factuur wordt er geen commissie (€ …) gefactureerd. Vraag de factuur op of factureer de commissie op verkoopwaarde." Bovendien krijgt de partner zelf al T+1 en T+7 een herinnering (`partner_invoice_reminder_t1/t7`, templates 2026-11-19, tekst klopt met de inbox-route). **Samenvoegen**: één taak per onderdeel (de flag-variant, met referentie en commissiebedrag), tekst "ontvangen in de inkoop-inbox" i.p.v. "geregistreerd", en vermelden dat de partner al automatisch herinnerd is.
- **commission_unlinked_invoice** (`flag-missing:70-77`) "Inkoopfactuur niet gekoppeld: {partner} — factuur {nummer}" / "… geregistreerd maar niet gekoppeld … Koppel de factuur of markeer hem commissievrij." Actie duidelijk; "geregistreerd" → "ontvangen". **Tekst aanpassen** (één woord).
- **commission_invoice_lost** (trigger `20261003120000…sql:61-66`) "Gefactureerd onderdeel verloor zijn inkoopfactuur: {onderdeel}" / "… commissie is al betaald/gefactureerd …". **ok.**
- **partner_post_charge** (trigger `20260603112039…sql:116-125`) "Nacalculatie van {partner}: € 1.234,00" / "… heeft een nacalculatie ingediend voor {klant} (BV-…): "…" — € … incl. BTW. Verwerk als Overige kosten of wijs af." **ok** (NL-bedrag, actie, referentie).
- **invoicing_ready** (`update-customer-program:1366-1373`, `set-project-ready-for-invoice:138-146`) "Facturatie: {klant}" / "Klant heeft de voorwaarden geaccepteerd (ONDER VOORBEHOUD — …). Taak verschijnt automatisch de dag na afloop van het event (dd)." **ok**; "event" → "programma" voor consistentie.

### Partners en onderdelen
- **partner_reminder** (`check-pending-items:295-301`) "Partner {partner} heeft niet gereageerd op "{onderdeel}"" / "… N dagen geleden aangevraagd voor {klant} … Neem contact op met de partner." **ok.**
- **partner_status_update** (`update-partner-item-status:471-477`) "Partner {partner} reageert op "{onderdeel}" — bevestigd/niet beschikbaar/alternatief voorgesteld" / "… Prijs: €12.50 Opmerking: …". Actie impliciet (beoordelen). **Zelfde sleutel wordt in `update-customer-program:847-850` en `:980-983` gebruikt voor klantacties** ("Klant {klant} akkoord op "…"", "Klant {klant} annuleert "…""): label "Partner reactie" en cluster "Inbound" kloppen dan niet. **Tekst aanpassen**: eigen sleutel voor klantacties; bedrag NL.
- **all_partners_responded** (`update-partner-item-status:711-716`) "Alle partners hebben gereageerd op BV-… ({klant})" / "… en alle bureau-items hebben een prijs. Beoordeel de reacties en stuur een status update naar de klant." "bureau-items" → "onderdelen van het bureau zelf". **Tekst aanpassen** (klein).
- **bureau_item_pricing** (`accept-quote-proposal:684-689`, `send-items-to-partners:522-527`, `AdminAddActivitySheet.tsx:242`) "Prijs invullen: "{onderdeel}" voor {klant}" / "Bureau-item "…" heeft nog geen prijs. Vul een admin prijs in." Jargon "admin prijs", "Bureau-item". **Tekst aanpassen.**
- **send_items_to_partners** (`accept-quote-proposal:500-505`) "Akkoord ontvangen: {klant} — stuur items naar partners" / "… Stuur de items nu naar de betrokken partners." "items" → "onderdelen". **Tekst aanpassen.**
- **quote_ready_to_send** (`update-customer-program:869-872`) "Alle onderdelen akkoord: {klant}" / "Alle N onderdelen zijn geaccepteerd door de klant. Programma kan definitief worden afgerond." — sleutelnaam en legacy-label "Offerte versturen"/"Verstuur offerte" passen niet bij wat er gebeurde (klant is al akkoord). Tekst zelf noemt geen concrete actie. **Tekst aanpassen** (wat moet Erwin doen: "controleer en zet door naar partners / vraag ondertekening").
- **book_ferry_tickets** (`send-items-to-partners:340-345`) "Boot boeken: "{onderdeel}" voor {klant}" / "Boek de overtocht bij Rederij Doeksen en vul de definitieve prijs in op het programmaonderdeel." **ok.**
- **availability_conflict** (trigger `20260916120000…sql:75-85`, `conflictChecker.ts:148,225`) "Beschikbaarheidsconflict: {partner} niet beschikbaar voor "{onderdeel}"" / "… sluiting van dd t/m dd (reden). Dat raakt "…" op dd in de aanvraag van {klant} (BV-…). Het programma van de klant is niet gewijzigd: overleg een alternatief." **ok** (voorbeeldig). Niet in `CLUSTER_MAP` → "Overig".
- **stale_pending_change** (DB-cron `scan_stale_pending_changes`, dagelijks 07:00, `20260524120334…sql:77-82`) "Openstaande wijziging > 7 dagen: {onderdeel}" / "Item "…" (provider …) heeft sinds dd-mm een ongepubliceerde wijziging." Engels ("Item", "provider"), jargon ("ongepubliceerde wijziging"), geen actie. **Tekst aanpassen**: "Wijziging aan "…" is al 7 dagen niet gepubliceerd naar partner/klant. Publiceer of maak ongedaan op het project."
- **people_change_notify_failed** (`update-customer-program:400-405`) "Partner-notificaties bij aantalwijziging FAALDEN — informeer handmatig" / "… Controleer de logs en informeer betrokken partners handmatig via het project." Hoofdletters en "logs". **Tekst aanpassen**: "Zie het maillog in Berichtencentrum".
- **customer_date_change_partner_notify** (`:565-575`) "Klant heeft data gewijzigd — controleer bureau-boekingen" / "… informeer partners handmatig" met uitleg. **ok**; "bureau-boekingen (overtocht, fiets, bagage)" is uitgelegd.
- **customer_practical_info_updated** (`:696-701`) "Praktische info bijgewerkt: {klant}" / "… Controleer of partners dit (via portaal en briefing T-3) meekrijgen." "T-3" is intern. **Tekst aanpassen**: "via de briefing drie dagen vooraf".
- **customer_accommodation_setup_changed** (`:764-769`) "Klant wijzigde kamers/verzorging: {klant}" / "… informeer de logiespartner(s) en laat de offerte(s) zo nodig aanpassen." **ok.**
- **customer_counter_proposal** (`:1169-1175`) "Klant {klant} stelt andere tijd voor "{onderdeel}"" / "Klant wil liever 14:00 i.p.v. 13:00 — "…"." **ok** (zie dubbele mail in Deel 1).

### Klant: offerte, akkoord, voorwaarden
- **terms_reminder** (`update-partner-item-status:650-655`) "Klant {klant} moet voorwaarden accepteren" / "Alle activiteiten zijn bevestigd. Wachtend op acceptatie van de algemene voorwaarden door de klant." Sinds 26 oktober zijn akkoord en ondertekenen één handeling in het portaal (`docs/plan-klantreis-en-ondertekening.md:198`); "voorwaarden accepteren" als losse stap is verouderd en de taak zegt niet wat Erwin doet. Dezelfde sleutel wordt door `check-pending-items:1816-1844` overschreven met de beltaak "Bel {klant}: akkoord en voorwaarden nog niet binnen (event over N dagen)" / "… Bel de klant en vraag akkoord te geven en te tekenen via {portal}." — die is goed. **Tekst aanpassen** (de eerste variant gelijktrekken: "Vraag {klant} akkoord te geven en te ondertekenen in het klantportaal").
- **quote_expiring_soon** (`check-pending-items:1389-1394`) "Offerte {klant} verloopt binnenkort" / "Stand bij aanmaken: nog N dag(en). Geldig tot dd. Neem contact op met de klant." **ok.**
- **quote_expired** (`:1449-1454`) "Offerte {klant} is verlopen — nieuw voorstel of verlengen" / "… De klant ziet "Voorstel verlopen" in het portaal. Verleng de geldigheid of stuur een nieuw voorstel." **ok.**
- **customer_status_email_due** (`:1566-1571`) "{klant} heeft nog geen akkoord op offerte" / "Stand bij aanmaken: … Overweeg een status-mail om de klant te herinneren aan akkoord, voorwaarden en facturatiegegevens." **ok** ("Stand bij aanmaken" is wat stijf maar eerlijk).
- **customer_status_update_due** (`:1649-1654`) "{klant} heeft geen recente status-update ontvangen" / "… Er staan nog onderdelen open bij partners. Overweeg een status-mail te sturen." **ok.**
- **customer_inputs_missing** (`:1736-1742`) "{klant} mist nog: gastenlijst, facturatiegegevens" / "Uitvoeringsdatum: dd. … Overweeg een status-mail om dit te bespoedigen." **ok.**
- **request_no_response** (`:725-730`) "Aanvraag {klant} is inactief" / "Stand bij aanmaken: N dagen geen activiteit van/naar klant of partner. Zie kaart voor actuele leeftijd." "kaart" (projectkaart) is intern; geen actie genoemd. **Tekst aanpassen** (klein).

### Logies
- **quote_review** (`create-quote-review-todo:127-133`) "Nieuwe logiesofferte: {partner} voor {klant} (BV-…)" / "… heeft een offerte ingediend voor "…" (€1.234). Beoordeel de offerte en stuur deze door naar de klant." **ok** (`toLocaleString()` zonder locale geeft Engelse notatie; klein).
- **forward_accommodation_quote** (`notify-accommodation-quote:322-330`) "Nieuwe logiesofferte: {partner} voor {klant}" / "… Beoordeel en stuur eventueel door naar de klant." — **fout**: `notify-accommodation-quote` is de functie die de admin aanroept om de offerte naar de klant te sturen (`AdminAccommodationDetail.tsx`; de klantmail `accommodation_quote_notification` gaat op `:296-307`). Direct daarna wordt een taak aangemaakt die vraagt de offerte door te sturen, zonder dedupe, prioriteit hoog. Wordt pas gesloten als de klant kiest (`select-accommodation-quote:340`). **Schrappen** (de insert).
- **quote_pending_partner** (`check-pending-items:406-411`) "Partner {partner} heeft niet gereageerd op logiesverzoek {klant}" / "De offerteaanvraag is N dagen geleden verstuurd …" Geen actie genoemd (bel/mail de partner). **Tekst aanpassen** (klein).
- **quote_headcount_pending_partner** (`:533-539`) "Partner … heeft het nieuwe aantal gasten voor {klant} nog niet bevestigd" / "N dagen geleden is … gevraagd 10 naar 8 gasten te bevestigen voor "…". De offerte staat nog op 10 gasten." **ok.**
- **quote_headcount_review** (`confirm-accommodation-headcount:189-192`) "Nieuw aantal bevestigd: {partner} voor {klant} (BV-…)" / "… bevestigt … voor "…". … Beoordeel het voorstel; na goedkeuring informeren wij de klant." **ok.**
- **quote_pending_customer** (`check-pending-items:641-646`) "Klant {klant} heeft nog geen logiesofferte gekozen" / "Er zijn offertes doorgestuurd naar de klant, maar er is nog geen selectie gemaakt." **ok**; `related_request_id` kan leeg zijn → wees-taak.
- **quote_expired_partner** (`:888-894`) "Logiesofferte {partner} voor {klant} is verlopen" / "… geldig tot dd. De partner heeft een notificatie ontvangen." Informatief, geen actie. **ok** (of lage prioriteit).
- **accommodation_selected** (`select-accommodation-quote:345-350`) "Logies bevestigd: {klant} → {accommodatie}" / "Klant heeft gekozen voor … Bevestigingsmail automatisch verstuurd naar klant en partner." Zuiver informatief; legacy-label "Bevestig logies"/"Logies bevestigen" suggereert actie die er niet is. **Tekst aanpassen** (label) of **schrappen** (de historie toont dit al).
- **accommodation_quote_declined** (`decline-accommodation-quote`) — niet gevonden als insert in de functie (alleen in `autoTodoTypeConfig`/`CLUSTER_MAP`); de afwijzing komt via de logies-alert. Niet verder onderzocht.
- **lodging_board_missing** (`check-pending-items:1926-1932`) "Verzorging ontbreekt bij gekozen logies ({accommodatie})" / "… De klant ziet daardoor niet wat in de prijs zit. Vul dit aan in de offerte-sheet." "offerte-sheet" is een ontwikkelaarsterm (`docs/plan-logieskeuze.md:68`); niet in `CLUSTER_MAP`. **Tekst aanpassen**: "Vul de verzorging aan bij de logiesofferte op het project."

### Na uitvoering, reviews, referenties
- **post_execution_feedback** (`check-pending-items:998-1004`, per onderdeel, prioriteit laag) "Feedback vragen aan {klant} voor "{onderdeel}"" / "… is uitgevoerd. Overweeg feedback te vragen aan de klant." en **customer_aftersales** (`:1196-1201`, per programma) "Aftersales-mail versturen aan {klant}" / "Het programma is uitgevoerd. Verstuur de aftersales-mail met de vraag om een review op Google en de eigen site." — **dubbel**: bij een programma met 15 onderdelen ontstaan 15 feedback-taken plus 1 aftersales-taak over hetzelfde. `docs/plan-reviews-oogsten.md:24` kent alleen de aftersales-taak. **Samenvoegen**: `post_execution_feedback` schrappen.
- **customer_review_low** (`customer-review:192-197`) "Lage beoordeling (2/5) van {naam}" / "BV-…: neem persoonlijk contact op. Klant schrijft: "…"" **ok.**
- **reference_case_approved** (`reference-case:188-193`) "Referentiepagina goedgekeurd door {naam}: publiceren" / "… Zet de pagina in Content → Referenties op gepubliceerd." Menu klopt (`AdminLayout` groep Content → Referenties). **ok.**
- **reference_case_feedback** (`:214-219`) "Klant wil de referentiepagina anders: {bedrijf}" / "BV-…: "…"" **ok.**
- **wedding_referral_claim** (`wedding-referral-claim:336-351`) "{partner} meldt: {namen} was al bekend" / "Eerste contact volgens de partner: dd. … Bekijk de doorverwijzing onder Doorverwijzingen. Bij een boeking is de vergoeding dan nul." **ok.**
- **partner_agreement_accepted** (trigger `20260929130000…sql:193-200`) "{partner} akkoord met "{afspraak}" (versie N)" / "Akkoord gegeven op dd door … Zie Systeem → Partnerafspraken." Menu klopt. Lage prioriteit, informatief. **ok.**

### Systeem
- **system_cron_failure** — insert faalt (status "open"), zie Deel 2. **Fout.**
- **email_webhook_silent** — tekst goed, één taak per dag. **Houden**, vaste sleutel.
- **critical_selftest_failure** — "Kritieke zelftest faalt: {labels}" + technische fix-hints. **Tekst aanpassen** (gevolg-zin).

---

## Samenvattende tabel

| Template / functie | Ernst | Actie |
|---|---|---|
| program_request_bureau | verouderd | fee-regel en "bureau-centraal model" weg; klantnaam in onderwerp; knop naar project |
| quote_request_bureau | verouderd (dode flow) | schrappen of parkeren bij plan grote groepen |
| catering_request_bureau | cosmetisch | deeplink naar project, referentie in onderwerp |
| chat_notification_bureau | fout (bronlabel WhatsApp) | labels per bron, referentie als variabele, adres via instelling |
| customer_counter_proposal_bureau | cosmetisch / dubbel | samenvoegen met taak of aanhef/onderwerp/knoptekst aanpassen |
| partner_invoice_registered_bureau | verouderd | schrappen met `register-partner-invoice` (inboxplan fase 4) |
| lodging_*_bureau (4) | cosmetisch | "Aan zet: Bureau Vlieland", knop naar logiesdetail, adres via instelling |
| wedding_referral_claim_bureau | ok | houden |
| purchase_invoice_forward (los) | ok | NL-bedragen |
| purchase_invoice_forward (verzamel) | cosmetisch | testmodus, logEmail, projectkolom leesbaar |
| bureau_invoice_forward | ok | houden |
| commission_invoice_forward | cosmetisch | UBL meesturen, weigeren zonder PDF |
| email_chain_probe | cosmetisch | paginanaam gelijktrekken |
| admin_project_email (vaste delen) | fout | groet-strip verwijderen of wrapper laat echt groeten |
| compose-followup-email / emailComposerIntents | cosmetisch | zelfomschrijving in systeemprompt |
| cron_watchdog_alert | fout | status "open" → "todo"; wat-te-doen-zin |
| critical-selftest alert | verouderd (toon) | gevolg-zin per controle, paginanaam, loggen |
| email-webhook-heartbeat alert | ok | vaste taaksleutel, loggen |
| auto-close-monitor alert | verouderd (toon) | herschrijven of samenvoegen met watchdog |
| Taak new_request_received + new_program_request | dubbel | één laten (trigger) |
| Taak purchase_invoice_inbox | verouderd | actie noemen of schrappen (teller bestaat) |
| Taak purchase_invoice_pending, commission_pending | verouderd | schrappen met functie |
| Taak post_execution_invoice_check + commission_missing_invoice | dubbel / verouderd | samenvoegen; "geregistreerd" → "ontvangen in de inkoop-inbox" |
| Taak commission_unlinked_invoice | cosmetisch | "geregistreerd" → "ontvangen" |
| Taak forward_accommodation_quote | fout | insert schrappen |
| Taak post_execution_feedback | dubbel | schrappen (customer_aftersales blijft) |
| Taak terms_reminder (eerste variant) | verouderd | tekst gelijktrekken met akkoord+tekenen |
| Taak partner_status_update voor klantacties | cosmetisch | eigen sleutel |
| Taak stale_pending_change | cosmetisch | Nederlands, actie noemen |
| Taak people_change_notify_failed, customer_practical_info_updated, bureau_item_pricing, send_items_to_partners, all_partners_responded, lodging_board_missing, request_no_response, quote_pending_partner, quote_ready_to_send | cosmetisch | jargon/Engels eruit, actie noemen |
| Taak accommodation_selected | cosmetisch | informatief maken of schrappen |
| Werkbank-weergave (ruwe sleutel, "Prio: high") | cosmetisch | labels uit `autoTodoTypeConfig` gebruiken en aanvullen; `CLUSTER_MAP`/`SYSTEM_AUTO_TYPES` aanvullen |
| Legacy-links `/admin/logies/<programma-id>` | fout (alleen legacy-pagina) | corrigeren of legacy-pagina verwijderen |
| Overige taken (new_accommodation_request, sales_inbox, availability_conflict, partner_post_charge, commission_invoice_lost, invoicing_ready, book_ferry_tickets, quote_review, quote_headcount_*, customer_status_*, customer_inputs_missing, quote_expiring_soon, quote_expired, customer_review_low, reference_case_*, wedding_referral_claim, partner_agreement_accepted, customer_counter_proposal, customer_date_change_partner_notify, customer_accommodation_setup_changed) | ok | houden |

## Niet onderzocht
- Of `noreply@bureauvlieland.nl` (afzender van de vier alarmen) een geverifieerde afzender is bij Mailjet; zo niet, komen de alarmen niet aan.
- Of `snelstart_email` en `bureau_admin_email` in productie gevuld zijn (de code valt terug op `bureauvlieland@boekhouding.nl` resp. `hallo@`).
- De werkelijke schema's van `cron-watchdog`, `auto-close-monitor`, `check-pending-items` en `flag-missing-partner-invoices` (staan alleen in `cron.job` in productie, zie inventaris regel 22).
- De HTML-structuur van de DB-templates (lijsten om `{{bureau_items}}` e.d.); de export is platte tekst.
- Of `send-catering-request` een `program_requests`-rij aanmaakt die de trigger `new_program_request` raakt (dan ook daar een taak).
- `accommodation_quote_declined`: insertplek niet gevonden; alleen de alert gecontroleerd.
- De feitelijke uitkomst van de AI-opsteller (prompt is beoordeeld, geen testverzending).
- Of een antwoord van de boekhouding op `reply+BV-…@` gewenst in het klantdossier belandt (werking wel vastgesteld, bedoeling niet).
