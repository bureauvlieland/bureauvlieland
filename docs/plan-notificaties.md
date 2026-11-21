# Notificaties: inventarisatie, advies en plan

Status: onderzoek 21 november 2026, naar aanleiding van BV-2611-0001 en de
vraag van Erwin: "Ik zou wel een notificatie willen als een partner een
activiteit bevestigt. Welke notificaties zijn er nu, aan wie, wanneer, hoe
nuttig zijn ze, wat missen we en wat is overkill?"

Bronnen: de code in `supabase/functions/**` en `src/**` (de volledige inventaris per functie staat in `docs/notificaties-inventaris-bijlage.md`), en de productiedata
(`email_log`, `admin_todos`, `cron.job`, `program_request_history`) over de
laatste 180 dagen (25 mei tot 21 november 2026).

## 0. Het korte antwoord

**De melding "partner heeft bevestigd" bestaat al, maar vernietigt zichzelf.**
Als een partner in het portaal bevestigt, maakt `update-partner-item-status`
een Werkbank-taak aan ("Partner Vliehors Expres reageert op … — bevestigd",
`auto_type: partner_status_update`). Maar zodra de Werkbank opent, draait
`reconcile-admin-todos`, en die sluit elke `partner_status_update`-taak van
een onderdeel dat `confirmed` is (`reconcile-admin-todos/index.ts:494-505`).
Dus: de taak wordt aangemaakt, en bij de eerstvolgende keer dat je de Werkbank
opent wordt hij stil afgevinkt, voordat je hem gezien hebt. Er gaat geen mail
naar het bureau. De klant krijgt wél direct een mail (`status_confirmed`).

Cijfers: 71 keer "bevestigd"-taak aangemaakt, 71 keer gesloten, 0 keer met een
reden, mediaan 17 uur na aanmaken (de tijd tot je de Werkbank weer opende).
Niemand heeft ooit op "Beoordeel reactie" geklikt, want dat kon niet.

Breder: er zijn **ruim 80 soorten e-mail** en **41 soorten Werkbank-taken**,
zonder één plek waar staat welke er zijn en voor wie. Er is geen pushkanaal
naar jou (geen app-notificatie, geen WhatsApp, geen dagelijkse samenvatting);
alles wat jij als bureau hoort komt via losse mails op `hallo@` en `erwin@`
of via de Werkbank. En er zitten twee echte fouten in de factuurherinneringen
aan partners (zie 3.3), waardoor één partner 24 herinneringen kreeg voor één
factuur en het bureau zichzelf 14 keer aan een factuur herinnerde.

## 1. Hoe het nu werkt: de kanalen

| Kanaal | Naar wie | Hoe | Volume (180 dagen) |
|---|---|---|---|
| E-mail via Mailjet (`email_log`) | klant, partner, bureau, boekhouding | ~80 `email_type`-sleutels in ~60 edge functions | 1.172 mails: 477 partner, 455 klant, 240 bureau/boekhouding |
| Werkbank-taken (`admin_todos`) | alleen jij | 41 automatische `auto_type`s plus handmatige taken | 3.800+ aangemaakt, ~120 open nu |
| Bel "Te beantwoorden" | jij | onbeantwoorde inkomende mail + ongelezen chat (één bron, `openConversations.ts`) | handvol per week |
| Chat (klantportaal, partnerportaal, website, WhatsApp) | jij ↔ klant/partner/bezoeker | bericht in portaal; jij krijgt `chat_notification` per mail (max 1 per gesprek per 5 min) | 52 mails, dalend van 18 per maand in juni naar 1 in oktober |
| Systeemalarmen | `hallo@` / `administratie@` | `cron_watchdog_alert`, kritieke zelftest, webhook-heartbeat, auto-close-monitor | 23 watchdog-mails, 19 zelftest-taken |
| WhatsApp (Twilio) | klant/partner/bezoeker | **alleen handmatig** door jou (antwoord of deelnemersbericht); inkomend komt als chat binnen | — |
| Push / sms / app-notificatie | — | **bestaat niet** | — |
| Partner: in het portaal | partner | dashboard met "wacht op jouw reactie"-lijsten (`get-partner-dashboard`) | — |
| Klant: in het portaal | klant | "Aan zet"-pillen per onderdeel | — |

Er is één centrale schakelaar: `reminder_email_enabled` in de instellingen
zet alle herinneringsmails uit `check-pending-items` tegelijk uit (de taken
blijven). Verder is er per project een snooze en per onderdeel
`skip_partner_notification`. Partners en klanten hebben geen voorkeuren.

Bureau-adres is niet eenduidig: intake en factuurregistratie gaan naar
`app_settings.bureau_admin_email` (`erwin@`), chat en tegenvoorstel hard
naar `hallo@`, logiesalarmen naar `GENERAL_CONTACT_EMAIL` (`hallo@`),
systeemalarmen met drie fallbacks (`bureau_admin_email` → `ADMIN_ALERT_EMAIL`
→ `hallo@` of `administratie@`, verschilt per functie).

Geopend-percentage: bureau 40%, klant 32%, partner 26%. Dat is laag voor
transactiemail (normaal 50 tot 70%), en bij partners betekent het dat drie van
de vier mails ongelezen blijven.

## 2. Inventaris

### 2.1 E-mails aan de klant

| Sleutel | Wanneer | 180 d | Geopend | Oordeel |
|---|---|---|---|---|
| `program_request_customer` / `catering_request_customer` / `quote_request_customer` / `accommodation_request_customer` | direct na aanvraag op de site | 9 | 67% | Houden |
| `quote_offer_customer` | jij verstuurt de offerte | 34 | 12% | Houden; lage open-rate verdient onderzoek (zie 3.4) |
| `quote_accepted_customer` | klant geeft akkoord | 11 | 18% | Houden |
| `customer_terms_request`, `_reminder_t14/_t7/_t3` | handmatig of cron; reeks tot ondertekening | 3 | 100% | Houden |
| `booking_confirmed_customer` | klant tekent | 12 | 58% | Houden |
| `status_confirmed` / `status_alternative` / `status_unavailable` | partner reageert op onderdeel | 56 | 62% | Houden, maar niet bij "alleen bevestigen"-onderdelen (al zo) |
| `counter_proposal_response` | partner reageert op tegenvoorstel klant | 2 | 50% | Houden |
| `item_added_customer_approval` | jij publiceert nieuw onderdeel | 2 | 100% | Houden |
| `item_changes_customer` | jij publiceert wijziging, of klant wijzigt zelf | 70 | 14% | **Te vaak en 16 mislukt** (zie 3.4); bundelen per dag |
| `date_change_customer` | klant wijzigt datum | 4 | 0% | Twijfel: klant deed het zelf, bevestiging overbodig |
| `guest_details_reminder` | cron, 2 weken vooraf, gegevens missen | 2 | 50% | Houden |
| `arrival_reminder` | cron, 3 tot 5 dagen vooraf | 4 | 100% | Houden; de best gelezen mail |
| `customer_aftersales_review` | handmatig (auto staat uit) | 23 | 83% | Houden |
| `customer_review_google_reminder` | cron, 7 dagen na nazorg zonder klik | ? | — | Houden |
| `accommodation_quote_notification` | jij stuurt logiesofferte door | 17 | 0% | **0% geopend bij 17 mails**: template of afzender controleren |
| `accommodation_selected_customer` | klant kiest logies | 2 | 0% | Houden |
| `accommodation_headcount_confirmed_customer` | jij keurt aantalwijziging goed | — | — | Houden |
| `cancellation_customer` | annulering | 46 | 20% | Houden (34 verschillende ontvangers: veel oude aanvragen opgeruimd) |
| `bureau_invoice_to_customer` | jij verstuurt factuur | 23 | 35% | Houden |
| `partner_customer_message` | logiespartner schrijft klant | — | — | Houden |
| `inbound_reply_to_customer` | partner antwoordt op reply-adres | 17 | 82% | Houden |
| `ticket_to_customer`, `reference_case_approval`, `program_draft_link`, `customer_link_resend`, `wedding/event_referral_customer` | handmatig / self-service | 8 | hoog | Houden |

### 2.2 E-mails aan partners

| Sleutel | Wanneer | 180 d | Geopend | Oordeel |
|---|---|---|---|---|
| `program_request_partner` | jij stuurt onderdelen; klant keurt goed; datum- of aantalwijziging; herinnering | 78 | 38% | Houden. **Zeven verschillende mails delen één sleutel** (`template_name` verschilt): datumwijziging, aantalwijziging, herinnering en nieuwe aanvraag zijn in het Berichtencentrum niet te onderscheiden |
| `reminder_activity_pending` | cron, onderdeel >3 dagen `pending`, elke 7 dagen | ? | — | Houden, maar met plafond |
| `partner_activity_unconfirmed_t7` | cron, 7 dagen vóór uitvoering nog `pending` | 17 | 35% | Houden |
| `partner_headsup_t3` | cron, 3 dagen vóór uitvoering (labelkaart noemt het `partner_briefing_t3`) | 6 | 0% | Houden; 0% geopend bij 6 is zorgelijk |
| `booking_confirmed_partner` | klant tekent | 44 | 57% | Houden |
| `item_changes_partner` | jij publiceert; klant wijzigt | 52 | 23% | Bundelen per dag (zie 3.4); 8 mislukt |
| `item_added_partner` | klant voegt onderdeel toe | 14 | 0% | Houden |
| `counter_proposal_partner` | klant doet tegenvoorstel | 2 | 0% | Houden |
| `item_cancelled_partner` / `partner_item_cancellation` | onderdeel vervalt | 1 | 100% | Houden (twee sleutels voor één ding) |
| `cancellation_partner` / `cancellation_accommodation_partner` | annulering project | 70 | 1% | **Vrijwel niemand opent dit.** Veel ervan zijn oude aanvragen die nooit tot boeking kwamen: een partner die alleen een aanvraag kreeg hoeft geen annuleringsmail. Alleen sturen als het onderdeel `confirmed`/`accepted` was |
| `accommodation_quote_request_partner` | jij stuurt logiesaanvraag (ook bij datum-/aantalwijziging) | 45 | 11% | Houden |
| `reminder_quote_pending` | cron, logiesofferte >5 dagen uit | ? | — | Houden |
| `reminder_headcount_pending` | cron, aantal nog niet bevestigd | ? | — | Houden |
| `quote_expired_partner` | cron, offerte verlopen | 0 | — | Houden |
| `accommodation_selected_partner` / `_rejected_partner` / `_quote_withdrawn` | klant kiest, jij trekt in | 4 | 50% | Houden |
| `accommodation_headcount_confirmed_partner` / `_rejected_partner` | jij beoordeelt aantal | — | — | Houden |
| `partner_invoice_reminder_t1` (feitelijk T+3) | cron, uitgevoerd en geen factuur, **elke 7 dagen opnieuw** | 43 | 23% | **Kapot** (zie 3.3) |
| `partner_invoice_reminder_t7` | cron, idem na 7 dagen, **elke 7 dagen opnieuw** | 27 | 33% | **Kapot** (zie 3.3) |
| `partner_missing_pdf_reminder` | cron en handmatig, factuur zonder pdf | 45 | 18% | Fortuna kreeg er 7; samenvoegen met de factuurreeks |
| `commission_invoice_sent` | jij verstuurt commissiefactuur | — | — | Houden |
| `partner_invitation`, `partner_intro_portal`, `partner_password_reset`, `partner_mailing` | beheer | 25 | 40% | Houden |
| `customer_accommodation_message` | klant schrijft logiespartner | — | — | Houden |
| `wedding/event_referral_partner` | doorverwijzing | 4 | 100% | Houden |

### 2.3 E-mails aan het bureau (jij) en boekhouding

| Sleutel | Wanneer | 180 d | Oordeel |
|---|---|---|---|
| `program_request_bureau` / `catering_request_bureau` / `quote_request_bureau` | nieuwe aanvraag op de site | 7 | Houden: dit is het moment waarop snelheid geld oplevert. **Maar:** er is óók een `new_program_request`-taak, en daar staan er 40 open |
| `chat_notification` | nieuw chatbericht (max 1 per 5 min per gesprek) | 52 | Houden |
| `customer_counter_proposal_bureau` | klant doet tegenvoorstel | 2 | Houden, maar als onderdeel van één patroon (zie 4) |
| `partner_invoice_registered_bureau` | partner registreert factuur | 33 | **Schrappen als mail**: er is een `purchase_invoice_inbox`-taak voor, 21 gingen naar `erwin@` en 12 naar `hallo@` (adres wisselde) |
| `lodging_quote_submitted/revised/declined_bureau`, `lodging_headcount_confirmed_bureau` | logiespartner reageert | ? | Houden: dit is precies de melding die je voor activiteiten mist. Logies heeft hem al |
| `wedding_referral_claim_bureau` | partner meldt "klant al bekend" | 0 | Houden |
| `cron_watchdog_alert` | cron, taken falen | 23 | Houden, maar 16 van de 23 waren "1 taak faalt" en de zelftest heeft nog 10 open taken; onderzoeken wat er structureel faalt |
| kritieke zelftest, webhook-heartbeat, auto-close-monitor | alarm, **niet gelogd in `email_log`** | ? | Loggen zoals de rest |
| `purchase_invoice_forward` / `bureau_invoice_forward` / `commission_invoice_forward` | jij stuurt door naar boekhouding | 97 | Houden |
| `internal_customer_cancellation` | (staat in de labelkaart, code stuurt hem niet meer) | 19 (ouder) | Opruimen uit labelkaart |

### 2.4 Werkbank-taken (`admin_todos`, automatisch)

Volumes over 180 dagen, met het gemiddelde aantal uren tot afsluiten.

**Signalen van buiten (iets gebeurde, jij moet kijken)**

| `auto_type` | Wanneer | 180 d | Open nu | Uren tot dicht | Oordeel |
|---|---|---|---|---|---|
| `new_program_request` / `new_request_received` | aanvraag binnen | 129 | 40 | 96 | 40 open: wordt niet als taak gebruikt maar als lijst. Ofwel automatisch sluiten bij offerte verstuurd, ofwel weg |
| `new_accommodation_request` | logiesaanvraag | 10 | 1 | 71 | Houden |
| `partner_status_update` | partner reageert | 78 | 0 | 30 (mediaan 17) | **Sluit zichzelf voor je hem ziet** (zie 0) |
| `all_partners_responded` | alle partners hebben gereageerd | 10 | 1 | 120 | Houden: dit is het eigenlijke actiemoment |
| `customer_counter_proposal` | klant doet tegenvoorstel | 2 | 1 | 170 | Houden |
| `customer_cancellation` | klant annuleert | 16 | 0 | 66 | Houden |
| `customer_date_change_partner_notify` | klant wijzigt datum | 4 | 0 | 89 | Houden |
| `customer_practical_info_updated` | klant wijzigt gastenlijst/dieet | 2 | 1 | 595 | Houden |
| `inbound_email` | (afgeschaft in fase 1 Berichtencentrum) | 61 | 1 | 106 | Laatste exemplaar opruimen |
| `sales_inbox` / `purchase_invoice_inbox` / `purchase_invoice_pending` | mail in salesinbox / factuurinbox | 137 | 6 | 10 tot 205 | Houden |
| `quote_review` / `forward_accommodation_quote` / `accommodation_selected` / `accommodation_quote_declined` | logies | 21 | 0 | 4 tot 151 | Houden |
| `availability_conflict` | dubbele boeking | 2 | 2 | — | Houden, high |
| `wedding_referral_claim`, `reference_case_approved`, `partner_post_charge` | diversen | 3 | 2 | — | Houden |

**Herinneringen aan jezelf (termijn verstrijkt)**

| `auto_type` | Wanneer | 180 d | Open nu | Uren tot dicht | Oordeel |
|---|---|---|---|---|---|
| `customer_inputs_missing` | gegevens klant ontbreken | 924 | 3 | 8 | **Churn**: dagelijks aangemaakt en binnen een dag weer gesloten; laatste 30 dagen niet meer in de top, dus al grotendeels gedempt |
| `customer_status_update_due` | klant lang geen update | 783 | 5 | 5 | idem |
| `customer_status_email_due` | idem, mailvariant | 739 | 2 | 8 | idem, dubbel met de vorige |
| `quote_expiring_soon` | offerte verloopt | 305 | 0 | 4 | idem |
| `request_no_response` | aanvraag zonder reactie | 92 | 2 | 103 | Houden |
| `quote_pending_customer` / `quote_pending_partner` / `quote_expired_partner` | offerte wacht | 31 | 1 | 4 tot 103 | Houden |
| `stale_pending_change` | wijziging niet gepubliceerd | 62 | 0 | 30 | Houden; 19 in 30 dagen, elke dag één |
| `terms_reminder` | alles bevestigd, nog niet getekend | 9 | 0 | 28 | Houden |
| `send_items_to_partners` | akkoord klant, nog niet naar partners | 84 | 0 | 0,1 | Sluit zichzelf vrijwel direct: vermoedelijk wordt hij aangemaakt én meteen afgehandeld. Controleren of hij ooit nuttig is |
| `book_ferry_tickets` | boottickets regelen | 12 | 2 | 232 | Houden |
| `lodging_board_missing` | logiesbord leeg | 9 | 4 | 380 | Houden |

**Na uitvoering en financieel**

| `auto_type` | Wanneer | 180 d | Open nu | Uren tot dicht | Oordeel |
|---|---|---|---|---|---|
| `post_execution_feedback` | 1 dag na uitvoering | 20 | 4 | 328 | Dubbel met `customer_aftersales`; één van de twee |
| `post_execution_invoice_check` | 7 dagen na uitvoering geen factuur | 9 | 0 | 198 | Dubbel met `commission_missing_invoice` |
| `commission_missing_invoice` | partnerfactuur ontbreekt | 85 | 20 | 239 | **45 in 30 dagen, elke 15 uur dicht en weer open**: churn, zelfde oorzaak als 3.3 |
| `commission_unlinked_invoice` | factuur niet gekoppeld | 63 | 11 | 205 | Houden |
| `commission_pending` / `invoicing_ready` | facturatie kan | 51 | 3 | 23 tot 287 | Houden |
| `critical_selftest_failure` | zelftest faalt | 19 | 10 | 141 | 10 open: of het is structureel kapot of het alarm is te gevoelig |

### 2.5 Wat partners en klanten in hun portaal zien

Partners hebben geen notificatie-instellingen. Het partnerdashboard rekent bij
elk bezoek opnieuw uit wat aandacht vraagt (`partnerWerkbank.ts`: te
beoordelen, te bevestigen, te factureren) en toont een chatbadge; er wordt
niets als "nieuw" bewaard. 44 van de 51 partners hebben
een portaallogin, 13 logden de laatste 90 dagen in, 9 de laatste 30 dagen.
Het portaal is dus voor de meeste partners geen plek waar ze iets "zien";
de mail is het kanaal. Dat maakt het open-percentage van 26% extra pijnlijk.

Klanten zien in het portaal per onderdeel wie aan zet is; e-mail is ook
hier het enige actieve kanaal.

## 3. Bevindingen

### 3.1 Wat ontbreekt

1. **Partner bevestigt, wijst af of stelt alternatief voor: jij hoort niets.**
   De taak sluit zichzelf (zie 0). Voor logies bestaat de bureau-mail wél
   (`lodging_quote_submitted_bureau`). Voor activiteiten niet.
2. **Klant geeft akkoord op offerte: geen melding aan jou.** Alleen een taak
   `send_items_to_partners`, die binnen 6 minuten gemiddeld weer dicht is.
   Het belangrijkste moment in de klantreis komt niet bij je binnen.
3. **Klant tekent voorwaarden: geen melding aan jou.** De klant en de partners
   krijgen mail; het bureau krijgt alleen een taak `invoicing_ready`
   ("facturatie kan"), die niet zegt dát er getekend is.
4. **Klant annuleert: geen mail meer** (de code voor
   `internal_customer_cancellation` is weg, de taak `customer_cancellation`
   blijft). Discutabel of dat erg is; de taak staat in de Werkbank.
5. **Geen dagelijks overzicht.** Je krijgt losse mails op twee adressen en een
   Werkbank die je moet openen. Geen enkel kanaal bereikt je telefoon.
6. **Partner markeert als uitgevoerd** (16 keer in 180 dagen): geen melding op
   dat moment; pas een dag later een taak `post_execution_feedback`.

### 3.2 Wat overkill of ruis is

1. **Factuurherinneringen aan partners zonder plafond** (3.3): 24 mails voor
   één lunchbuffet.
2. **`item_changes_customer` en `item_changes_partner`** (122 mails, 14 tot 23%
   geopend, 24 mislukt): elke publicatie is een mail. Wie drie keer op een dag
   iets aanpast, stuurt drie mails.
3. **Annuleringsmails aan partners die alleen een aanvraag kregen** (70 mails,
   1% geopend).
4. **`partner_invoice_registered_bureau`** (33 mails) terwijl de factuur ook als
   taak in je inbox staat.
5. **Werkbank-churn**: `customer_inputs_missing`, `customer_status_update_due`,
   `customer_status_email_due` en `quote_expiring_soon` zijn 2.751 keer
   aangemaakt en gemiddeld binnen 8 uur weer gesloten. Dat is de reconciler
   die elke dag opnieuw hetzelfde concludeert. Het is de laatste maand veel
   minder, maar `commission_missing_invoice` (45 in 30 dagen) doet het nog.
6. **Dubbele taken voor hetzelfde moment**: `post_execution_feedback` naast
   `customer_aftersales`, `post_execution_invoice_check` naast
   `commission_missing_invoice`, `customer_status_update_due` naast
   `customer_status_email_due`, `new_program_request` naast
   `new_request_received` en naast de intake-mail.
7. **40 open `new_program_request`-taken.** Dat is geen werkvoorraad meer, dat
   is behang. Elke open taak die je nooit afvinkt maakt de teller boven de
   Werkbank betekenisloos.

### 3.3 Wat kapot is

1. **Factuurherinneringen herhalen elke week, T+3 en T+7 tegelijk, zonder
   einde.** `check-pending-items` dedupliceert op "zelfde type, zelfde
   ontvanger, zelfde onderdeel, laatste 7 dagen" (`REMINDER_REPEAT_DAYS = 7`,
   `check-pending-items/index.ts:6,139-155`). Na dag 7 zijn beide voorwaarden
   (T+3 én T+7) waar, dus elke week gaan er twee mails, voor altijd. Zuiver
   Traiteur kreeg voor "Luxe Lunchbuffet" (31 mei, BV-2605-0001) sinds 8
   september elke week beide mails: 12 keer T+3 plus 12 keer T+7.
2. **De dedupe-check breekt zodra er twee rijen zijn.** De check gebruikt
   `.maybeSingle()`; bij meer dan één match geeft Supabase een fout, `data` is
   `null`, en de code concludeert "nog niet verstuurd". Daardoor kreeg
   `hallo@bureauvlieland.nl` voor "Tandems" (BV-2608-0002, bureau-onderdeel met
   `provider_id = 'bureau'` maar `block_type = 'activity'`) 14 herinneringen in
   10 dagen, tot 5 per dag. De uitsluiting van bureau-onderdelen kijkt alleen
   naar `block_type !== 'bureau'` (`:1019,1092`) terwijl `isBureauItem()` in
   `_shared/bureau-item.ts` er al is en wel naar `provider_id` kijkt.
3. **`partner_status_update` wordt door de reconciler gesloten op
   `status = confirmed`**, terwijl dat juist de status is waarin de taak
   wordt aangemaakt (`reconcile-admin-todos/index.ts:494-505`).
4. **Mailjet-fout "ReplyTo type mismatch"** op `item_changes_customer` en
   `item_changes_partner`: 24 mails nooit aangekomen in mei tot juli. Sinds
   juli niet meer gezien; de code is vermoedelijk al gerepareerd, maar de
   klanten van toen hebben die wijzigingen nooit gekregen.
5. **Labelkaart loopt uit de pas.** 21 sleutels die de code produceert staan
   niet in `emailTypeLabels.ts` (o.a. `partner_headsup_t3`,
   `reminder_activity_pending`, `lodging_quote_submitted_bureau`,
   `commission_invoice_sent`), en 7 actieve labels worden niet meer
   geproduceerd. In het Berichtencentrum zien die mails eruit als een
   technische sleutel.
6. **Drie alarmmails staan niet in `email_log`** (zelftest, heartbeat,
   auto-close-monitor): ze zijn onzichtbaar in het Berichtencentrum en de
   suppressiecontrole.
7. **De watchdog-taak `system_cron_failure` is nooit aangemaakt.**
   `cron-watchdog/index.ts:107` zet `status: "open"`, maar de tabel staat
   alleen `todo`, `in_progress`, `done` en `dismissed` toe. Nul rijen in de
   database. Alleen de mail komt aan.
8. **Twee dingen zijn gebouwd maar nergens getoond**: de partner-teller
   "wijzigingen sinds je laatste bezoek" (`changesSinceLastSeen` in
   `get-partner-dashboard`, kolom `last_dashboard_seen_at`) en de teller van
   open taken in `AdminLayout.tsx` (`useOpenTodoCount`, zonder badge).

### 3.4 Wat onderzoek verdient

- `quote_offer_customer` 12% geopend, `accommodation_quote_notification` 0%
  bij 17 mails, `partner_headsup_t3` 0% bij 6. Of de tracking faalt bij
  mails met bijlage, of de mails komen in spam. Tien steekproeven in Mailjet
  geven het antwoord.
- `cron_watchdog_alert`: 16 van 23 waren "1 taak faalt" en er staan 10
  zelftesttaken open. Welke taak faalt elke keer?

## 4. Advies

**Eén principe voor het bureau: elke actie van een klant of partner is een
gebeurtenis, en jij kiest per gebeurtenis of je hem als mail, als taak of
alleen in de tijdlijn wilt.** Nu is dat per functie anders besloten, met het
resultaat hierboven.

Concreet:

1. **Een "gebeurtenis van buiten" is nooit een taak die zichzelf sluit.**
   Partner bevestigt, klant geeft akkoord, klant tekent, partner markeert
   uitgevoerd: dat zijn meldingen die jij wegklikt, niet de reconciler. In de
   Werkbank krijgen ze een eigen cluster ("Binnengekomen"), gesorteerd op
   tijd, en ze gaan pas dicht als jij ze gezien hebt of na 7 dagen (zoals
   `all_partners_responded` nu al).
2. **Daarnaast een korte bureau-mail voor de vijf momenten die er toe doen**,
   naar één adres (`bureau_admin_email`), met dezelfde opzet als
   `lodging-bureau-alert.ts`: partner reageert op onderdeel (bevestigd,
   niet beschikbaar, alternatief), klant akkoord op offerte, klant tekent,
   klant tegenvoorstel (bestaat al), nieuwe aanvraag (bestaat al). Niet voor
   "uitgevoerd" en niet voor factuurregistratie; die blijven taak.
3. **Herinneringsreeksen krijgen een plafond en een escalatie**: T+3, T+7,
   T+14 aan de partner, en daarna een taak voor jou in plaats van nog een
   mail. Nooit twee herinneringen op één dag voor hetzelfde onderdeel.
4. **Wijzigingsmails bundelen**: wijzigingen aan klant en partner gaan
   maximaal één keer per dag per ontvanger per dossier, 's avonds, tenzij jij
   bij publiceren "nu sturen" kiest. Datumwijzigingen blijven direct.
5. **Annuleringsmail aan partners alleen bij een bevestigd of geaccepteerd
   onderdeel.** Een partner die alleen een aanvraag kreeg, krijgt niets.
6. **Schrappen**: `partner_invoice_registered_bureau` (mail),
   `customer_status_email_due` (taak, dubbel), `post_execution_feedback`
   (taak, dubbel met nazorg), `post_execution_invoice_check` (taak, dubbel met
   commissiecontrole), `new_request_received` (dubbel met
   `new_program_request`), het laatste `inbound_email`-exemplaar.
7. **`new_program_request` sluit automatisch** zodra de offerte verstuurd is
   of de aanvraag gearchiveerd. De 40 open exemplaren eenmalig sluiten.
8. **Een dagelijkse samenvatting om 7:30** naar `bureau_admin_email`: wat er
   gisteren binnenkwam (gebeurtenissen uit punt 1), wat vandaag verloopt
   (herinneringen), en wat langer dan 3 dagen open staat. Dit vervangt geen
   enkele directe mail; het is het vangnet voor wat je gemist hebt. Als dit
   er is, kun je later besluiten de losse bureau-mails uit punt 2 uit te
   zetten.
9. **Nog geen push of WhatsApp naar jou.** Eén admin, een handvol
   gebeurtenissen per dag: mail plus Werkbank is genoeg als die twee kloppen.
   Als de dagelijkse samenvatting na een maand niet volstaat, is een
   WhatsApp-bericht via de bestaande Twilio-koppeling (`whatsapp-send`) een
   middag werk.
10. **Niet doen**: notificatievoorkeuren voor partners of klanten. Negen
    partners gebruiken het portaal; de rest leest mail. Eerst de mails
    minder en beter maken, dan pas instellingen.

## 5. Plan

### Fase 1 — Reparaties (1 bouwdag)

- `reconcile-admin-todos`: `partner_status_update` niet meer sluiten op
  `confirmed`; sluiten na 7 dagen of als jij hem afvinkt. Test erbij.
- `check-pending-items`: factuurherinneringen T+3 / T+7 / T+14 elk precies
  één keer (dedupe zonder tijdvenster, met `.limit(1)` in plaats van
  `.maybeSingle()`), bureau-onderdelen uitsluiten via `isBureauItem()`, en na
  T+14 een taak `commission_missing_invoice` met prioriteit high in plaats
  van verdere mail. Hetzelfde patroon voor `reminder_activity_pending` en
  `reminder_quote_pending`.
- Eenmalige migratie: de 40 open `new_program_request`-taken sluiten waar de
  aanvraag al een offerte of archiefstatus heeft; het laatste
  `inbound_email`-exemplaar sluiten.
- Labelkaart `emailTypeLabels.ts` bijwerken met de 21 ontbrekende sleutels,
  de 7 dode labels verwijderen, en een test die controleert dat elke sleutel
  die in `supabase/functions` gelogd wordt een label heeft (zoals
  `reconcileTodosContract.test.ts` dat voor taken doet).
- De drie alarmmails via `logEmail` laten lopen; `cron-watchdog` zet de taak
  op `todo` in plaats van `open`.

### Fase 2 — Gebeurtenissen van buiten (2 bouwdagen)

- Eén helper `_shared/bureau-event.ts` naar het model van
  `lodging-bureau-alert.ts`: maakt een taak in cluster `inbound` én stuurt
  optioneel een korte bureau-mail, met idempotency-sleutel, naar
  `bureau_admin_email`. Alle bureau-meldingen (chat, tegenvoorstel, logies,
  intake) gaan door deze helper, zodat het adres één keer bepaald wordt.
- Aanroepen vanuit `update-partner-item-status` (bevestigd, niet beschikbaar,
  alternatief, uitgevoerd), `accept-quote-proposal` (klant akkoord),
  `update-customer-program` (klant tekent; datumwijziging bestaat al als
  taak).
- Werkbank: cluster "Binnengekomen" bovenaan, op tijd gesorteerd, met
  "gezien"-knop; teller in de zijbalk telt dit cluster apart.
- `new_program_request` sluit automatisch bij offerte verstuurd of archief.

### Fase 3 — Minder ruis (2 bouwdagen)

- Wijzigingsmails (`item_changes_*`) bundelen per ontvanger per dag via een
  wachtrijtabel `pending_change_notifications` en een avondcron; knop "nu
  sturen" in `PublishChangesDialog`.
- Annuleringsmail aan partners alleen bij `confirmed`/`accepted`/
  `executed`-onderdelen.
- `partner_invoice_registered_bureau` als mail uit; blijft taak.
- Dubbele taken samenvoegen: `customer_status_email_due` in
  `customer_status_update_due`, `post_execution_feedback` in
  `customer_aftersales`, `post_execution_invoice_check` in
  `commission_missing_invoice`, `new_request_received` in
  `new_program_request`. `reconcileTodosContract.test.ts` bijwerken.
- Reconciler: taken die hij sluit krijgen altijd een `completion_reason`, zodat
  de churn meetbaar wordt (nu heeft 99% van de 3.800 sluitingen geen reden).

### Fase 4 — Dagelijkse samenvatting en meting (1 bouwdag)

- Edge function `send-bureau-daily-digest`, cron 7:30 NL: gebeurtenissen van
  gisteren, herinneringen van vandaag, alles langer dan 3 dagen open, plus
  het aantal mails dat gisteren mislukte. Eén mail, ook als er niets is
  ("Niets nieuws").
- Meetquery in dit document: mails per type per maand, open-percentage per
  ontvangersgroep, taken aangemaakt versus gesloten door de reconciler, en
  het aantal herinneringen per onderdeel (moet nooit boven 3 komen). Over
  een maand opnieuw draaien.

Totaal 6 bouwdagen. Fase 1 kan direct en lost de vraag uit BV-2611-0001 én de
twee fouten in de factuurherinneringen op.

## Beslissingen voor Erwin

1. **Partnerreactie als taak die blijft staan tot je hem gezien hebt, plus een
   korte bureau-mail?** Advies: ja, beide; de mail kan uit zodra de
   dagelijkse samenvatting er is.
2. **Factuurherinneringen op maximaal drie, daarna taak voor jou?** Advies: ja.
3. **Wijzigingsmails aan klant en partner bundelen per dag?** Advies: ja, met
   een "nu sturen"-knop voor haast.
4. **Annuleringsmails alleen aan partners met een bevestigd onderdeel?**
   Advies: ja.
5. **De zes dubbele taken en de factuurregistratie-mail schrappen?** Advies:
   ja.
6. **Dagelijkse samenvatting om 7:30?** Advies: ja, en na een maand bekijken
   of de losse bureau-mails dan nog nodig zijn.

## Meetqueries

Mails per type en open-percentage, laatste 30 dagen:

```sql
select email_type, count(*) n,
  round(100.0 * count(*) filter (where status in ('opened','clicked')) / count(*)) pct_geopend,
  count(*) filter (where status in ('failed','bounced','blocked','dlq')) mislukt
from email_log
where created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
```

Herinneringen per onderdeel (mag nooit boven 3 komen):

```sql
select related_item_id, email_type, count(*)
from email_log
where email_type in ('partner_invoice_reminder_t1','partner_invoice_reminder_t7',
                     'partner_invoice_reminder_t14','reminder_activity_pending',
                     'reminder_quote_pending')
group by 1,2 having count(*) > 3 order by 3 desc;
```

Werkbank-churn: taken per type, hoe snel ze dichtgaan en door wie:

```sql
select auto_type, count(*) n,
  round(avg(extract(epoch from (completed_at - created_at)) / 3600)) uren_tot_dicht,
  count(*) filter (where completion_reason is null and completed_at is not null) dicht_zonder_reden
from admin_todos
where created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
```

Nulmeting 21 november 2026: 1.172 mails in 180 dagen (partner 26% geopend,
klant 32%, bureau 40%); maximaal 14 herinneringen voor één onderdeel; 3.645
van de 3.677 gesloten taken zonder reden.
