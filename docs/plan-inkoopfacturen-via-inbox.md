# Plan: inkoopfacturen van partners alleen nog via de inkoop-inbox

Status: plan 16 november 2026, naar aanleiding van factuur T-261029 van
Zuiver Traiteur (€ 300 op de pdf, € 402,97 uitbetaald). Erwin: "Partners
moeten gewoon hun pdf mailen in plaats van invoeren. Hierdoor ontstaan alleen
maar fouten." Cijfers in dit plan komen uit alleen-lezen queries op de
productiedatabase van 16 november.

## Samenvatting

Een partner kan een inkoopfactuur nu op vijf manieren aanleveren. Vier daarvan
laten de partner zelf bedragen overtypen, en op twee daarvan rekende de code
de btw verkeerd uit. Daardoor zijn drie facturen te hoog uitbetaald (samen
€ 179,49). De vijfde route, de pdf mailen naar de inkoop-inbox, laat de
partner niets rekenen: de scanner leest de pdf, de admin bevestigt met de pdf
ernaast, en opslaan is geblokkeerd zolang ons totaal niet gelijk is aan het
pdf-totaal.

Het plan maakt die vijfde route de enige. Het partnerportaal vertelt de
partner wat hij moet factureren en waar hij de pdf heen mailt, en laat daarna
zien of de factuur is ontvangen, verwerkt en betaald. De partner typt geen
bedrag, geen btw-tarief en geen factuurnummer meer in. De inbox herkent de
partner aan het afzendadres en het project aan ons referentienummer, en
stuurt de partner een ontvangstbevestiging. De registratiedialogen in het
portaal en de edge function `register-partner-invoice` gaan daarna weg.

Vier fasen, circa 4 bouwdagen. Fase 0 (bugfix en correctie) is vandaag gedaan.

## Voortgang

**Fase 1 (17 november 2026), portaal.** Het partnerportaal vraagt om een
pdf, niet om cijfers. Op Facturatie, "Nog te factureren", staat per project
de knop **Factuur mailen** (`InvoiceMailButton`, `buildInvoiceMailto` in
`src/lib/partnerInvoiceMail.ts`, met tests): een `mailto:` naar de
inkoop-inbox met onderwerp "Factuur [partner] voor [BV-nummer]" en in de
tekst referentie, programma met datum, "gericht aan Bureau Vlieland" of
"betaald door de gast" (uit `defaultBilledToForProject`) en de onderdelen
met hun prijsopgave. Dezelfde knop staat op de onderdeelkaart, in de
onderdeelsheet (prop `invoiceMailHref`, één mail per project met alle te
factureren onderdelen), op de logieskaart en in de logiesofferte-sheet.
Per project toont het portaal de status uit §3.1
(`partnerInvoiceStatusForProject` in `src/lib/partnerInvoiceStatus.ts`,
met tests): "Nog niet ontvangen", "Ontvangen op …, wordt verwerkt",
"Uw mail van … bevatte geen leesbare pdf", "Verwerkt: factuur …, € …",
"Betaald op …". De bron is `get-partner-dashboard`, dat nu
`purchaseInvoices` (facturen van de partner met de projecten van kop en
regels) en `invoiceMails` (inboxmails van het partner- of contactadres,
met de BV-nummers uit onderwerp, tekst en scan) meestuurt, laatste half
jaar. Een open mail zonder herkenbaar nummer staat als "Uw mail is
ontvangen" boven de lijst.

De registratiedialogen zijn niet weg maar staan achter de instelling
`partner_invoice_registration_enabled` (migratie `20261117150000`,
standaard uit, `usePartnerInvoiceRoute`): aan zet de oude knoppen terug
als noodrem. Teksten mee: handleiding "Een factuur sturen", werkbank
("mail de pdf van uw factuur"), logieskaart en -sheet, en de
herinneringsmails T+3 en T+7 (templates in dezelfde migratie, fallback in
`check-pending-items`): mail de pdf naar de inbox met onze referentie
erop, knop "Status bekijken in het portaal". Nog niet gedaan uit fase 1:
niets; fase 2 (afzender herkennen, ontvangstbevestiging, nummer uit het
onderwerp, directe allocatie bij één onderdeel) volgt.

## 1. Wat er misging bij T-261029

| Stap | Bedrag | Waar |
|---|---|---|
| Pdf van Zuiver Traiteur | € 300,00 incl. 9% | de echte factuur |
| Partner typt in het portaal | € 363,00 | invoerfout: € 300 plus 21% |
| Dialoog rekent terug naar excl. met het tarief van het onderdeel (9%) | € 333,03 | `InvoiceRegistrationDialog.tsx` |
| Dialoog stuurt alleen het excl-bedrag, zonder tarief | | |
| Edge function telt er standaard 21% bij | € 402,97 | `register-partner-invoice` |
| Commissie 15% over € 333,03 | € 49,95 (hoort € 41,28) | trigger `sync_item_invoice_fields` |
| Uitbetaald in BATCH-2610-0001 | € 402,97 | € 102,97 te veel |

Twee fouten dus: de partner typte het verkeerde bedrag, en de code maakte
van elk 9%-bedrag een 21%-bedrag (factor 1,21 ÷ 1,09, ruim 11% te hoog).
Dezelfde codefout zit in T-261030 (Zuiver Traiteur, € 46,79 te veel) en
2026-04 (Vlieland Yoga, € 29,73 te veel). Eerdere 9%-facturen van Zuiver
Traiteur (T-261026, T-261027) staan goed; vermoedelijk kwamen die via de
verzamelfactuurdialoog, die het tarief per onderdeel wél meestuurt.

**Fase 0, gedaan op 16 november.** De dialoog stuurt het btw-tarief mee en
de edge function valt terug op het tarief van het onderdeel, nooit meer blind
op 21% (`supabase/functions/_shared/vatRate.ts`, met tests). Migratie
`20261116120000_correctie-btw-portaalfacturen.sql` zet de drie facturen, hun
allocaties en de commissie op de onderdelen terug naar het bedrag incl. 9%
en zet het te veel betaalde bedrag in de omschrijving. De drie pdf's zijn
nagekeken: € 300, € 425 en € 270, alle incl. 9%. De batches blijven zoals ze
zijn; de € 179,49 wordt met de partners verrekend.

## 2. De vijf routes van nu

| Route | Wie typt het bedrag | Btw | Controle op de pdf | Gebruik sinds juni |
|---|---|---|---|---|
| A. Portaal, per onderdeel (`InvoiceRegistrationDialog`) | partner, incl. btw | tarief van het bouwblok, client en server rekenden los van elkaar | geen; pdf wordt alleen opgeslagen | het grootste deel van 27 |
| B. Portaal, verzamelfactuur met pdf (`RegisterCollectivePartnerInvoiceDialog`) | partner, per onderdeel | per onderdeel meegestuurd | geen | 1 |
| C. Portaal, "Gefactureerd via e-mail" (zelfde dialoog, status `pending_email_match`) | partner | idem | pas later, als de admin de pdf uit de inbox koppelt (`MatchedRegistrationBanner`) | 3 |
| D. Logies (`register-accommodation-invoice`) | partner | tarief van de offerte | geen | enkele |
| E. Inkoop-inbox: pdf mailen naar `invoices@reply.bureauvlieland.nl` | niemand: scanner leest de pdf, admin bevestigt | uit de pdf, per regel | `evaluateSaveGuard` blokkeert opslaan bij een afwijking van meer dan € 0,02 | 105 mails, 66 verwerkt, 11 open |

Sinds juni zijn 27 facturen door partners geregistreerd (€ 19.195) en 26
door het bureau (€ 32.867), bijna allemaal vanuit de inbox. Van de 27
partnerregistraties zijn er 3 fout gegaan (11%). Van de inboxfacturen is
geen afwijking bekend: de pdf-totaalcontrole laat een verkeerd bedrag niet
door.

Waarom routes A tot en met D fouten uitlokken:

- De partner moet weten of zijn bedrag incl. of excl. is, en welk tarief
  erbij hoort. Zuiver Traiteur rekende met 21% waar het bouwblok 9% zegt.
- Het vooringevulde bedrag is onze prijsopgave of inschatting, niet zijn
  factuur. Wie op "Registreren" klikt zonder te kijken, registreert ons
  getal.
- Twee stukken code (dialoog en edge function) rekenden elk een kant van de
  btw uit, zonder gedeelde waarheid. Dat was de bug.
- Route C maakt een factuurrij zonder pdf. Komt de mail niet, dan staat er
  een factuur in de betaalstroom die niemand kan controleren.
- Dubbele registratie: dezelfde factuur via het portaal én via de mail. Daar
  zijn al drie dubbelcontroles voor gebouwd (nummer, bedrag, ons
  projectnummer als factuurnummer), wat laat zien hoeveel er mis kan gaan.

Waarom route E het minst foutgevoelig is:

- De pdf is de enige bron. Bedrag, btw-uitsplitsing, factuurnummer en datum
  komen uit de scan (`scan-purchase-invoice-internal`), de admin corrigeert
  met de pdf ernaast.
- Opslaan kan niet zolang ons totaal afwijkt van het pdf-totaal, tenzij de
  admin een reden opgeeft (`purchaseInvoiceTotalMatch.ts`).
- Partner en project worden voorgesteld uit de pdf: IBAN of naam voor de
  partner (`purchaseInvoicePartnerSuggestion.ts`), ons referentienummer of
  de klantnaam voor het project (`purchaseInvoiceProjectSuggestion.ts`).
  Staat ons referentienummer op de factuur, dan is het project vast
  voorgekozen.
- De dubbelcontroles op nummer en bedrag gelden ook hier.
- Doorsturen naar Snelstart, betaalbatch, incasso en bankmatching werken al
  op de factuurrij die hieruit komt. Daar verandert niets.

## 3. Ontwerp

### 3.1 Het portaal vraagt om een pdf, niet om cijfers

Het tabblad "Te factureren" op de facturatiepagina (`PartnerFinance.tsx`)
houdt de lijst per project (onderdelen, bedragen volgens prijsopgave, datum),
want dat is wat de partner nodig heeft om zijn factuur te maken. De knoppen
"Factuur registreren", "Verzamelfactuur registreren" en "Gefactureerd via
e-mail" verdwijnen. Daarvoor in de plaats, per project, één knop
**"Factuur mailen"**: een `mailto:` naar de inkoop-inbox met onderwerp
`Factuur [partnernaam] voor [BV-nummer]` en in de tekst de drie dingen die op
de factuur moeten staan: ons referentienummer, de datum van het programma en
"gericht aan Bureau Vlieland" of "betaald door de gast" (zie 3.5). Daarnaast
de vaste uitleg: "Mail de pdf van uw factuur, met ons nummer BV-… erop. U
hoeft niets in te vullen. Binnen een werkdag ziet u hier dat hij is
ontvangen."

Per project laat het portaal daarna de **status** zien, in deze volgorde:

| Status | Bron | Tekst voor de partner |
|---|---|---|
| Wacht op uw factuur | geen inboxmail en geen factuurrij | "Nog niet ontvangen" |
| Ontvangen | `purchase_invoice_inbox` met afzender van deze partner, status `new` | "Ontvangen op [datum], wordt verwerkt" |
| Verwerkt | `partner_purchase_invoices` aan dit project (status pending/forwarded) | "Verwerkt: factuur [nummer], € [incl.]" |
| Betaald | status paid, of batch gegenereerd | "Betaald op [datum]" |
| Niet leesbaar | inbox `scan_status = failed` | "Uw mail van [datum] bevatte geen leesbare pdf; mail de factuur opnieuw als losse pdf-bijlage" |

Het dashboard van het portaal (`partnerDashboardItems`) en de mails van
`check-pending-items` ("factuur ontbreekt") krijgen dezelfde tekst: mail de
pdf, met ons nummer erop. De exportknop (`ExportInvoicesButton`) blijft: die
maakt het lijstje dat de partner in zijn eigen boekhouding overneemt.

### 3.2 De inbox herkent de partner aan de afzender

`inbound-purchase-invoice` bewaart het afzendadres al (`from_email`). Nieuw:
bij het scannen wordt de partner eerst gezocht op afzendadres, voordat naar
IBAN en naam wordt gekeken. Adressen die tellen: `partners.email`,
`partners.contact_email`, en een nieuwe lijst `partners.invoice_sender_emails`
(migratie) voor de boekhouder of het factuurprogramma dat vanaf een ander
adres mailt. `purchaseInvoicePartnerSuggestion.ts` krijgt de reden
`"sender"` bovenaan, boven IBAN; de dialoog toont "herkend aan afzender".

Stuurt een onbekend adres een pdf waarvan de IBAN of naam wél bij een partner
past, dan toont de inbox een knop "Dit adres onthouden bij [partner]", die
het adres aan `invoice_sender_emails` toevoegt. Zo leert de lijst zichzelf
vullen zonder dat iemand partnerpagina's hoeft na te lopen.

Het project wordt al herkend aan ons referentienummer in de gescande tekst.
Nieuw: ook het onderwerp en de tekst van de mail tellen mee (de `mailto:`
uit 3.1 zet het nummer in het onderwerp), zodat een factuur zonder nummer
op de pdf toch vast voorgekozen is als de partner via de knop mailde.

### 3.3 De partner krijgt een ontvangstbevestiging

Na een geslaagde scan stuurt `scan-purchase-invoice-internal` één mail naar
het afzendadres, via de bestaande templates (`email-templates.ts`, gelogd in
`email_log`): "Wij hebben uw factuur [nummer] van € [incl.] ontvangen voor
[BV-nummer, klant]. U hoeft verder niets te doen." Mislukt de scan (geen pdf,
niet leesbaar), dan gaat dezelfde mail als afwijzing: wat er mis was en wat
de partner moet doen. Die tekst bestaat al in `inbound-purchase-invoice`
(`hint`), maar wordt nu alleen in de inbox getoond en niet naar de partner
gestuurd.

Geen mail bij verwerken en betalen: dat ziet de partner in het portaal
(3.1), en het betaalbericht van de bank is de echte bevestiging.

### 3.4 Commissie en doorbelasten lopen via het project

Sinds fase 1 van het doorbelasten-plan hangt een inboxfactuur aan het
project (`item_id` leeg, geen allocaties). De commissiewerklijst ziet zo'n
factuur als "niet gekoppeld" tot het werkblad Doorbelasten de verdeling per
onderdeel wegschrijft, en pas dan vult `sync_item_invoice_fields` de
commissie op het onderdeel. Dat is de bedoelde weg en verandert niet.

Wel nodig, omdat de portaalroute dit tot nu toe deed: een project met één
onderdeel van deze partner en één inboxfactuur krijgt bij opslaan direct de
allocatie op dat onderdeel (`AddPurchaseInvoiceDialog`: als het project
precies één onderdeel van de gekozen partner heeft, `item_id` en één
allocatie vullen). Zo blijft de commissie voor het gros van de facturen (één
lunch, één boottocht) zonder werkblad op "te factureren" staan, zoals nu.
Meerdere onderdelen of meerdere projecten: via het werkblad, zoals gepland.

### 3.5 Facturen die de gast zelf betaalde

Die lopen ook via de mail. De partner zet op de factuur of in de mail "door
de gast betaald"; de knop uit 3.1 zet die regel in de tekst als het project
of onderdeel daarom vraagt (`billed_to = customer`, zie
factuur-aan-de-gast.md). In de inbox-dialoog staat het vinkje "De gast heeft
deze factuur zelf betaald" al; nieuw is alleen dat de scanner de zin herkent
en het vinkje voorzet.

### 3.6 Logies

`register-accommodation-invoice` en de logiesvariant van de dialoog gaan
dezelfde weg: de hotelfactuur wordt gemaild, de inbox stelt het project voor,
en `apply-purchase-invoice-to-lodging` koppelt de factuur aan de offerte
zoals nu bij handmatig geregistreerde hotelfacturen. De knop in het portaal
op de logieskaart wordt dezelfde "Factuur mailen".

### 3.7 Wat weggaat

Na fase 3, als alle open "via e-mail"-registraties zijn gekoppeld
(nu 0 met status `pending_email_match`):

- `InvoiceRegistrationDialog.tsx`, `RegisterCollectivePartnerInvoiceDialog.tsx`,
  `UploadInvoicePdfPartnerDialog.tsx` en de bijbehorende knoppen en states in
  `PartnerFinance.tsx`.
- Edge functions `register-partner-invoice`, `register-accommodation-invoice`,
  `attach-accommodation-invoice-pdf`, `notify-partners-missing-invoice-pdf`.
- Status `pending_email_match` (`purchaseInvoiceStatusFlow.ts`),
  `MatchedRegistrationBanner.tsx`, en de blokkade "wacht nog op de PDF uit de
  inkoop-inbox" in `AdminPurchaseInvoices.tsx`.
- `registered_by = 'partner'` blijft als historische waarde in de data; nieuwe
  rijen krijgen altijd `admin`.
- Tests die de weggehaalde functies dekken; `edgeFunctionTestCoverage.ts`
  bijwerken.

In fase 1 worden de dialogen eerst verborgen achter de instelling
`partner_invoice_registration_enabled` (standaard uit), zodat een partner die
midden in een registratie zit niet vastloopt en we een week kunnen
terugschakelen als de mailroute ergens hapert.

## 4. Fasen

| Fase | Inhoud | Dagen |
|---|---|---|
| 0 | Bugfix btw-tarief, correctiemigratie drie facturen. **Gedaan 16 november.** | – |
| 1 | Portaal: knop "Factuur mailen" met `mailto:`, status per project (3.1), teksten van herinneringen en dashboard, instelling die de oude dialogen verbergt. | 1 |
| 2 | Inbox: partner op afzendadres, `invoice_sender_emails` met de knop "adres onthouden", referentienummer uit onderwerp en mailtekst, ontvangstbevestiging en afwijzing naar de partner (3.2, 3.3), gast-betaald herkennen (3.5), directe allocatie bij één onderdeel (3.4). | 1,5 |
| 3 | Logies via dezelfde route (3.6). Mail aan alle actieve partners: "Vanaf [datum] alleen nog mailen", met de drie dingen die op de factuur moeten staan. | 0,5 |
| 4 | Opruimen (3.7) nadat de laatste portaalregistratie is afgehandeld. Documentatie: plan-commissiefacturen.md hoofdstuk 1 en factuur-aan-de-gast.md bijwerken. | 1 |

## 5. Risico's en wat we ertegen doen

- **De partner zet ons nummer niet op de factuur.** De knop zet het in het
  onderwerp; de afzender geeft de partner; de klantnaam op de factuur blijft
  een suggestie. In het slechtste geval kiest de admin het project zelf,
  zoals nu bij elke inboxfactuur.
- **De partner mailt vanaf een onbekend adres.** IBAN en naam vangen dat op,
  en de knop "adres onthouden" voorkomt dat het twee keer gebeurt.
- **Een mail zonder pdf of met de factuur in de mailtekst.** De partner krijgt
  direct de afwijzing met uitleg (3.3); nu blijft zo'n mail stil in de inbox
  staan tot de admin hem ziet.
- **De scanner leest een bedrag verkeerd.** Dat is het geval dat de
  pdf-totaalcontrole al afvangt: de admin ziet de afwijking en corrigeert
  met de pdf in beeld. Dit is precies wat bij de portaalroute ontbrak.
- **Verwerken kost de admin tijd.** Per factuur blijft het: partner en
  project bevestigen, bedrag naast de pdf leggen, opslaan. Dat is minder dan
  nu, waar de admin bij elke portaalregistratie achteraf moest nakijken of de
  partner het goed had ingevuld, en dat niet deed.

## 6. Bewust niet in dit plan

- Een uploadknop in het portaal als alternatief voor mailen. Dat is route B
  met een ander jasje: twee routes betekent weer twee plekken die uit elkaar
  kunnen lopen. Wie geen mail kan sturen, kan geen factuur sturen.
- De scan volledig automatisch laten opslaan zonder admin. De controle met de
  pdf ernaast is de reden dat deze route betrouwbaar is.
- Een eigen factuurnummerreeks (T-…) voor partners zonder boekhouding. Het
  factuurnummer is wat op de pdf staat; staat er geen, dan kent de scanner er
  geen toe en vult de admin het in.
