# Plan: Proforma factuur, facturatie los van het programma

Status: onderzoek en plan 19 november 2026, naar aanleiding van de vraag van
Erwin: het verwerken van inkoopfacturen en orderregels op het project blijft
verwarrend, er gaan dingen stuk bij verwijderen, en het is niet te zien
waar een doorbelaste inkoopregel "voor in de plaats komt". Gewenst:
facturatie lostrekken van het programma, met een proforma factuur als het
ene werkdocument waarop de offerte en de inkoop samenkomen.

Bouwt voort op `docs/plan-inkoopfacturen-doorbelasten.md` (oktober 2026),
dat de registratie licht maakte, het werkblad Doorbelasten bouwde, de
berekening naar één module bracht (`projectInvoiceSpec.ts`) en de
klantfactuur eigen regels gaf (`bureau_invoice_lines`). Dit plan maakt de
tweede helft van dat werk af: de factuurregels ontstaan niet pas bij het
registreren, maar bij akkoord, en daarna is dát het document waarop je
werkt.

## Samenvatting

Er zijn drie waarheden die elk los van elkaar moeten bestaan:

1. **De offerte**: wat de klant akkoord gaf (programma-onderdelen met
   offerteprijs, logies, automatische posten).
2. **De inkoop**: wat partners werkelijk factureren (inkoopfacturen met
   orderregels).
3. **De verkoopfactuur**: wat het bureau de klant stuurt.

Vandaag bestaat nummer 3 niet als eigen ding tot het moment van registreren.
Tot die tijd is de klantfactuur een live berekening over het programma, en
doorbelasten werkt door het programma zélf te veranderen: klantregels
(`program_item_billing_lines`) hangen onder een onderdeel, "offerteprijs
houden" (`keep_quoted_price`) is een vlag op het onderdeel, en een kostenpost
is een verkapt onderdeel met `day_index = -1`. Daardoor:

- zie je niet wát er wordt vervangen: de vervanging gebeurt binnen het
  onderdeel, het overzicht toont alleen het resultaat;
- heeft verwijderen bijwerkingen die je niet ziet aankomen (een kostenpost
  weggooien, een factuur opnieuw verwerken, een regel verplaatsen);
- is de offerte nooit bevroren: elke doorbelasting verandert de cijfers op
  dezelfde plek waar de offerte staat;
- zijn er vijf statussen per inkoopregel, een schakelaar per onderdeel, een
  regeleditor met potlood en een aparte kaart Overige kosten: vier ingangen
  voor één beslissing.

Het plan: bij akkoord ontstaat uit de offerte één **proforma** (een
`bureau_invoices`-rij met status `concept` en eigen regels). Elke regel
weet waar hij vandaan komt (offerte-onderdeel, inkoopregel, handmatig).
Doorbelasten is één handeling op de proforma: een offerteregel **vervangen**
door een of meer inkoopregels, of een inkoopregel **toevoegen** als eigen
regel. De vervangen offerteregel blijft doorgestreept zichtbaar ("was
€ 525, nu € 507,50"). Terugdraaien is één klik. Registreren bevriest de
proforma tot de factuur, zoals fase 3 dat nu al doet bij registreren.

Het programma raakt niets meer aan de facturatie: klantregels, de vlag
`keep_quoted_price`, de dag −1 posten en `created_from_purchase_lines`
verdwijnen. Het Financieel Overzicht wordt drie kolommen per onderdeel
(Offerte, Inkoop, Factuur) en de marge is Factuur min Inkoop. De
commissieverdeling wordt afgeleid uit proformaregels met een onderdeel én
een inkoopregel, precies zoals nu uit de klantregels. Snelstart,
betaalbatch, partnerportaal, incasso en bankmatching blijven ongemoeid.

Circa 9 bouwdagen in vier fasen, eerst op één testproject.

## 1. Hoe het nu werkt

```
offerte akkoord → program_request_items (quoted_price, admin_price_override)
                       ↓ live berekening (projectInvoiceSpec)
     Financieel Overzicht / facturatiepagina / portaal / voltooiingsstatus

inkoopfactuur → purchase_invoice_lines (charge_status open)
                       ↓ werkblad Doorbelasten (ChargeWorksheetCard)
                       ↓ apply_purchase_line_charges
     program_item_billing_lines (klantregel op het onderdeel, source purchase_invoice)
     program_request_items.keep_quoted_price (vlag: regels negeren)
     program_request_items met day_index -1 (kostenpost, created_from_purchase_lines)
     partner_purchase_invoice_allocations (commissie, uit de regels opgebouwd)
                       ↓ live berekening: klantregels aanwezig = klantregels leidend
     "Factuur registreren" → bureau_invoices + bureau_invoice_lines (bevroren)
```

Het werkblad werkt, maar alles wat het schrijft landt ín het programma. De
berekening moet daarna per onderdeel beslissen of de offerteprijs of de som
van de klantregels telt, en het scherm toont alleen de uitkomst.

## 2. Wat er knelt

Bevindingen uit de code en uit het gebruik op BV-2606-0004 en BV-2606-0013
(zie de nazorgparagrafen in het plan van oktober).

| # | Knelpunt | Waar |
|---|---|---|
| 1 | De vervanging is onzichtbaar. "Werkelijk" op het onderdeel is de som van klantregels; nergens staat "offerteregel € 525 vervangen door factuur 202600127 regel 1, € 507,50". | `FinancialOverviewCard`, `ChargeWorksheetCard` rechterkolom |
| 2 | Een kostenpost is een programma-onderdeel. Weggooien in Overige kosten of in het programma heeft gevolgen voor klantregels en inkoopregels; `apply_purchase_line_charges` en `purchaseInvoiceCleanup` moeten spookposten opruimen. | `AdminAddCostSheet`, migratie `20261103140000` |
| 3 | Vijf statussen per inkoopregel (`open`, `charged`, `kept_quote`, `skipped`, `legacy`) plus de schakelaar `keep_quoted_price` per onderdeel. "Verdeeld, nog niet doorbelast" (`legacy` met onderdeel maar zonder klantregel) is een toestand die alleen de code begrijpt. | `purchase_invoice_lines.charge_status` |
| 4 | Vier ingangen voor dezelfde beslissing: werkblad links (bestemming per regel), werkblad rechts ("Inkoopregel koppelen…" per onderdeel), de regeleditor met het potlood (handmatige regels) en de kaart Overige kosten. | `ChargeWorksheetCard`, `AdminItemBillingLinesEditor`, Financiën-tab |
| 5 | De offerte is niet bevroren. Een prijswijziging op een onderdeel ná akkoord en een doorbelasting zijn in het overzicht niet uit elkaar te houden. | `program_request_items.quoted_price` / `admin_price_override` |
| 6 | De factuur bestaat pas bij registreren. Tot die tijd is er geen document om naar te kijken, te sorteren, een omschrijving aan te passen of een regel te verbergen zonder het programma te raken. | `chooseStoredLines` in `bureauInvoiceLines.ts` |
| 7 | Verwijderen of opnieuw verwerken van een inkoopfactuur verwijdert klantregels via `ON DELETE CASCADE` en zet onderdelen terug; correct, maar niet zichtbaar vóór je klikt. | `purchaseInvoiceCleanup.ts` |
| 8 | De marge rekent met een geraamd totaal en kent geen marge per onderdeel, omdat offerte en factuur dezelfde cijfers zijn. | `ProjectProfitSummary` |

## 3. Het nieuwe ontwerp

### 3.1 Uitgangspunten

1. **Drie lagen, strikt gescheiden.** De offerte wordt bij akkoord
   bevroren. Inkoopfacturen hangen aan het project en raken het programma
   niet. De proforma is het enige document waarop beide samenkomen.
2. **De proforma is een factuur in wording.** Zelfde tabel, zelfde regels,
   zelfde PDF-renderer als een geregistreerde factuur. Registreren is niet
   "berekenen en opslaan" maar "bevriezen en nummeren".
3. **Elke proformaregel kent zijn herkomst** (offerte-onderdeel,
   inkoopregel, logiesofferte, automatische post, handmatig) en, als hij
   iets vervangt, wát hij vervangt. Vervangen regels blijven staan,
   doorgestreept, tot registratie.
4. **Doorbelasten is twee handelingen**: *vervang* (een offerteregel door
   inkoopregels) en *voeg toe* (een inkoopregel als nieuwe regel, zonder
   onderdeel). Een inkoopregel die op geen van beide manieren op de
   proforma staat, is simpelweg niet doorbelast. Geen aparte status
   "niet doorbelasten" meer; de reden is een opmerking op de inkoopregel.
5. **De commissieverdeling is een afgeleide van de proforma.** Een
   proformaregel met `item_id` én `purchase_invoice_line_id` schrijft de
   allocatie onderdeel × btw, net als `apply_purchase_line_charges` nu doet
   uit de klantregels. `sync_item_invoice_fields` en de commissieflow
   veranderen niet.
6. **Eén berekening blijft**, maar leest de proforma in plaats van het
   programma: `projectInvoiceSpec` bouwt de proforma bij akkoord en houdt
   daarna alleen nog de offerteregels bij (3.4). Totalen, btw-groepen,
   openstaand en voltooiingsstatus komen uit de proformaregels.
7. **Snelstart, betaalbatch, partnerportaal, incasso, bankmatching en de
   commissiefacturen blijven ongemoeid.** Ze lezen de kop van de
   inkoopfactuur of de geregistreerde klantfactuur, en die veranderen niet.

### 3.2 De proforma ontstaat bij akkoord

Zodra het project `quote_status = akkoord_ontvangen` krijgt (of, voor
lopende projecten, bij de migratie van fase 4), maakt de app een
`bureau_invoices`-rij met `status = 'concept'`, zonder nummer en datum, met
regels uit `projectInvoiceSpec`:

| Regel | `origin` | Gekoppeld aan |
|---|---|---|
| Programma-onderdeel | `quote_item` | `item_id` |
| Logies kamer / extra | `lodging` | `accommodation_quote_id` |
| Coördinatie, toeristenbelasting, natuurbijdrage, opslag, wijzigingsrondes | `fee` | `fee_key` |

Elke regel heeft `quote_amount_incl_vat`: het offertebedrag op het moment
van bevriezen. Dat getal verandert nooit meer en is de kolom "Offerte" in
het overzicht.

Is er nog geen akkoord, dan is er geen proforma en toont het Financieel
Overzicht de live berekening zoals nu, met een pill "Offerte, nog niet
akkoord". Doorbelasten is dan niet mogelijk; inkoopfacturen die eerder
binnenkomen wachten in de lijst "Nog niet op de factuur".

### 3.3 Het werkblad: de proforma zelf

Plaats: tabblad Financiën, als eerste kaart, in plaats van het huidige
werkblad Doorbelasten, het Financieel Overzicht, de kaart Overige kosten en
de regeleditor. Het ziet eruit als de factuur die de klant krijgt: secties
in factuurvolgorde, regels met aantal, prijs, btw en bedrag, totalen
onderaan.

**Per regel** staat een herkomstpill (Offerte, Factuur 202600127,
Logies, Automatisch, Handmatig) en een menu:

- **Vervang door inkoopregel…** (alleen op `quote_item`-regels): een lijst
  van alle nog niet doorbelaste inkoopregels van het project, met de
  voorstellen van de matcher bovenaan (zelfde `purchaseLineMatcher`, zelfde
  scores en redenen). Meerdere regels kiezen kan. Bevestigen zet de
  offerteregel op `replaced` en voegt per gekozen inkoopregel een regel toe
  met `origin = purchase_line`, `item_id` van de vervangen regel en
  `replaces_line_id`. De doorgestreepte offerteregel blijft zichtbaar met
  het verschil ernaast.
- **Terugdraaien** (op een `purchase_line`-regel): verwijdert de regel en
  zet de vervangen offerteregel terug op `active`. De inkoopregel komt
  terug in de lijst "Nog niet op de factuur".
- **Omschrijving aanpassen**, **verbergen** (regel blijft met `hidden`,
  telt niet mee; voor een offerteregel die de klant niet betaalt, zoals
  toeristenbelasting die een partner al rekende) en **volgorde**.
- **Handmatige regel toevoegen** (`origin = manual`): voor de uitzondering,
  zoals nu in de regeleditor.

**Onder de factuur: "Nog niet op de factuur (n regels, € x)".** Alle
inkoopregels van het project die op geen enkele proformaregel staan,
gegroepeerd per inkoopfactuur, elk met het voorstel van de matcher
("vervangt Rondleiding Brouwerij Fortuna, bedrag gelijk") en twee knoppen:
**Vervang** (naar de voorgestelde offerteregel, of kies een andere) en
**Voeg toe** (als eigen regel, onder een sectie op naam van de partner,
zoals de kostenposten nu). Daarnaast **Laat staan**: de regel blijft hier
staan met een opmerking (`purchase_invoice_lines.note`, bijvoorbeeld
"toeristenbelasting, rekenen we zelf"), en telt niet meer als open.
Voorstellen met score ≥ 80 zijn alvast aangevinkt; één knop "Bevestig
voorstellen (n)" voert ze in één keer uit, zoals nu.

**Rechts of onder elke regel met onderdeel: drie getallen.** Offerte
(`quote_amount_incl_vat`), Inkoop (som van de inkoopregels van dat
onderdeel, ook de niet doorbelaste), Factuur (wat er nu op de proforma
staat). Het verschil Factuur − Inkoop is de marge per onderdeel. Dat is het
nieuwe Financieel Overzicht; er is geen aparte kaart meer.

**Onderaan:** totalen (excl., btw per tarief, incl.), geregistreerd,
openstaand, en de knop "Factuur registreren" / "Restant factureren" die pas
primair wordt als de lijst "Nog niet op de factuur" leeg is of alleen nog
"laat staan"-regels bevat.

Logies-offertes: de route `apply-purchase-invoice-to-lodging` (kamerprijs
vervangen met snapshot, extra's toevoegen) blijft bestaan, maar wordt
aangeroepen vanuit "Vervang door inkoopregel…" op een `lodging`-regel.
Daarna wordt de logiesregel op de proforma opnieuw uit de offerte opgebouwd
(3.4), met `purchase_invoice_line_id` erbij.

Nacalculatie (`AdminPostChargesSection`, extra kosten die een partner na
afloop opgeeft) blijft een eigen blok en komt als `origin = post_charge`
op de proforma zodra de admin hem goedkeurt, zoals nu als kostenpost.

### 3.4 Wat er gebeurt als het programma na akkoord verandert

Besluit 1 (voorgesteld, te bevestigen): **een proformaregel volgt zijn
offerte-onderdeel zolang hij nog uit de offerte komt.**

- Verandert de prijs, het aantal of de omschrijving van een onderdeel, dan
  werkt de app de `quote_item`-regel bij (een trigger op
  `program_request_items` of de bestaande save-paden). `quote_amount_incl_vat`
  verandert mee; de kolom "Offerte" toont dus altijd de huidige offerte, en
  de pill "Gewijzigd na akkoord" verschijnt als het bedrag afwijkt van
  `accepted_amount_incl_vat` (het bedrag bij het eerste bevriezen).
- Komt er een onderdeel bij, dan komt er een regel bij. Wordt een onderdeel
  geannuleerd, dan wordt de regel `hidden` met reden "geannuleerd".
- Is de regel al vervangen door inkoopregels, dan volgt hij **niet** meer.
  De doorgestreepte offerteregel toont dan het bedrag van het moment van
  vervangen, en de pill "Offerte gewijzigd na doorbelasten" waarschuwt.
- Fee-regels (`origin = fee`) worden bij elke wijziging opnieuw berekend
  uit `projectInvoiceSpec`, omdat ze van het totaal afhangen. Een
  verborgen fee blijft verborgen (dit vervangt `excluded_fees`).

Zo blijft `projectInvoiceSpec` de ene berekening voor offerte en fees,
maar schrijft hij zijn uitkomst naar de proforma in plaats van hem bij
elke weergave opnieuw op te bouwen.

### 3.5 Registreren, deelfacturen en wat bevroren wordt

- **Eindfactuur**: de proforma krijgt nummer, datum, `status = 'registered'`
  en `invoice_type = 'final'`. Vervangen en verborgen regels worden
  verwijderd uit de regels (ze staan in de geschiedenis van het project),
  de rest is bevroren zoals nu (`guard_bureau_invoice_lines_frozen`,
  uitgebreid naar `status <> 'concept'`). PDF en UBL komen uit de regels,
  ongewijzigd.
- **Deelfactuur**: een losse `bureau_invoices`-rij met één samenvattende
  regel per btw-tarief, zoals nu. De proforma blijft `concept` en toont
  "geregistreerd" en "openstaand".
- **Restant factureren**: de proforma zelf wordt de slotfactuur; de regels
  blijven volledig, de eerdere termijnen staan op de PDF als aftrek, zoals
  nu.
- **Creditnota**: ongewijzigd.
- **Na registreren** van de eindfactuur is er geen concept meer. Komt er
  daarna nog een inkoopfactuur binnen, dan toont het werkblad "Factuur al
  geregistreerd; maak een creditnota of een aanvullende factuur" en biedt
  "Nieuwe proforma voor het restant" aan: een nieuw concept met alleen de
  regels die nog niet gefactureerd zijn.

## 4. Datamodel

**`bureau_invoices`** (bestaat): `status` krijgt de waarde `concept`
(zonder nummer en datum; de uniciteitsindex op nummer laat NULL toe),
`+ accepted_at` (moment van bevriezen van de offerte). Per project maximaal
één concept (partiële unieke index).

**`bureau_invoice_lines`** (bestaat, wordt de proforma):
`+ origin` (`quote_item` | `purchase_line` | `lodging` | `fee` |
`post_charge` | `manual`), `+ line_status` (`active` | `replaced` |
`hidden`), `+ replaces_line_id` (FK naar dezelfde tabel), `+ hidden_reason`,
`+ purchase_invoice_line_id` (FK `purchase_invoice_lines`, `ON DELETE
RESTRICT`: een inkoopregel die op een proforma staat kan niet stil
verdwijnen; eerst terugdraaien), `+ purchase_invoice_id`,
`+ accommodation_quote_id`, `+ fee_key`, `+ quote_amount_incl_vat`,
`+ accepted_amount_incl_vat`. `item_id` bestaat al. De bevriestrigger kijkt
naar `status <> 'concept'` in plaats van `forwarded_to_accounting_at`
(dat blijft de tweede grendel).

**`purchase_invoice_lines`** (bestaat): `charge_status` vervalt. Of een
regel doorbelast is, is afgeleid: er bestaat een actieve proformaregel met
deze `purchase_invoice_line_id`. `+ note` (de reden bij "laat staan").
`skip_reason`, `charged_at` en `item_id` vervallen; `request_id`,
`lodging_quote_id` en de verzamelfactuurkolommen blijven.

**`program_item_billing_lines`**: vervalt na migratie (fase 4).
Handmatige regels worden `origin = manual` op de proforma, regels uit
inkoop worden `origin = purchase_line` met `replaces_line_id` naar de
offerteregel van hun onderdeel.

**`program_request_items`**: `keep_quoted_price`, `final_billing_locked_at`
en `created_from_purchase_lines` vervallen. Kostenposten met `day_index =
-1` worden proformaregels zonder onderdeel (`origin = purchase_line` als
ze een bron hebben, anders `manual`) en daarna verwijderd. `invoiced_*` en
`commission_*` blijven, gevuld door `sync_item_invoice_fields`.

**`partner_purchase_invoice_allocations`** (bestaat): ongewijzigd. Een
nieuwe databasefunctie `rebuild_allocations_from_proforma(request_id)`
bouwt ze op uit actieve proformaregels met `item_id` en
`purchase_invoice_line_id` (onderdeel × btw), en wordt aangeroepen na elke
wijziging op de proforma. Dit is dezelfde logica als het slot van
`apply_purchase_line_charges`.

**`program_requests`**: `invoice_spec_total_incl_vat` blijft en wordt de
som van de actieve proformaregels; `excluded_fees` vervalt ten gunste van
verborgen fee-regels.

## 5. Schermen

| Plek | Nu | Straks |
|---|---|---|
| Financiën-tab: werkblad Doorbelasten | links inkoopregels, rechts programma | vervalt; wordt de proforma (3.3) |
| Financiën-tab: Financieel Overzicht | eigen kaart, toont de live berekening | vervalt; de proforma toont Offerte / Inkoop / Factuur per regel |
| Financiën-tab: Overige kosten | eigen kaart met potlood en prullenbak | vervalt; regels zonder onderdeel staan op de proforma |
| Regeleditor (potlood op het onderdeel) | handmatige klantregels per onderdeel | vervalt; "Handmatige regel" op de proforma |
| Inkoopfacturen Partners (kaart) | lijst met status en acties | blijft; per factuur "n van m regels op de factuur" |
| Voltooiingsstatus en Marge | uit `projectInvoiceSpec` | uit de proforma; marge per regel én totaal |
| Factuurvoorbeeld | rekent live of leest geregistreerde regels | leest altijd regels (concept of geregistreerd) |
| Facturatiepagina (`/admin/facturatie`) | totalen uit `projectInvoiceSpec` | totalen uit de proforma; projecten zonder akkoord blijven de live berekening tonen |
| Klantportaal `PriceSummaryCard` | live berekening | actieve proformaregels (zonder herkomst, zonder doorgestreepte regels) |
| Werkbank: taak "inkoopfactuur zonder onderdeel" | naar het werkblad | naar "Nog niet op de factuur" op de proforma |
| Inkoopfacturenpagina: "Regels verdelen over projecten" | blijft | blijft; een verplaatste regel die op een proforma stond wordt eerst teruggedraaid, met melding |

## 6. Fasen

**Fase 1, de proforma bestaat (3 dagen).** Migratie: nieuwe kolommen,
status `concept`, partiële index. `createProformaForRequest` bouwt het
concept uit `projectInvoiceSpec` bij akkoord en bij de knop "Proforma
aanmaken" op een al akkoord project. De volg-logica van 3.4 voor
`quote_item`- en `fee`-regels. Het factuurvoorbeeld leest het concept.
Alles wat er nu is blijft werken; de proforma loopt parallel en wordt op
het testproject vergeleken met de huidige berekening (zelfde totalen, of
een verklaard verschil).

**Fase 2, doorbelasten op de proforma (3 dagen).** Nieuwe kaart
`ProformaCard` (`src/components/admin/proforma/`): de factuur met
herkomstpills, de menu's Vervang / Terugdraaien / Verbergen / Handmatig,
en de lijst "Nog niet op de factuur" met de voorstellen van de matcher.
Databasefunctie `apply_proforma_changes(request_id, jsonb)` die in één
transactie regels vervangt, toevoegt of terugdraait en daarna
`rebuild_allocations_from_proforma` aanroept. Op het testproject vervangt
deze kaart het werkblad, het overzicht, Overige kosten en de regeleditor
(feature flag per project: `bureau_invoices.status = 'concept'` aanwezig).
De logiesroute en nacalculatie worden aangesloten.

**Fase 3, alles leest de proforma (2 dagen).** Voltooiingsstatus, marge,
facturatiepagina, klantportaal en de SQL-trigger lezen de actieve
proformaregels. Registreren bevriest het concept (3.5); deel- en
restantfactuur zoals beschreven. `chooseStoredLines` vervalt: de regels
zijn er al. Verwijderen of opnieuw verwerken van een inkoopfactuur weigert
zolang er regels van die factuur op een proforma staan, met de knop
"Eerst terugdraaien (n regels)".

**Fase 4, migratie en opruimen (1 dag).** Migratie voor alle lopende
projecten met akkoord: proforma aanmaken, bestaande klantregels en
kostenposten overzetten (per project een controleregel: totaal vóór =
totaal ná, anders stopt de migratie en noemt het project). Daarna
verdwijnen `program_item_billing_lines`, `keep_quoted_price`,
`final_billing_locked_at`, `created_from_purchase_lines`, `charge_status`,
`skip_reason`, `excluded_fees`, de dag −1 posten,
`apply_purchase_line_charges`, `ChargeWorksheetCard`,
`FinancialOverviewCard`, `AdminItemBillingLinesEditor`, `AdminAddCostSheet`
en `purchaseInvoiceCleanup.ts` (de plan-functies ervan gaan naar de
weiger-melding uit fase 3). `purchaseLineMatcher.ts` blijft, met als
kandidaten de `quote_item`-regels van de proforma in plaats van de
onderdelen.

## 7. Besluiten

1. **Programmawijzigingen na akkoord** volgen de proforma zolang de regel
   nog uit de offerte komt; een vervangen regel volgt niet meer en krijgt
   een waarschuwing (3.4). *Te bevestigen door Erwin.*
2. **Geen aparte status "niet doorbelasten".** Een inkoopregel die niet op
   de proforma staat is niet doorbelast; de reden is een opmerking. Dat
   haalt `kept_quote`, `skipped` en `legacy` weg.
3. **Eerst één testproject**, zoals in oktober (BV-2606-0004 ligt voor de
   hand: daar speelden "factuur vervangt offerteregel" en de Fortuna-regel).
   Pas als fase 1 tot 3 daar kloppen, draait fase 4 voor alle projecten.
   *Te bevestigen door Erwin.*
4. **De proforma is zichtbaar voor de klant** in het portaal als
   prijsoverzicht, zonder herkomst en zonder doorgestreepte regels. Een
   echte "proforma PDF naar de klant" is geen onderdeel van dit plan.
5. **Verzamelfacturen** blijven zoals in 2b: de regels dragen het project en
   verschijnen in "Nog niet op de factuur" van dat project.

## 8. Bewust niet in dit plan

- Een nieuwe matcher of AI-classificatie: de voorstellen blijven dezelfde
  signalen, alleen op proformaregels in plaats van onderdelen.
- Wijzigingen aan de commissieflow, commissiefacturen, Snelstart, de
  betaalbatch, incasso of bankmatching.
- Facturen aan de gast (`billed_to = customer`): hun regels horen nooit op
  de proforma en komen daarom standaard niet in "Nog niet op de factuur";
  dat was in oktober handwerk en wordt nu de regel.
- Meerdere proforma's per project (bijvoorbeeld per deelnemer): één concept
  per project, deelfacturen blijven samenvattende regels.
