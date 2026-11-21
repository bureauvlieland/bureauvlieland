# Notificaties: inventarisatie, advies en plan

Status: onderzoek 21 november 2026, naar aanleiding van BV-2611-0001 en de
vraag van Erwin: "Ik zou wel een notificatie willen als een partner een
activiteit bevestigt. Welke notificaties zijn er nu, aan wie, wanneer, hoe
nuttig zijn ze, wat missen we en wat is overkill?"

Bronnen: de code in `supabase/functions/**` en `src/**` (de volledige inventaris per functie staat in `docs/notificaties-inventaris-bijlage.md`, de inhoudelijke audit van alle teksten in `docs/notificaties-audit-inhoud.md`), en de productiedata
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

### Samenhang met de nieuwe factuurroute

Sinds 17 november mailen partners hun factuur-pdf naar de inkoop-inbox in
plaats van hem in het portaal te registreren (`plan-inkoopfacturen-via-inbox.md`,
fase 1 gebouwd; fase 2 tot 4 gepland). Dat raakt vijf notificaties: de
bureau-mail en twee taken bij portaalregistratie en de herinnering "factuur
zonder pdf" verdwijnen met die route; de herinneringen T+3 en T+7 blijven
en worden juist belangrijker, maar moeten dan wel weten dat een mail in de
inbox ook een factuur is (zie 3.3, punt 9). De ontvangstbevestiging aan de
partner uit fase 2 van dat plan is de notificatie die daar nog bij hoort.

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
| `partner_invoice_reminder_t1` (feitelijk T+3) | cron, uitgevoerd en geen factuur, **elke 7 dagen opnieuw** | 43 | 23% | **Kapot** (zie 3.3). Tekst is sinds 17 november "mail de pdf naar de inbox"; blijft de kern van de nieuwe factuurroute |
| `partner_invoice_reminder_t7` | cron, idem na 7 dagen, **elke 7 dagen opnieuw** | 27 | 33% | **Kapot** (zie 3.3) |
| `partner_missing_pdf_reminder` | cron en handmatig, in het portaal geregistreerde factuur zonder pdf | 45 | 18% | **Vervalt** met de portaalregistratie (`plan-inkoopfacturen-via-inbox.md` §3.7, fase 4); Fortuna kreeg er 7 |
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
| `partner_invoice_registered_bureau` | partner registreert factuur in het portaal | 33 | **Vervalt vanzelf**: de portaalregistratie staat sinds 17 november uit (`partner_invoice_registration_enabled`) en `register-partner-invoice` gaat weg in fase 4 van `plan-inkoopfacturen-via-inbox.md`. De inkoop-inbox maakt een taak `purchase_invoice_inbox`; dat is genoeg |
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
| `new_program_request` / `new_request_received` | aanvraag binnen | 129 | 0 (40 weggeklikt) | 96 | 40 van de 101 zijn met "verwijderen" weggeklikt in plaats van afgevinkt: wordt niet als taak gebruikt. Automatisch sluiten bij offerte verstuurd |
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
| `commission_pending` / `purchase_invoice_pending` | partner registreerde factuur in het portaal | 66 | 5 | 23 tot 205 | **Vervallen** met `register-partner-invoice` (fase 4 inkoopfacturenplan); de inbox-route maakt `purchase_invoice_inbox` |
| `invoicing_ready` | klant tekent of jij geeft vrij | 18 | 1 | 287 | Houden |
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
7. **Partner mailt zijn factuur-pdf en hoort niets terug.** De
   ontvangstbevestiging en de afwijzing ("geen leesbare pdf") staan gepland
   in fase 2 van `plan-inkoopfacturen-via-inbox.md` (§3.3) en zijn nog niet
   gebouwd. Tot die tijd ziet de partner het alleen in het portaal, en 9 van
   de 51 partners kijken daar.

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
7. **40 weggeklikte `new_program_request`-taken.** Van de 101 taken "nieuwe
   aanvraag" zijn er 40 niet afgevinkt maar met "verwijderen" weggeklikt
   (status `dismissed`). Een taak die je structureel wegklikt is geen taak.
   (Correctie 21 november: de eerste versie van dit rapport noemde ze
   "open"; de Werkbank telt `dismissed` niet mee.)

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
   Dat het tot vijf keer per dag ging komt doordat `check-pending-items` niet
   alleen om 8:00 draait: `reconcile-admin-todos` roept hem aan het eind ook
   aan (`reconcile-admin-todos/index.ts:616`), en de Werkbank draait die
   elke 5 minuten zolang hij open staat. Elke herinneringscheck draait dus
   feitelijk de hele dag door.
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
9. **De factuurherinnering kijkt niet in de inkoop-inbox.** `hasInvoice` in
   `check-pending-items` (`:931-943`, via `_shared/partner-invoice-presence.ts`)
   kent alleen `partner_purchase_invoices`, allocaties en het factuurnummer op
   het onderdeel. Een pdf die de partner netjes naar
   `invoices@reply.bureauvlieland.nl` mailde maar die nog in
   `purchase_invoice_inbox` op verwerking wacht, telt niet. In de nieuwe route
   is dat precies het normale geval: de partner krijgt dan T+3 en T+7 terwijl
   hij al gedaan heeft wat we vroegen. Op dit moment staat er niets open in
   de inbox, dus het is nog niet misgegaan, maar het gaat misgaan zodra je
   een paar dagen niet verwerkt.
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
6. **Schrappen**: `customer_status_email_due` (taak, dubbel), `post_execution_feedback`
   (taak, dubbel met nazorg), `post_execution_invoice_check` (taak, dubbel met
   commissiecontrole), `new_request_received` (dubbel met
   `new_program_request`), het laatste `inbound_email`-exemplaar.
   `partner_invoice_registered_bureau`, `partner_missing_pdf_reminder`,
   `commission_pending` en `purchase_invoice_pending` hoeven hier niet apart:
   die verdwijnen met de portaalregistratie in fase 4 van het
   inkoopfacturenplan.
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

### Fase 0 — Inhoudelijke audit van alle teksten (uitgevoerd 21 november)

Aanleiding: de inkoopfacturen-misser liet zien dat het onderzoek naar het
mechanisme (wie, wanneer) niets zei over de inhoud (wat staat erin, klopt
dat nog). Daarom zijn alle 59 database-templates, de mails met eigen HTML in
39 edge functions en de teksten van alle Werkbank-taken getoetst aan de
huidige werkwijze in `docs/`, de routes in `src/App.tsx` en de code die de
variabelen vult. Het volledige verslag per mail staat in
`docs/notificaties-audit-inhoud.md` (64 mails en taakgroepen, elk met
regelnummers). De kern:

**Fouten (mail gaat niet, komt verkeerd aan of zegt iets onwaars)**

1. `quote_expired_partner` gaat nooit weg: in de lus overschaduwt
   `const req = quote.request` de HTTP-request, `req.headers.get` gooit een
   fout, de `catch` slikt hem in (`check-pending-items/index.ts:790,838`).
   De offerte staat dan wel op verlopen en de Werkbank-taak zegt "de partner
   heeft een notificatie ontvangen". Dit verklaart de 0 verzendingen in 180
   dagen.
2. Antwoorden op commissiefacturen verdwijnen: het antwoordadres is
   `reply+BVC-…@`, maar `inbound-email` kent alleen `BV-` en `LOG-`
   (`send-commission-invoice-to-partner:227`, `inbound-email:712-723`).
3. `partner_missing_pdf_reminder` linkt naar `/partner/financieel`, een route
   die niet bestaat (404), en beschrijft een knop "PDF toevoegen" die weg is.
4. Twee klantmails bij één partnerreactie op een tegenvoorstel:
   `counter_proposal_response` én `status_*` (geen `else`,
   `update-partner-item-status:485,730`); twee keer gebeurd.
5. Twee klantmails bij "akkoord en ondertekenen" in één klik:
   `booking_confirmed_customer` én `quote_accepted_customer`
   (`CustomerProgram.tsx:259-269`); in de code sinds fase 4 van de klantreis,
   in de data nog niet voorgekomen.
6. De Werkbank-taak `forward_accommodation_quote` ("stuur de offerte door")
   wordt aangemaakt door precies de functie die de offerte net heeft
   doorgestuurd (`notify-accommodation-quote:322-330`): 23 keer aangemaakt,
   23 keer zonder reden gesloten.
7. `accommodation_selected_customer` toont "€ € 1.234,00" (dubbel euroteken)
   en belooft de klant dat "de accommodatie contact opneemt", terwijl de
   partnermail zegt dat "Bureau Vlieland contact opneemt met de gast".
8. `cancellation_customer` en `date_change_customer` beweren dat "alle
   aanbieders automatisch op de hoogte zijn gesteld", ook als dat niet is
   gebeurd (annulering door jou zonder partnermelding; mislukte
   datumwijziging).
9. `item_changes_partner` zegt "De klant heeft wijzigingen doorgevoerd" ook
   als jij publiceert, en zet partner- en klantnaam ongesanitized in de mail.
10. `item_added_partner` toont "Voorkeurstijd: Voorkeurstijd: 10:00" (label
    in code én template).
11. `chat_notification_bureau` noemt elk WhatsApp-bericht "Klantportaal" met
    e-mail "onbekend"; `chat_reply_visitor` overschrijft het onderwerp met
    referentie uit de code door een vast template-onderwerp.
12. `send-project-email` knipt "Met vriendelijke groet, Bureau Vlieland" van
    het eind omdat "de wrapper die toevoegt", maar de wrapper doet dat niet:
    de mail gaat zonder afsluiting.
13. `program_draft_link` heeft `info@bureauvlieland.nl` in de voettekst;
    `catering_request_customer` belooft "binnen 2 werkdagen" waar de site 5
    zegt.
14. De watchdog-taak `system_cron_failure` wordt nooit aangemaakt (status
    "open", al in 3.3 genoemd).

**Verouderd (zegt iets dat niet meer zo werkt), vooral facturatie**

- Zeven partnermails geven nog de oude factuurinstructie ("upload in het
  portaal", "Factuur registreren", `inkoop@reply.bureauvlieland.nl`, "je
  ontvangt apart bericht via het portaal"): `send-items-to-partners:140`,
  `accept-quote-proposal:175`, de templates `program_request_partner`,
  `booking_confirmed_partner` (plus fallback), `partner_invitation`,
  `accommodation_selected_partner`, en `send-partner-headsup-t3:292`. Dat
  zijn precies de mails die partners het vaakst krijgen (130 in 180 dagen).
  Overal moet dezelfde zin: "Mail na uitvoering de pdf van je factuur naar
  invoices@reply.bureauvlieland.nl met onze referentie {{reference_number}}
  erop. Wij factureren centraal aan de klant."
- De factuurherinneringen T+3/T+7 behandelen elk onderdeel als
  offerte-onderdeel met bureaufactuur: een mededeling of een onderdeel op de
  verblijfsnota krijgt "factuur ontbreekt". De T+3-template zegt "Gisteren"
  terwijl de mail na drie dagen gaat.
- `program_request_partner` kent in de template geen onderscheid tussen
  bevestiging, offerte en mededeling (`plan-afhandeling-onderdelen.md`);
  alleen `send-items-to-partners` doet dat. Dezelfde mail bestaat drie keer
  (twee inline kopieën en een template) en loopt uit elkaar.
- `send-partner-headsup-t3` selecteert alleen status `accepted`; een door de
  partner bevestigd onderdeel (`confirmed`) krijgt geen briefing. De
  database-template `partner_briefing_t3` wordt nergens gebruikt.
- `booking_confirmed_customer` zegt "Alle activiteiten zijn nu definitief"
  terwijl de code er een "onder voorbehoud"-blok voor plakt.
- `program_request_bureau` toont altijd "Handling fee: € 0" en heeft geen
  link naar het project; `program_request_customer` is nooit aangepast aan
  het huidige aanvraagformulier.
- `terms_reminder` (eerste variant) vraagt om "voorwaarden accepteren" als
  losse stap; akkoord en tekenen zijn sinds 26 oktober één handeling.
- Werkbank-taken rond inkoopfacturen zeggen "geregistreerd" waar het nu
  "ontvangen in de inkoop-inbox" is (`post_execution_invoice_check`,
  `commission_missing_invoice`, `commission_unlinked_invoice`,
  `purchase_invoice_pending`, `commission_pending`).

**Dood (bestaat, wordt niet gebruikt)**

- Functies zonder aanroeper: `send-quote-request` (met beide
  `quote_request_*`-templates), `notify-partners-informational`,
  `notify-partner-item-deletion`, `send-partner-intro-email`.
- Templates die geen code rendert: `partner_briefing_t3`,
  `proforma_commission_notification` (beschrijft een bezwaarronde die niet
  bestaat), `cancellation_accommodation_partner` (code gebruikt eigen HTML),
  `sales_followup_offer_3d/_7d`, `sales_pre_signing`,
  `sales_post_signing_welcome`, `presales_*` (vier stuks).

**Toon en vorm**

- Partners worden in 24 van 25 templates getutoyeerd ("Hoi … je"); negen
  inline mails zeggen "Beste … u" (aantalwijziging, headcount-beoordeling,
  intrekking, commissiefactuur, admin-wachtwoordreset, en de bulkvariant). De
  klant krijgt "u", maar zes fallbacks tutoyeren.
- Ruim twintig inline mails gaan zonder de huisstijlwrapper (geen logo, geen
  voettekst met KvK en IBAN), waaronder de drie belangrijkste partnermails.
- De meeste onderwerpregels missen het BV- of LOG-nummer; bedragen in
  bureau- en boekhoudmails staan als "€1234.50".
- De Werkbank toont de ruwe sleutel (`purchase_invoice_inbox`) en "Prio:
  high" naast de taak; de Nederlandse labels in `autoTodoCreator.ts` worden
  alleen op de verborgen legacy-pagina gebruikt en missen voor ruim twintig
  sleutels. Zes legacy-links wijzen naar `/admin/logies/<programma-id>` waar
  een logies-id hoort.
- Twee adresbronnen voor "het bureau": helft via de instelling
  `bureau_admin_email`, helft hard `hallo@`. Zolang die gelijk zijn merk je
  niets; zodra je de instelling wijzigt, gaat de helft ergens anders heen.

**Wat dit betekent voor het plan**

De audit voegt werk toe aan fase 1 (de fouten 1 tot 6 en 14) en maakt fase 3
groter: niet alleen minder mails, maar ook de teksten van wat blijft. Dat is
hieronder verwerkt; het plan gaat van 6 naar 9 bouwdagen. Twee bijvangsten
die het herhalen van deze audit overbodig maken: één bron per mailtekst (de
template in de database, met de fallback in code alleen als noodrem die
inhoudelijk gelijk is), en een test die alle templates én inline HTML
controleert op dode routes, oude adressen (`inkoop@`, `info@`,
`administratie@`) en het woord "registreer".

### Fase 1 — Reparaties (2 bouwdagen)

- `reconcile-admin-todos`: `partner_status_update` niet meer sluiten op
  `confirmed`; sluiten na 7 dagen of als jij hem afvinkt. Test erbij.
- `reconcile-admin-todos` roept `check-pending-items` niet meer aan; die
  draait alleen nog via zijn eigen dagelijkse cron (8:00 UTC).
- `check-pending-items`: factuurherinneringen T+3 / T+7 / T+14 elk precies
  één keer (dedupe zonder tijdvenster, met `.limit(1)` in plaats van
  `.maybeSingle()`), bureau-onderdelen uitsluiten via `isBureauItem()`, en na
  T+14 een taak `commission_missing_invoice` met prioriteit high in plaats
  van verdere mail. Hetzelfde patroon voor `reminder_activity_pending` en
  `reminder_quote_pending`.
- `partner-invoice-presence.ts` leert de inkoop-inbox kennen: een
  onverwerkte of in verwerking zijnde mail in `purchase_invoice_inbox` van het
  afzendadres van de partner, of met het BV-nummer van het project in
  onderwerp of tekst, telt als "factuur binnen". Dezelfde bron die
  `get-partner-dashboard` al gebruikt voor "Ontvangen op …, wordt verwerkt",
  zodat portaal en herinnering hetzelfde zeggen.
- Geen opruimmigratie nodig: de 40 "nieuwe aanvraag"-taken en het laatste
  `inbound_email`-exemplaar bleken al weggeklikt (`dismissed`), niet open.
- Labelkaart `emailTypeLabels.ts` bijwerken met de 21 ontbrekende sleutels,
  de 7 dode labels verwijderen, en een test die controleert dat elke sleutel
  die in `supabase/functions` gelogd wordt een label heeft (zoals
  `reconcileTodosContract.test.ts` dat voor taken doet).
- De drie alarmmails via `logEmail` laten lopen; `cron-watchdog` zet de taak
  op `todo` in plaats van `open`.
- Uit de audit: `quote_expired_partner` repareren (variabele hernoemen),
  antwoordadres `BVC-` routeren in `inbound-email`, de 404-link en
  instructie in `partner_missing_pdf_reminder` (tot de functie weggaat), de
  dubbele klantmails bij tegenvoorstel en bij akkoord-en-tekenen, de
  spooktaak `forward_accommodation_quote`, het dubbele euroteken en de
  tegenstrijdige contactbelofte bij logies, de onware "alle aanbieders zijn
  geïnformeerd"-zinnen, het dubbele label in `item_added_partner`, de
  verkeerde actor in `item_changes_partner`, de groet-strip in
  `send-project-email`, `info@` en "2 werkdagen".
- De zeven verouderde factuurinstructies vervangen door één zin (zie fase
  0), in de templates én in de fallbacks.

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

### Fase 3 — Minder ruis en betere teksten (4 bouwdagen)

- Wijzigingsmails (`item_changes_*`) bundelen per ontvanger per dag via een
  wachtrijtabel `pending_change_notifications` en een avondcron; knop "nu
  sturen" in `PublishChangesDialog`.
- Annuleringsmail aan partners alleen bij `confirmed`/`accepted`/
  `executed`-onderdelen.
- Dubbele taken samenvoegen: `customer_status_email_due` in
  `customer_status_update_due`, `post_execution_feedback` in
  `customer_aftersales`, `post_execution_invoice_check` in
  `commission_missing_invoice`, `new_request_received` in
  `new_program_request`. `reconcileTodosContract.test.ts` bijwerken.
- Reconciler: taken die hij sluit krijgen altijd een `completion_reason`, zodat
  de churn meetbaar wordt (nu heeft 99% van de 3.800 sluitingen geen reden).
- Dode functies en templates verwijderen (fase 0, "Dood"), inclusief
  `edgeFunctionTestCoverage.ts` en `AdminEmailTemplates`.
- Eén tekst per moment: `program_request_partner` naar één gedeelde
  generator in `_shared/` met de drie onderdeelsoorten; `partner_headsup_t3`
  op de template; `cancellation_accommodation_partner` op de template; de
  aantalwijzigingsmails (bulk en per onderdeel) samen; `admin-reset-partner-
  password` op de template van `send-partner-reset-email`.
- Alle inline mails door `wrapEmailHtml`; referentienummer in elk
  onderwerp; partners overal "Hoi … je", klanten overal "u"; bedragen via
  `formatCurrencyNL`; "Aan zet"-regel waar de ontvanger iets moet doen.
- Templates herschrijven die iets anders zeggen dan de code doet
  (`booking_confirmed_customer`, `program_request_bureau`,
  `program_request_customer`, `accommodation_quote_notification`,
  `accommodation_selected_partner`, `terms_reminder`).
- Werkbank: Nederlandse labels uit `autoTodoCreator.ts` tonen in plaats van
  de sleutel, de ruim twintig ontbrekende sleutels aanvullen in label- en
  clusterkaart, taakteksten zonder jargon en met de actie ("ontvangen in de
  inkoop-inbox", "publiceer of maak ongedaan"), legacy-pagina
  `/admin/todos-legacy` verwijderen.
- Eén adresbron voor het bureau: alles via `getBureauAdminEmail()`.
- Test `emailContentGuard.test.ts`: geen `inkoop@`, `info@`,
  `administratie@`, geen "registreer"/"upload" in factuurcontext, elke vaste
  route bestaat in `App.tsx`, elke `{{variabele}}` in een template komt voor
  in de aanroepende code.

### Fase 4 — Dagelijkse samenvatting en meting (1 bouwdag)

- Edge function `send-bureau-daily-digest`, cron 7:30 NL: gebeurtenissen van
  gisteren, herinneringen van vandaag, alles langer dan 3 dagen open, plus
  het aantal mails dat gisteren mislukte. Eén mail, ook als er niets is
  ("Niets nieuws").
- Meetquery in dit document: mails per type per maand, open-percentage per
  ontvangersgroep, taken aangemaakt versus gesloten door de reconciler, en
  het aantal herinneringen per onderdeel (moet nooit boven 3 komen). Over
  een maand opnieuw draaien.

Totaal 9 bouwdagen (fase 0 is gedaan). Fase 1 kan direct en lost de vraag
uit BV-2611-0001, de factuurherinneringen en de veertien fouten uit de audit
op.

## Gebouwd

### Fase 1 (21 november 2026)

Reconciler en herinneringen:

- `partner_status_update` sluit niet meer op `confirmed`. De regel staat in
  `_shared/partnerStatusUpdateTodo.ts` (getest): dicht als het onderdeel
  verdween of geannuleerd werd, of na zeven dagen; anders blijft de melding
  staan tot Erwin hem afvinkt.
- `reconcile-admin-todos` roept `check-pending-items` niet meer aan. De
  herinneringschecks draaien alleen nog via de eigen dagcron.
- Herinneringsbeleid in `_shared/reminderPolicy.ts` (getest): een vaste reeks
  (factuur T+3, T+7, nieuw T+14) gaat per type, adres en onderdeel precies
  één keer; herhalende herinneringen (activiteit open, logiesofferte open,
  aantal niet bevestigd) elke zeven dagen, maximaal drie keer. De
  dedupe-query leest de nieuwste rijen met `limit` in plaats van
  `maybeSingle`, die bij twee rijen faalde en daardoor juist doorstuurde.
  Vanaf T+21 zonder factuur krijgt de bestaande taak
  `commission_missing_invoice` prioriteit hoog; verdere mail blijft uit.
- Bureau-onderdelen via `isBureauItem()` (ook `provider_id = 'bureau'` met
  `block_type = 'activity'`), zodat het bureau zichzelf geen
  factuurherinneringen meer stuurt.
- `_shared/partner-invoice-presence.ts` kent nu ook facturen op projectniveau
  en onverwerkte mails in `purchase_invoice_inbox` (op afzendadres van de
  partner of BV-nummer in onderwerp, tekst of scan), dezelfde bron als het
  partnerportaal. Zeven tests.
- `quote_expired_partner` gaat weer weg: de schaduwvariabele `req` heet nu
  `quoteRequest`; de taak krijgt het gekoppelde programma als dossier.
- `cron-watchdog` maakt de taak `system_cron_failure` met status `todo`
  (was `open`, dat de tabel weigert).
- Migratie `20261121120000`: template `partner_invoice_reminder_t14` en
  "Gisteren" uit de T+3-template.

Dubbele en onware mails:

- Eén klantmail per partnerreactie: `pickCustomerStatusMail` in
  `update-partner-item-status` kiest `counter_proposal_response` óf een
  `status_*`-mail.
- Eén klantmail bij akkoord en ondertekenen in één klik:
  `accept-quote-proposal` kent de vlag `skipCustomerEmail`, die het
  klantportaal meegeeft als de ondertekening net is gelukt.
- De spooktaak `forward_accommodation_quote` wordt niet meer aangemaakt door
  de functie die de offerte net doorstuurde; open exemplaren sluiten met reden
  `quote_forwarded`.
- Logies gekozen: dubbel euroteken weg; klant- en partnermail zeggen beide
  dat Bureau Vlieland het aanspreekpunt is; het voorwaardenblok staat binnen
  de huisstijlkaart (migratie `20261121130000`).
- `cancellation_customer` en `date_change_customer` zeggen "Wij informeren de
  betrokken aanbieders" in plaats van een belofte die soms onwaar was;
  `has_accommodation` wordt nu gevuld. `item_added_partner` zonder dubbel
  label, `item_changes_partner` actor-neutraal en gesanitized (migratie
  `20261121140000`).
- `send-project-email` knipt de afsluiting niet meer weg; `save-program-draft`
  gebruikt het algemene bureauadres; catering belooft 5 werkdagen zoals de
  site.

Factuurinstructie aan partners, overal dezelfde zin ("Mail na uitvoering de
pdf van je factuur naar invoices@reply.bureauvlieland.nl, met onze referentie
erop. Wij factureren centraal aan de klant."): templates
`program_request_partner`, `booking_confirmed_partner`, `partner_invitation`,
`accommodation_selected_partner`, en in code `send-items-to-partners`,
`accept-quote-proposal`, `send-partner-headsup-t3`, de fallback in
`update-customer-program` en `partnerBillingNote`. Waar de code geen
referentie meegeeft staat "(het BV-nummer)"; dat wordt in fase 3 een
variabele.

Overig:

- Antwoorden op commissiefacturen (`reply+BVC-…`) landen als Werkbank-taak
  `commission_invoice_reply` bij de partner (`inbound-email/commissionReply.ts`).
- `partner_missing_pdf_reminder` linkt naar `/partner/facturatie` en vraagt om
  de pdf te mailen; met Reply-To als alle facturen bij één project horen.
- De drie alarmmails (zelftest, heartbeat, auto-close-monitor) staan in
  `email_log`.
- Labelkaart `emailTypeLabels.ts` compleet; `emailTypeLabelsContract.test.ts`
  bewaakt dat elke gelogde sleutel een label heeft.
- Correctie op het rapport: de 40 "nieuwe aanvraag"-taken waren weggeklikt
  (`dismissed`), niet open; geen opruimmigratie nodig.

Niet in fase 1 (naar fase 3): referentienummer als variabele in de vier
templates en in de onderwerpregels, knoppen in `item_added_partner` en
`item_changes_partner`, huisstijlwrapper om de inline mails, de drie
onderdeelsoorten in de partnertemplates.

### Fase 2 (21 november 2026)

- `_shared/bureau-event.ts` (getest): één helper voor gebeurtenissen van
  buiten. Hij maakt of actualiseert een Werkbank-taak in het cluster
  "Binnengekomen" (één open taak per gebeurtenis en onderdeel) en stuurt,
  waar dat zinvol is, een korte bureau-mail met idempotency-sleutel: wie,
  wat, voor welk dossier, en één regel "Aan zet". Het bureauadres komt uit
  één bron, `resolveBureauAddress` (instelling `bureau_admin_email`, terugval
  `hallo@`); de chatmelding, de tegenvoorstelmelding en de logiesalarmen
  gebruiken die nu ook. De bruiloftsmelding houdt nog het vaste adres (eigen
  testbare context; fase 3).
- Aangeroepen vanuit `update-partner-item-status` (bevestigd, niet
  beschikbaar, alternatief: taak `partner_status_update` + mail
  `partner_item_response_bureau`; uitgevoerd: taak `partner_item_executed`,
  geen mail), `accept-quote-proposal` (taak `customer_quote_accepted` + mail
  `quote_accepted_bureau`) en `update-customer-program` bij ondertekening
  (taak `customer_terms_signed` + mail `terms_signed_bureau`, met de
  onderdelen onder voorbehoud). Een "alleen bevestigen"-onderdeel dat
  bevestigd wordt blijft stil.
- `reconcile-admin-todos` sluit de drie nieuwe taaktypen na zeven dagen, net
  als `partner_status_update`, en sluit `new_program_request` ook bij een
  gearchiveerde aanvraag.
- Labelkaart: drie nieuwe bureau-mailtypes.
- Werkbank: sectie "Binnengekomen" bovenaan de inbox
  (`InboundEvents.tsx`, `collectInboundEvents` in `inboxAssemble.ts`,
  getest): alle open taken uit het cluster, nieuwste eerst, met dossierlink,
  leeftijd en knop "Gezien" (sluit met reden `seen`, ongedaan te maken).
  Inbound-taken worden niet meer gedempt door de rustperiode na recent
  contact: het recente contact ís de gebeurtenis. Het clusterlabel heet
  "Binnengekomen" in plaats van "Inbound".
- Zijbalk: menu-item "Binnengekomen" met eigen teller
  (`useInboundEventCount`), direct onder Werkbank; de link opent de inbox en
  scrolt naar de sectie.
- Labels en clusterkaart aangevuld met de nieuwe taaktypen en
  `commission_invoice_reply`.


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
7. **De dode functies en templates uit fase 0 verwijderen, en de teksten
   herschrijven volgens de audit (fase 3)?** Advies: ja; de zeven
   factuurinstructies al in fase 1.

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

Open-percentage per ontvangersgroep, laatste 30 dagen (doel: partner en
klant boven 40%):

```sql
select case
    when email_type like '%bureau%' or email_type in ('chat_notification','cron_watchdog_alert',
      'purchase_invoice_forward','bureau_invoice_forward','commission_invoice_forward','bureau_daily_digest')
      then 'bureau/boekhouding'
    when email_type like '%partner%' or email_type in ('program_request_partner','booking_confirmed_partner',
      'item_added_partner','counter_proposal_partner','accommodation_quote_request_partner',
      'accommodation_selected_partner','accommodation_rejected_partner','cancellation_partner',
      'cancellation_accommodation_partner','partner_invitation','partner_password_reset')
      then 'partner'
    else 'klant' end as groep,
  count(*) n,
  round(100.0 * count(*) filter (where status in ('opened','clicked')) / count(*)) pct_geopend,
  count(*) filter (where status in ('failed','bounced','blocked','dlq')) mislukt
from email_log
where created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
```

Taken aangemaakt tegenover gesloten door de reconciler, per type, laatste 30
dagen (churn = veel aangemaakt én snel automatisch gesloten):

```sql
select auto_type,
  count(*) aangemaakt,
  count(*) filter (where completion_reason is not null and completion_reason not in ('seen')) auto_gesloten,
  count(*) filter (where completion_reason = 'seen') gezien,
  count(*) filter (where status = 'dismissed') weggeklikt,
  round(percentile_cont(0.5) within group (order by extract(epoch from (completed_at - created_at)) / 3600)
    filter (where completed_at is not null)) mediaan_uren_open
from admin_todos
where created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
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

Dagoverzicht: komt hij elke dag? (verwacht één rij per dag)

```sql
select created_at::date dag, status, metadata->>'summary' samenvatting
from email_log where email_type = 'bureau_daily_digest'
order by 1 desc limit 14;
```

Nulmeting 21 november 2026: 1.172 mails in 180 dagen (partner 26% geopend,
klant 32%, bureau 40%); maximaal 14 herinneringen voor één onderdeel; 3.645
van de 3.677 gesloten taken zonder reden.
