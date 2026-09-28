# Plan: doorverwijzingen van bruiloftsaanvragen bijhouden

Status: fase 1 gebouwd op 28 september 2026 (akkoord Erwin, met de
voorgestelde keuzes bij de beslispunten). "Island Events" is in de admin de
partner WestCord Strandhotel Seeduyn (`strandhotel-seeduyn`). Fase 2 en 3
zijn plan.

Aanleiding: Bureau Vlieland voert geen bruiloften meer uit. Binnenkomende
bruiloftsaanvragen gaan naar partners (voorlopig Island Events en Paal 50).
Per geboekte bruiloft ontvangt het bureau een vaste doorverwijsvergoeding.
Doorverwijzingen, hun status en de facturatie ervan moeten in de admin
bijgehouden worden.

## Wat er nu is

- **Bruiloften op de site.** `/trouwen-op-vlieland` verwijst sinds de
  herpositionering door naar vlieland.nl. Op `/offerte` staat "Bruiloft"
  nog als type in de keuzelijst, maar dat veld wordt niet opgeslagen: het
  offerteformulier schrijft niets in de database en stuurt alleen twee
  mails (bureau en klant). Het type gaat alleen naar GA4. Ook `llms.txt`
  noemt bruiloften nog als dienst.
- **Waar een bruiloftsaanvraag dus binnenkomt.** Als mail in de
  `sales_inbox` (bureau-mail via `inbound-email`, AI-scan vult naam, e-mail,
  telefoon, aantal personen en datums in), of als project in
  `program_requests` met `origin = 'maatwerk_prive'` ("Trouwen, jubileum,
  familie- of vriendenweekend" in de wizard). Er is geen aparte klanten- of
  aanvragentabel met een categorie "bruiloft".
- **Partners.** Tabel `partners` met tekst-id, login-`email` (verplicht) en
  optioneel `contact_email` ("notificaties naar dit adres i.p.v. het
  loginadres"). Geen instellingen-jsonb; vlaggen zijn losse kolommen
  (`is_active`, `is_public`, `pays_by_direct_debit`). Twee triggers
  (`guard_partner_self_update`, `protect_partner_self_update_fields`)
  beschermen admin-velden tegen wijziging door de partner zelf; elke nieuwe
  admin-kolom hoort in beide. Het detailscherm
  (`AdminPartnerDetail.tsx`) is één formulier met een Opslaan-knop; vlaggen
  staan als `Switch` in de kaart "Instellingen".
  - Paal 50 bestaat als partner `paal-50`.
  - Island Events bestaat niet als losse partner: de bruiloften lopen via
    WestCord Strandhotel Seeduyn (`strandhotel-seeduyn`, Erwin, 28
    september), een van de drie WestCord-hotels met
    `contact_email = info@islandevents.nl`. De migratie zet de vlag aan
    voor `paal-50` en `strandhotel-seeduyn`.
- **Facturatie.** Twee uitgaande factuurtypes: `bureau_invoices` (aan
  klanten, per project) en `commission_invoices` + `commission_invoice_lines`
  (aan partners, nummer `BVC-jjmm-nnnn` via trigger, PDF in de browser met
  `renderInvoicePdf`, versturen via `send-commission-invoice-to-partner`,
  doorsturen naar Snelstart, handmatig "betaald"). De regels zijn gekoppeld
  aan programma-onderdelen, logiesoffertes of inkoopfacturen; vrije regels
  kunnen in de tabel wel, maar niet in de UI. Zie "Facturatie: wat kan".
- **Mail.** Mailjet via edge functions, templates in `email_templates`
  (bewerkbaar in admin, aanmaken alleen via migratie), `email_log` met
  `related_request_id`/`related_partner_id` en vrije `metadata`. Cc wordt
  in geen enkel admin-dialoog ondersteund; het Mailjet-type kent `Cc` wel.
- **Conventies** die het ontwerp volgt: migraties met Nederlandse
  slug en toelichting, RLS met `public.is_admin(auth.uid())` plus grants
  (de test `migrationsRlsCoverage` eist dat), `types.ts` handmatig
  bijwerken, pagina's onder `src/pages/admin/` met `AdminLayout`, menu in
  `AdminLayout.tsx`, pure logica in `src/lib/` met vitest-tests in
  `src/lib/__tests__/`, instellingen in `app_settings`, cron via
  `cron.schedule` in een migratie. Geen anonimisering of bewaartermijn-logica
  bestaat er nog; de privacyverklaring noemt wel "zolang nodig" en zeven
  jaar voor factuurgegevens.

## Fase 1: basis

### Datamodel (één migratie, `20260928..._bruiloftsdoorverwijzingen.sql`)

**`partners`, twee kolommen**

| Kolom | Type | Betekenis |
|---|---|---|
| `receives_wedding_referrals` | boolean not null default false | Ontvangt bruiloftsdoorverwijzingen |
| `wedding_referral_email` | text null | Apart adres voor doorverwijzingen; leeg = `contact_email`, anders `email` |

Beide kolommen komen in de twee beschermtriggers (admin-only). De migratie
zet de vlag aan voor `paal-50` en `strandhotel-seeduyn`.

**`wedding_referral_fee_schedules` (staffel, met ingangsdatum)**

| Kolom | Type |
|---|---|
| `id` | uuid pk |
| `effective_from` | date not null unique |
| `tiers` | jsonb not null, bijv. `[{"max_guests":50,"fee":350},{"max_guests":100,"fee":550},{"max_guests":null,"fee":750}]` |
| `multi_day_surcharge` | numeric(10,2) not null default 0 |
| `note` | text |
| `created_at`, `updated_at` | timestamptz |

Seed: één rij met ingangsdatum 1 januari 2026, de staffel 350/550/750 en
toeslag 250. Een tariefwijziging is een nieuwe rij met een latere
ingangsdatum; oude rijen blijven staan. Welke staffel geldt, bepaalt de
**datum doorverwezen** (het moment waarop de afspraak met de partner
ontstaat). Alternatief is de boekingsdatum; dat is één regel in de
berekening.

**`wedding_referrals` (de doorverwijzing)**

| Groep | Kolommen |
|---|---|
| Bruidspaar | `couple_names` text not null, `couple_email` text, `couple_phone` text |
| Koppeling | `request_id` → `program_requests` (null), `sales_inbox_id` → `sales_inbox` (null) |
| Partner | `partner_id` → `partners` (not null, on delete restrict) |
| Data | `requested_at` date not null, `referred_at` date not null, `expires_at` date not null (= `referred_at` + 18 maanden, door een trigger gevuld als hij leeg is) |
| Verwachte bruiloft | `expected_wedding_date` date null, `expected_wedding_precision` text check in (`day`,`month`) default `day` (bij `month` staat de eerste van de maand) |
| Schatting | `estimated_guests` integer |
| Notities | `notes` text |
| Status | `status` text check in (`referred`,`booked`,`not_proceeded`,`expired`) default `referred`, `status_changed_at` timestamptz |
| Uitkomst | `final_wedding_date` date, `final_day_guests` integer, `is_multi_day` boolean not null default false |
| Vergoeding | `fee_schedule_id` → staffel, `fee_calculated_amount` numeric(10,2) (uit staffel), `fee_amount` numeric(10,2) (definitief, gelijk aan berekend tenzij overschreven), `fee_override_note` text |
| Factuur | `invoice_status` text check in (`not_applicable`,`to_invoice`,`invoiced`,`paid`) default `not_applicable`, `invoice_number` text, `invoice_date` date, `invoice_paid_at` date |
| Privacy | `anonymized_at` timestamptz |
| Fase 2 | `referral_email_log_id` → `email_log` (null) |
| Systeem | `id`, `created_at`, `updated_at`, `created_by` |

Databaseregels als vangnet, naast de logica in de app:

- check: `fee_amount` alleen gevuld bij status `booked`;
- check: `invoice_status` alleen anders dan `not_applicable` bij status
  `booked`;
- functie `public.expire_wedding_referrals()` zet `referred` op `expired`
  als `expires_at < current_date`; een dagelijkse `cron.schedule` roept
  hem aan (SQL-functie, geen edge function nodig). De admin-pagina roept
  dezelfde functie bij het laden aan, zodat het overzicht ook klopt als de
  cron nog niet gedraaid heeft.

RLS: alleen `is_admin` (select, insert, update, delete), grants aan
`authenticated` en `service_role`, `updated_at`-trigger. Persoonsgegevens
staan uitsluitend in deze admin-only tabel.

### Logica in `src/lib/` (getest)

- `weddingReferralFee.ts`: `pickFeeSchedule(schedules, datum)`,
  `calculateReferralFee({ dayGuests, multiDay }, schedule)`. Grenzen:
  50 → 350, 51 → 550, 100 → 550, 101 → 750, meerdaags +250.
- `weddingReferrals.ts`: statusovergangen (`applyStatusChange`: naar
  `booked` zet `invoice_status` op `to_invoice` en legt de vergoeding vast;
  weg van `booked` maakt vergoeding en factuurstatus weer leeg, tenzij al
  gefactureerd, dan geblokkeerd), `shouldExpire(referral, vandaag)`,
  `seasonOf(referral)` (jaar van definitieve, anders verwachte trouwdatum,
  anders datum doorverwezen), `summarizeBySeason`, `buildControlList`,
  `toCsv`, `anonymize(referral)` en `isDueForAnonymization(referral,
  vandaag)` (2 jaar na betaald, of 2 jaar na niet doorgegaan/vervallen).
- Tests in `src/lib/__tests__/weddingReferralFee.test.ts` en
  `weddingReferrals.test.ts`: staffelgrenzen, toeslag, staffelkeuze op
  datum (een latere staffel raakt een eerdere doorverwijzing niet),
  overschrijven met opmerking, automatisch vervallen (precies op en na de
  vervaldatum, niet bij andere statussen), alle statusovergangen,
  seizoensbepaling, samenvatting, controlelijst en CSV.

### Schermen

Nieuwe pagina `/admin/bruiloften` (`AdminWeddingReferrals.tsx`), menu
"Operationeel" → "Bruiloften", met vier tabbladen:

1. **Doorverwijzingen.** Tabel met bruidspaar, partner, doorverwezen op,
   (verwachte) trouwdatum, gasten, status, vergoeding, factuurstatus.
   Filters: partner, status, factuurstatus, seizoen. Knop "Nieuwe
   doorverwijzing" en klikken op een rij openen een `Sheet`
   (`WeddingReferralSheet.tsx`):
   - aanmaken: bruidspaar, partner (alleen partners met de vlag aan),
     koppeling aan bestaand project (zoeken op naam/e-mail in
     `program_requests`, optioneel), datum aanvraag, datum doorverwezen,
     verwachte trouwdatum (dag of alleen maand/jaar), geschat aantal
     gasten, notities; vervaldatum wordt getoond en volgt de datum
     doorverwezen;
   - afloop: status, definitieve trouwdatum, definitief aantal daggasten,
     meerdaags; bij "geboekt" verschijnt direct de berekende vergoeding met
     de gebruikte staffel, een veld om te overschrijven en een verplichte
     opmerking bij overschrijven; factuurstatus, factuurnummer,
     factuurdatum, betaald op;
   - knop "Persoonsgegevens anonimiseren" (met bevestiging) zodra de
     doorverwijzing is afgerond; de lijst toont een markering bij
     doorverwijzingen die daarvoor in aanmerking komen.
2. **Per seizoen.** Per partner per seizoen: doorverwezen, geboekt, niet
   doorgegaan, vervallen, te factureren, gefactureerd, betaald (bedragen
   excl. btw), met totaalregel.
3. **Controlelijst.** Per partner: doorverwijzingen waarvan de (verwachte)
   trouwdatum verstreken is en de status nog "doorverwezen" is. Knop
   "Exporteer CSV" per partner (puntkomma-gescheiden met BOM, zoals de
   bestaande exports, opent in Excel). PDF kan later via `jspdf` als dat
   handiger blijkt voor het versturen.
4. **Staffel.** Lijst van staffels met ingangsdatum; nieuwe staffel
   toevoegen (ingangsdatum, drie grenzen/bedragen, toeslag, toelichting).
   Een staffel waar al doorverwijzingen aan hangen is niet te wijzigen,
   alleen te vervangen door een nieuwe met latere ingangsdatum.

Partnerdetail: in de kaart "Instellingen" een blok "Bruiloften" met de
schakelaar "Ontvangt bruiloftsdoorverwijzingen" en het veld "E-mailadres
voor doorverwijzingen (optioneel)", met de uitleg welk adres anders geldt.

Verder: route en lazy import in `App.tsx`, titel in `ADMIN_TITLE_MAP`,
`types.ts` bijgewerkt, `roadmap.md` een regel.

### Buiten fase 1, maar klein

- "Bruiloft" uit de keuzelijst op `/offerte` halen en `llms.txt` aanpassen
  zou passen bij "voert geen bruiloften meer uit". Dat is een aparte,
  bewuste keuze; ik raak het in fase 1 niet aan.

## Fase 2: doorverwijsknop (plan, nog niet bouwen)

Niet eenvoudig genoeg om er in fase 1 bij te nemen: het vraagt een nieuwe
edge function, cc-ondersteuning in de mailinfrastructuur en een template.

1. **Template** `wedding_referral_customer` via migratie in
   `email_templates` (daarmee bewerkbaar op `/admin/email-templates`), met
   variabelen `customer_name`, `partner_name`, `partner_email`,
   `partner_website`, `expected_wedding_date`, `number_of_people`; registratie
   in `emailTemplateVariables.ts`.
2. **Edge function `send-wedding-referral`** (admin-only): body
   `{ partnerId, requestId? | salesInboxId?, couple, subject, body }`.
   Stuurt de mail aan het bruidspaar met de partner in cc (het
   doorverwijsadres, anders contact-, anders loginadres), logt in
   `email_log` (`email_type = 'wedding_referral'`, `related_partner_id`,
   `related_request_id`, metadata met cc), maakt de `wedding_referrals`-rij
   aan met `referral_email_log_id`, en zet bij een sales-inboxmail de status
   op `processed` met een notitie. Cc vereist twee kleine uitbreidingen in
   `_shared/mailjet-send.ts`: de suppressiecontrole ook over `Cc`, en de
   testmodus-omleiding ook voor cc-adressen. Deno-test naast de functie en
   registratie in `edgeFunctionTestCoverage.ts`.
3. **Knop "Doorverwijzen naar…"** op twee plekken: in de sales-inbox bij
   een nieuwe mail (naast "Maak project") en in het menu van een project
   (boven "Aanvraag annuleren"). Dialoog: partner kiezen (alleen met vlag),
   onderwerp en tekst uit de template, vooringevuld met gegevens uit de
   aanvraag, bewerkbaar, cc zichtbaar. Na verzenden opent de nieuwe
   doorverwijzing.
4. De verzonden mail is via `referral_email_log_id` terug te lezen in het
   bestaande `EmailLogDetailDialog`.

## Facturatie: wat kan

Automatisch factureren blijft buiten scope, maar de bestaande
commissiefacturen sluiten er redelijk op aan. Voorstel voor een latere
fase 3, zodat de factuurstatus niet handmatig hoeft:

- `commission_invoice_lines` krijgt een nullable `wedding_referral_id`;
  `item_type = 'wedding_referral'`.
- Knop "Factuur maken" op een doorverwijzing met factuurstatus "te
  factureren": maakt een `commission_invoices`-concept voor de partner met
  één regel (basis = vergoeding, 100%, omschrijving "Doorverwijsvergoeding
  bruiloft <namen> – <trouwdatum>"), hergebruikt `renderInvoicePdf` en
  `send-commission-invoice-to-partner`. Bij versturen: factuurstatus
  "gefactureerd" met nummer en datum; de bestaande knop "Betaald" op de
  commissiefactuur zet de doorverwijzing op "betaald".
- Aanpassingen die daarvoor nodig zijn: de PDF-regel "bedrag × pct" wordt
  voor dit type een vast bedrag, de mailtekst zegt "doorverwijsvergoeding"
  in plaats van "commissie", en meerdere doorverwijzingen van één partner
  kunnen op één factuur (na het seizoen, aansluitend op de controlelijst).

Zonder fase 3 vul je factuurnummer, -datum en status met de hand in; dat
is wat fase 1 levert.

## Besluiten (28 september 2026)

1. Staffelkeuze op **datum doorverwezen**.
2. Menu-plek: "Operationeel" → "Bruiloften".
3. Anonimiseren: handmatig per doorverwijzing, met een melding op de pagina
   zodra een doorverwijzing 2 jaar afgerond is.
4. Export van de controlelijst als CSV.
5. "Island Events" is de partner WestCord Strandhotel Seeduyn; de migratie
   zet de schakelaar aan voor `paal-50` en `strandhotel-seeduyn`.

## Wat er in fase 1 is gebouwd

- Migratie `20260928120000_bruiloftsdoorverwijzingen.sql`: partnerkolommen,
  staffeltabel met de eerste staffel, doorverwijzingentabel, dagelijkse
  cron `wedding-referrals-expire-daily` (03:15 UTC) en de functie
  `expire_wedding_referrals()`.
- Logica en tests: `src/lib/weddingReferralFee.ts` en
  `src/lib/weddingReferrals.ts` met `src/lib/__tests__/*.test.ts`.
- Pagina `/admin/bruiloften` (`AdminWeddingReferrals.tsx`) met het
  formulier `WeddingReferralSheet.tsx` en de staffelkaart
  `WeddingReferralFeeSchedulesCard.tsx`; gegevens via
  `src/hooks/useWeddingReferrals.ts`.
- Partnerdetail: blok "Ontvangt bruiloftsdoorverwijzingen" met het aparte
  e-mailadres.
