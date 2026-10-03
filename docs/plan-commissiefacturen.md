# Plan: Commissies en commissiefacturen (`/admin/commissies`)

Status: onderzoek en plan 3 oktober 2026, nog te beoordelen. Daarna bouwen in
fasen; na fase 0 en 1 kan Erwin de commissiefacturen van 2026 verwerken.

Voortgang (3 oktober 2026): fase 1 is gebouwd, behalve de duplicaatcontrole in
de admin-registratie: die bestaat al (`useLikelyDuplicatePurchaseInvoice` in
`AddPurchaseInvoiceDialog` met "Toch opslaan"), het plan ging daar uit van een
verouderde situatie. Migratie `20261003120000` moet nog worden uitgerold; fase 0
(dataopschoning) is nog niet gedaan.

## Samenvatting

De commissieflow bestaat uit drie schermen (werklijst, factuur maken,
facturenoverzicht), twee edge functions voor versturen en doorsturen, en de
reconciliatie die verkoop en inkoopfacturen tegen elkaar legt. De reconciliatie
zelf is goed doordacht en getest. Daaromheen is het niet robuust:

- **Er zit zo'n € 8.700 aan commissie (ex btw) in het systeem voor 2026, waarvan
  de werklijst er € 5.171 toont.** Ongeveer € 945 is onzichtbaar omdat de
  inkoopfactuur aan een onderdeel hangt dat nooit op "bevestigd" is gezet, en
  € 2.624 staat als "verwacht" terwijl het verblijf al geweest is (waaronder
  € 2.423 voor Strandhotel Seeduyn, 10 september).
- **Een conceptfactuur beschermt nergens tegen.** Onderdelen op een concept
  blijven "Te factureren" en kunnen op een tweede factuur. Losse inkoopfacturen
  worden juist al bij het concept als gefactureerd gemarkeerd. Een concept kan
  niet worden verwijderd, bewerkt of alsnog verstuurd.
- **Vier plekken berekenen de commissie elk anders** (werklijst, databasetrigger,
  partnerportaal, de oude tabbladen Gefactureerd/Betaald), met terugvalpercentages
  van 0, 10 en 15 procent. Alleen de werklijst klopt.
- **De drie bestaande concepten (BVC-2607-0001, -0002, BVC-2610-0001) zijn
  verouderd**: de twee van juli rekenden over bedragen inclusief btw (€ 300 in
  plaats van € 247,93), het concept van oktober heeft twee inkoopfacturen
  "op slot" gezet die daardoor uit de werklijst zijn verdwenen.
- Een hele pro-forma-flow (partner bevestigt commissie vooraf) staat in de code
  maar kan niet werken: de statussen die hij schrijft worden door de database
  geweigerd. Het dashboard en het financieel dashboard tellen daardoor op 0.

Het plan: eerst de data opschonen en de lekken dichten (fase 0 en 1), dan de
factuur een echte levenscyclus geven (fase 2), dan de presentatie (fase 3), en
tot slot dood hout weghalen (fase 4). Circa 7 bouwdagen.

## 1. Hoe het nu werkt

```
partner registreert inkoopfactuur        admin registreert inkoopfactuur
(partnerportaal, per onderdeel)          (inkoop-inbox, aan onderdeel/project)
              ↓                                        ↓
       partner_purchase_invoices (+ allocaties per onderdeel)
              ↓  trigger sync_item_invoice_fields
       program_request_items.invoiced_* / commission_status = pending
              ↓
   get-commission-reconciliation  ← één loader + buildReconciliationRows
              ↓
   Werklijst (/admin/commissies): Te factureren | Verwacht | Gefactureerd | Betaald | Gearchiveerd
              ↓ selectie → URL met itemIds/quoteIds/invoiceIds/basis/amounts
   Commissiefactuur maken: regels, PDF, opslaan als concept (nummer BVC-JJMM-NNNN)
              ↓ Verstuur naar partner (mail + PDF, status sent, onderdelen → invoiced)
   Commissiefacturen: Doorsturen naar Snelstart (forwarded) → Markeer als betaald (paid)
```

Grondslag per regel: de inkoopfactuur ex btw als die er is, anders onze
verkoopwaarde ex btw. Percentage: het snapshot op het onderdeel, anders het
partnerpercentage (activiteit of logies). Logies: kamer plus extra's, teruggerekend
naar ex btw. Dit is de enige berekening die klopt en die blijft de basis.

## 2. Wat de historie laat zien

Alle cijfers uit de productiedatabase op 3 oktober 2026, met de echte
reconciliatiecode doorgerekend. Het systeem bevat alleen 2026; er is nog geen
commissiefactuur verstuurd (het maillog heeft nul verzendingen van het type
`commission_invoice_sent`).

### 2.1 Wat de werklijst nu toont

| Tab | Regels | Commissie ex btw |
|---|---|---|
| Te factureren | 62 regels, 14 partners | € 5.171 |
| Verwacht | 13 regels | € 3.212 |
| Gearchiveerd / commissievrij | 9 regels (Doeksen, Bazuin 0 %, bureau) | € 0 |
| Afgehandeld (door concept BVC-2610-0001) | 2 losse inkoopfacturen Fortuna | € 219 |

Grootste posten te factureren: Zuiver Traiteur € 1.590 (17 regels), Kampeerterrein
Stortemelk € 846 (2 projectfacturen), Zeezicht € 814 (2 logies), Zeehondentochten
€ 562, Vlieland Outdoor Center € 515, Trattoria Oliva € 375.

### 2.2 Wat de werklijst mist

**A. Inkoopfacturen aan onderdelen die nooit "bevestigd" zijn (€ 945).** Tien
inkoopfacturen (€ 10.700 ex btw) hangen aan onderdelen met status `pending`.
De loader neemt alleen verkochte statussen mee, dus deze regels bestaan niet in
de werklijst, en omdat de factuur wél gekoppeld is, staat hij ook niet bij
"niet gekoppeld". Ze zijn simpelweg weg.

| Partner | Onderdeel (project) | Basis | Commissie |
|---|---|---|---|
| Vlieland Outdoor Center | Afhuur VOC & materiaal (BV-2604-0002) | € 3.619,83 | € 361,98 |
| Zeezicht | Diner Restaurant Zeezicht (BV-2604-0004) | € 3.313,63 | € 331,36 |
| Bagagevervoer Vlieland | 2 facturen (BV-2604-0002, BV-2608-0004) | € 1.322,31 | € 132,23 |
| Brouwerij Fortuna | Zaalhuur (BV-2608-0002) | € 550,05 | € 55,01 |
| Manege De Seeruyter | Paardrijden (BV-2602-0002) | € 546,70 | € 54,67 |
| Bunkermuseum | Bezoek (BV-2602-0002) | € 102,76 | € 10,28 |
| Bazuin (0 %), Doeksen (verrekent zelf) | 3 facturen | € 1.042 | € 0 |

Acht van de tien projecten staan op "volledig gefactureerd" aan de klant. Het
werk is dus geleverd en betaald, alleen het onderdeel is nooit op bevestigd gezet.

**B. Logies blijft "verwacht" tot iemand de aanvraag afrondt (€ 2.624).** Voor
logies wordt de regel pas factureerbaar als de logiesaanvraag `completion_status`
heeft. Dat zet alleen de facturatiepagina; de automatische afsluiting na de datum
doet dat niet voor logies. Gevolg: LOG-2603-0005 Zeezicht (2 april, factuur
ontvangen, € 108,60), LOG-2602-0005 Vlielandhotel (9 april, factuur ontvangen,
€ 92,59) en LOG-2602-0004 Seeduyn (10 september, nog geen factuur, € 2.423,39)
staan vijf maanden na dato nog bij "Verwacht".

**C. Regels zonder grondslag tonen € 0 als te factureren.** Vijf regels hebben
geen verkoopprijs én geen inkoopfactuur (Manege Paardrijden, Zuiver Lunch en
Strand BBQ Artcadia, VOC Powerkiten Daan Dijk en Tandkliniek). Ze staan bij
"Te factureren" met € 0,00 en zouden met één vinkje mee op een factuur gaan.
Dat hoort "grondslag onbekend" te zijn.

### 2.3 Fouten in de data zelf

| # | Wat | Gevolg | Fix |
|---|---|---|---|
| 1 | **Dubbel factuurnummer T-261008 (Zuiver)**: één keer door de partner geregistreerd (aan het onderdeel), één keer door admin (aan het project), beide € 206,42 | De werklijst telt beide op: "afwijking" € 412,84 tegen € 206,42 verkoop; commissie € 61,93 in plaats van € 30,96 | Eén van de twee verwijderen; duplicaatcontrole in de admin-registratie (die is er alleen in het partnerportaal) |
| 2 | **Dubbel factuurnummer 202600127 (Fortuna)** met twee verschillende bedragen (€ 550,05 zaalhuur BV-2608-0002 en € 131,92 thuisproeverij BV-2602-0006) | Eén van beide draagt het verkeerde nummer; het concept BVC-2610-0001 factureert de € 131,92 | Nummer corrigeren na controle van de PDF |
| 3 | **Concepten BVC-2607-0001 en -0002 (31 juli)** rekenen over bedragen inclusief btw (€ 300 i.p.v. € 247,93, € 1.072,50 i.p.v. € 886,36); één regel staat op 15 % waar de partner 10 % heeft | Facturen zijn 21 % te hoog; mogen niet verstuurd worden | Verwijderen (zie fase 0) |
| 4 | **Concept BVC-2610-0001 (2 oktober)** heeft inkoopfacturen 202600127 en 202600246 op `commission_invoiced_at` gezet | Die € 218,72 is uit de werklijst verdwenen terwijl er niets verstuurd is | Verwijderen en de markering terugdraaien |
| 5 | **Snapshot `commission_amount` op onderdelen is te laag** bij facturen die over meerdere btw-tarieven zijn verdeeld: de trigger neemt één allocatieregel. Zeezicht diner € 251 i.p.v. € 304, Oliva Salure € 22 i.p.v. € 170 | Partnerportaal, financieel dashboard en de tabbladen Gefactureerd/Betaald tonen andere bedragen dan de werklijst | Trigger laten sommeren (fase 1) |
| 6 | **Hotelofferte op 21 % btw** (Zeezicht € 3.234 en € 5.120, Vlielandhotel € 775) terwijl logies 9 % is | Verkoopwaarde ex btw te laag, dus onterecht "afwijking"; de commissie zelf gaat over de inkoopfactuur en klopt | Controleren bij de partner; `vat_rate` corrigeren |
| 7 | Eén bevestigd onderdeel in een geannuleerd project (prijs leeg) | Staat in de werklijst | Opschonen |

### 2.4 Afwijkingen die wél kloppen

De werklijst meldt 9 afwijkingen. Na controle zijn ze bijna allemaal verklaarbaar:
Fortuna Zaalhuur € 660 ex btw gefactureerd tegen € 660 incl. verkocht (marge-
probleem, geen commissieprobleem), Zuiver Daan Dijk € 333 tegen € 275 (btw 21 %
op de factuur, 9 % in de verkoop), Oliva Salure € 1.703 tegen € 1.225 (meer
geleverd). Dat zijn signalen voor de nacalculatie, niet voor de commissie. De
tab "Afwijking" verdient daarom een eigen uitleg: "partner factureerde meer dan
wij verkochten; commissie gaat over de inkoopfactuur".

## 3. Wat er in de code niet robuust is

Ernst: **hoog** = kan tot foute of dubbele facturen leiden, **midden** = foute
cijfers op een scherm, **laag** = rommel.

### 3.1 Conceptfactuur en statussen (hoog)

1. **Onderdelen op een concept blijven "Te factureren".** `isBillableRow` kijkt
   alleen naar `commission_status` (invoiced/paid) en leest `commission_invoice_lines`
   nooit. Pas bij versturen zet de mailfunctie de onderdelen op `invoiced`. Twee
   keer "Commissiefactuur maken" op dezelfde selectie geeft twee facturen.
2. **Losse inkoopfacturen worden bij het concept al gemarkeerd**
   (`commission_invoiced_at`, `AdminCommissionInvoiceCreate.tsx:362-368`), dus
   precies andersom. Een weggegooid concept laat ze permanent uit de werklijst.
3. **Een concept heeft geen levenscyclus.** Geen verwijderen, bewerken, opnieuw
   openen, of alsnog versturen vanuit het overzicht. `SendCommissionInvoiceDialog`
   bestaat alleen op de aanmaakpagina. Het factuurnummer wordt al bij het concept
   uitgegeven; na verwijderen blijft een gat in de reeks.
4. **"Markeer als betaald" en "Doorsturen naar Snelstart" staan ook op concepten**
   (`AdminCommissionInvoices.tsx:410,425`). Betaald op een concept zet de
   onderdelen van `pending` direct op `paid` zonder dat er iets verstuurd is;
   doorsturen stuurt de boekhouding een mail zonder PDF (de PDF ontstaat pas bij
   versturen).
5. **Versturen controleert de status niet.** Nogmaals versturen van een betaalde
   factuur zet hem terug op `sent` en de onderdelen terug op `invoiced`. De mail
   gaat uit vóór de databaseupdates, en fouten daarin worden genegeerd.
6. **De factuurregels zijn de enige koppeling** tussen onderdeel en factuur, en
   `item_id`/`quote_id` hebben geen foreign key. Wordt een inkoopfactuur verwijderd
   of opnieuw gekoppeld, dan zet de trigger het onderdeel terug op `not_applicable`,
   ook als het al gefactureerd of betaald was; registreert de partner daarna een
   nieuwe factuur, dan is het onderdeel weer "Te factureren".
7. **Het nummer wordt met `MAX+1` zonder lock gegenereerd** en de admin kan het
   veld vrij overschrijven. Dat levert een UNIQUE-fout of een nummer buiten de
   reeks op.
8. **De factuur schrijft niets terug naar het onderdeel.** Grondslag, percentage
   en bedrag kunnen op de factuur worden aangepast, maar `commission_amount` en
   `commission_basis` op het onderdeel blijven de oude snapshot.

### 3.2 Vier berekeningen naast elkaar (midden)

| Plek | Gebruikt | Terugval % | Grondslag |
|---|---|---|---|
| Werklijst / factuur maken | reconciliatie | partner % (10) | inkoop ex btw, anders verkoop ex btw, kamer+extra's per tarief |
| Databasetrigger `sync_item_invoice_fields` | snapshot op onderdeel | 0 | één allocatieregel |
| `register-partner-invoice` | partnerportaal | geen (NaN als leeg) | overschrijft het snapshot-% met het partner-% |
| `get-admin-commissions` (tabs Gefactureerd/Betaald, en de verborgen "Verwacht") | snapshot | 15 | verkoop / 1,21, hard |
| `select-accommodation-quote` | logies bij selectie | `\|\| 10` (0 % wordt 10 %) | totaal incl. extra's |
| Partnerportaal `PartnerFinance` | snapshot | 10 | eigen berekening |

Daardoor ziet de partner in zijn portaal een ander bedrag dan wat straks op de
factuur staat, en tonen "Gefactureerd" en "Betaald" op de commissiepagina de
snapshotbedragen in plaats van wat gefactureerd is.

Verder: de per-component-logica voor logies (`calculateLodgingCommission`,
`commission_components`, `purchase_invoice_applied`) wordt door de loader nooit
gevuld. Kamer en extra's gaan dus op één percentage; alleen de vlag
`extras_rate_mismatch` wordt gezet. Voor Badhotel Bruin (10 % kamer, 0 % extra's)
gaat dat straks mis.

### 3.3 Dode en kapotte flows (laag, maar verwarrend)

- **Pro forma**: `process-completed-items`, `confirm-partner-commission`,
  `confirm-pending-commissions`, `PendingCommissionsCard` en de "Verwacht"-tak van
  `get-admin-commissions` schrijven of filteren op `pending_confirmation` en
  `confirmed`. De CHECK-constraint op `commission_status` staat alleen
  `not_applicable | pending | invoiced | paid` toe. Geen cron roept ze aan. Twee
  ervan hebben geen authenticatie en versturen mail.
- `AdminCommissions.tsx`: de "Markeer als gefactureerd"-dialoog is onbereikbaar,
  de "expected"-weergave idem, "Markeer als betaald" op het tabblad Gefactureerd
  stuurt geen `itemType` mee (logies wordt stil overgeslagen) en laat de
  commissiefactuur op `sent` staan. De pagina laadt `get-admin-commissions` ook
  als de werklijst open staat; faalt die, dan laadt de werklijst niet.
- `IGNORED_INVOICE_STATUSES = rejected | archived` bestaan niet in de
  statuscontrole van inkoopfacturen.
- `update-commission-status` logt nooit een Mailjet-id (ReferenceError wordt
  ingeslikt) en heeft een placeholder-IBAN in de partnermail.
- `dismiss-partner-invoice-item` schrijft naar niet-bestaande kolommen; en de
  loader leest `partner_dismissed_at` niet, dus een door de partner afgewezen
  onderdeel blijft "inkoopfactuur ontbreekt".
- Partners mogen `commission_invoiced_at` op hun eigen inkoopfacturen zetten
  (niet in de guard, niet in de REVOKE); daarmee verdwijnt een regel uit de
  werklijst.
- `supplier_commission_excl_vat` betekent bij Doeksen "door de leverancier
  verrekende commissie" en bij alle andere facturen "ons snapshot van de
  commissie"; de kolom Commissie op Inkoopfacturen leest hem als eerste bron.

### 3.4 Presentatie en bediening

**Werklijst** (`CommissionWorklist`): de regel is goed (partner, project, onderdeel,
verkoop, inkoop, grondslagkeuze, commissie), maar:

- Vijf tabs met elk drie tegels; de tegel "regels in deze tab" herhaalt de tab.
- "Gefactureerd" en "Betaald" tonen een live herberekening, niet het
  factuurbedrag, en er is geen link naar de factuur.
- Geen tijdscontext: wat is al lang geleden uitgevoerd en nog niet gefactureerd?
  `ageDays` wordt berekend maar niet getoond.
- De selectieteller wisselt tussen "zichtbaar" en "alle geselecteerde" (:340 vs
  :367), en de groepsknop "Inkoop" kan een grondslag kiezen die niet bestaat.
- Rijen met 0 % of een commissievrije partner vallen in "Gearchiveerd" met een
  "Terugzetten"-knop die niets doet.
- Geen groepering per project, geen sortering, geen filter "alleen met inkoopfactuur".

**Factuur maken**: werkt, maar partnergegevens (adres, KvK, e-mail) ontbreken
vaak en de pagina waarschuwt daar niet voor; regels zijn vrij te wijzigen zonder
spoor; "Download PDF" slaat al op als concept, wat niet duidelijk is; de
factuurnummerregel "wordt gegenereerd bij opslaan" naast een bewerkbaar veld.

**Commissiefacturen** (`AdminCommissionInvoices`): tabel met iconen zonder tekst;
geen detail (welke regels, welke onderdelen, welke mails); geen "verstuur",
"verwijder", "credit"; statusfilter als dropdown i.p.v. tegels; "Totaal incl.
btw" telt concepten mee; geen vervaldatum of "te laat"; zoeken alleen op
factuurnummer; losse palettekleuren tegen het ontwerpsysteem in.

## 4. Plan

### Besluiten die ik aan Erwin vraag

1. **Grondslag.** Inkoopfactuur ex btw als die er is, anders verkoopwaarde ex
   btw. (Voorstel: ja, zo staat het nu ook; ik leg het alleen vast.)
2. **Een inkoopfactuur maakt een onderdeel verkocht.** Een onderdeel met een
   gekoppelde inkoopfactuur telt mee, ook als het nooit op "bevestigd" is gezet
   (behalve bij een geannuleerd project). Dat haalt de € 945 uit 2.2A boven water.
3. **Logies is factureerbaar na de vertrekdatum**, niet pas na handmatige
   afronding. Zelfde regel voor activiteiten als het project niet is afgerond
   maar de datum voorbij is én er een inkoopfactuur ligt.
4. **Conceptnummers.** Een concept krijgt géén BVC-nummer; het nummer wordt
   uitgegeven bij "definitief maken/versturen". Concepten mogen verwijderd
   worden, definitieve facturen nooit (wel crediteren). Zo blijft de reeks
   aaneengesloten, wat de belastingdienst verlangt.
5. **De pro-forma-flow gaat weg** (partner bevestigt vooraf). Hij werkt niet,
   kan niet werken, en de werklijst vervangt hem.
6. **De tabbladen Gefactureerd/Betaald op Commissies gaan weg**; die informatie
   staat op Commissiefacturen, per factuur, met de regels erin.
7. **Doeksen blijft commissievrij** (verrekent zelf op de verzamelfactuur);
   Bazuin 0 %. Beide tonen we als "verrekend door partner" / "0 %" en niet als
   "gearchiveerd".

### Fase 0: data opschonen (½ dag, vóór alles)

Eén migratie plus twee handmatige controles door Erwin.

- Verwijder de drie conceptfacturen en hun regels; zet `commission_invoiced_at`
  en `commission_invoice_id` op inkoopfacturen 202600127 en 202600246 terug op
  leeg. (Er is niets verstuurd, dus de reeks begint schoon.)
- Verwijder de dubbele Zuiver-registratie T-261008 (de admin-versie aan het
  project; de partnerversie hangt aan het onderdeel en is de juiste).
- Erwin controleert: Fortuna 202600127 (welke van de twee facturen draagt het
  verkeerde nummer), de btw-tarieven op de drie hotelofferte(s) in 2.3 #6, en het
  bevestigde onderdeel in het geannuleerde project.
- Herbereken `commission_amount` op alle onderdelen met allocaties (som van de
  allocaties × percentage) zodat partnerportaal en dashboards kloppen tot fase 1
  de trigger repareert.

### Fase 1: de lekken dichten (1½ dag)

Allemaal in de gedeelde loader/reconciliatie, dus met unit tests en één bron.

1. **Loader** (`commissionReconciliationData.ts`): onderdelen met een gekoppelde
   inkoopfactuur (header, allocatie of nummer) altijd meenemen, ongeacht status,
   tenzij het onderdeel of project geannuleerd is. `partner_dismissed_at`
   meelezen en als "partner meldt: niet geleverd" tonen.
2. **Factureerbaarheid** (`readinessForItem`): ook "datum voorbij én
   inkoopfactuur aanwezig" en voor logies "vertrekdatum voorbij". Nieuwe
   readiness `unknown_base` voor regels zonder verkoopprijs en zonder factuur:
   wel in de lijst, niet selecteerbaar, met de melding "prijs of inkoopfactuur
   ontbreekt".
3. **Logies per component**: de loader vult `commission_components` via
   `calculateLodgingCommission` (de functie bestaat en is getest) en zet
   `purchase_invoice_applied`. Daarmee gaan kamer en extra's op hun eigen
   percentage en wordt de 1-op-1 toegepaste eindfactuur de grondslag.
4. **Trigger `sync_item_invoice_fields`**: som van alle allocaties in plaats van
   één regel; `invoiced`/`paid` nooit terugzetten naar `not_applicable` (wel een
   Werkbank-taak "gefactureerd onderdeel verloor zijn inkoopfactuur").
5. **`register-partner-invoice`**: het snapshot-percentage op het onderdeel
   respecteren (COALESCE), zoals de trigger; geen NaN bij een leeg partner-%.
   `select-accommodation-quote`: `??` in plaats van `||`.
6. **Beveiliging**: `commission_invoiced_at`/`commission_invoice_id` in de
   partner-guard en de REVOKE-lijst; duplicaatcontrole op
   `(partner_id, invoice_number_normalized)` ook in de admin-registratie
   (waarschuwing, geen blokkade: partners hergebruiken soms nummers).
7. Een **dagelijkse zelftest** in `critical-selftest`: de som van de werklijst
   tegen een ruwe SQL-telling (alle niet-exempte inkoopfacturen × partner-%)
   mag niet meer dan de tolerantie afwijken; anders een alertmail. Dit is de
   borging dat er nooit meer iets stil wegvalt.

### Fase 2: de factuur een levenscyclus geven (2 dagen)

Eén edge function `commission-invoice` met acties, zodat alle statuswissels
server-side en in één transactie gebeuren (nu staan ze verspreid over twee
functies en twee pagina's met directe tabelupdates).

Statussen van de factuur: `draft → final → sent → forwarded → paid`, plus
`cancelled` (alleen voor `draft`) en `credited` (voor definitieve facturen, met
een creditnota als nieuwe factuur). Op onderdeel, offerte en losse inkoopfactuur
één kolom `commission_invoice_id` (met foreign key) in plaats van
`commission_status` als enige waarheid; `commission_status` wordt afgeleid.

| Actie | Wat er gebeurt |
|---|---|
| Concept opslaan | Factuurkop zonder nummer ("Concept") + regels; de bronregels krijgen `commission_invoice_id` en verdwijnen uit "Te factureren" naar een nieuwe tab "In concept". Geen `commission_invoiced_at`. |
| Concept bewerken | Regels toevoegen/verwijderen/wijzigen vanuit het overzicht; vrije regel (voor de bruiloftsdoorverwijzingen, fase 3 van dat plan). |
| Concept verwijderen | Kop en regels weg, bronregels weer vrij. |
| Definitief maken | Nummer uit een echte sequence per maand (`BVC-JJMM-NNNN`, geen `MAX+1`), PDF genereren en opslaan, regels bevriezen, `commission_status = invoiced` op de bronnen, grondslag/percentage/bedrag terugschrijven naar het onderdeel. |
| Versturen | Alleen vanaf `final`; mail met PDF; status `sent`; herverzenden mag, zonder statuswissel. Database vóór de mail, mail-fout → terug. |
| Doorsturen naar Snelstart | Alleen vanaf `sent` (of `final` met "al verwerkt in Snelstart", zoals bij de verkoopfacturen); PDF altijd mee. |
| Betaald | Alleen vanaf `sent`/`forwarded`; betaaldatum invoerbaar; bronnen `paid`. Later te koppelen aan de bankmatching die voor inkoopfacturen al bestaat. |
| Crediteren | Nieuwe factuur met negatieve regels, bronnen weer vrij. |

Verder in deze fase: partnergegevens-controle vóór definitief maken (adres,
KvK, e-mail), met een link naar de partnerpagina; de "Commissiefactuur maken"-
pagina wordt dezelfde component als "Concept bewerken".

### Fase 3: presentatie (2 dagen)

Op het ontwerpsysteem (`Pill`, `EmptyState`, tegels als filters, compacte rijen
met uitklapper, zoals het facturatie-overzicht van 2 oktober).

**Commissies (werklijst)**

- Tegels = tabs: Te factureren (aantal, bedrag), In concept, Verwacht,
  Afwijkingen, Zonder grondslag, Commissievrij. "Gefactureerd/Betaald" weg.
- Per partner een kop met totaal en één knop "Factuur maken (n regels)"; rijen
  per project gegroepeerd met datum en "x dagen geleden".
- Statuspills per regel: "Inkoopfactuur ontbreekt", "Afwijking +€ 478",
  "Partner: niet geleverd", "Verrekend door partner".
- Grondslagkeuze alleen tonen als beide bedragen bestaan; standaard inkoop.
- Zoeken, sorteren (ouderdom, bedrag, partner), filter "alleen met inkoopfactuur".

**Commissiefacturen**

- Tegels = filters: Concept, Definitief, Verstuurd, Doorgestuurd, Betaald,
  Te laat (vervaldatum voorbij). Totaal alleen over definitieve facturen.
- Rij: nummer of "Concept", partner, datum, vervaldatum, bedrag, status; knoppen
  met tekst: Bewerken, Definitief maken, Versturen, Doorsturen, Betaald, PDF.
- Detailpaneel: regels, bronnen (klikbaar naar project/inkoopfactuur), mails
  (verstuurd aan, geopend), Snelstart-status.
- Zoeken op nummer, partner, klant, projectreferentie.

**Partnerportaal**: het blok "commissie open" leest voortaan de factuurregels
(wat gefactureerd is) en de werklijst-berekening (wat verwacht wordt) in plaats
van het snapshot, zodat partner en bureau hetzelfde zien. Partners krijgen op
Facturatie een lijst van hun commissiefacturen met PDF.

### Fase 4: dood hout (½ dag)

- Weg: `process-completed-items`, `confirm-partner-commission`,
  `confirm-pending-commissions`, `PendingCommissionsCard`, de "expected"-tak van
  `get-admin-commissions` en daarna de hele functie; de invoice-dialoog en de
  "expected"-weergave in `AdminCommissions.tsx`; `IGNORED_INVOICE_STATUSES`.
- `AdminFinancialDashboard` en `PartnerYtdModule` lezen de nieuwe bron.
- `update-commission-status` vervalt (alles via `commission-invoice`).
- `supplier_commission_excl_vat` alleen nog voor "door leverancier verrekend";
  de snapshot-kopie uit `usePurchaseInvoices` weg.
- Documentatie in `docs/deployen.md` → Valkuilen, en in dit plan de statussen
  als woordenlijst.

### Volgorde en wat Erwin daarna doet

Fase 0 en 1 samen in één PR, dan kan Erwin de 2026-facturen al maken met de
huidige schermen (de concepten zijn dan betrouwbaar; versturen pas na fase 2 als
hij op de nummerreeks wil wachten, anders meteen). Fase 2 in een eigen PR, fase
3 in twee PR's (werklijst, facturen), fase 4 als laatste.

Na fase 1 verwacht ik in "Te factureren" ongeveer € 8.700 ex btw voor 2026,
verdeeld over 16 partners; de grootste is Seeduyn (€ 2.423) die eerst een
inkoopfactuur moet sturen (de Werkbank-taak daarvoor bestaat al via
`flag-missing-partner-invoices`).

## 5. Bewust niet in dit plan

- Automatisch incasseren of herinneren bij te late betaling; eerst zien hoe
  partners op de eerste facturen reageren.
- Commissie over bureau-eigen onderdelen (`block_type = bureau`) of over
  "zelf geregeld"; die zijn terecht uitgesloten.
- De nacalculatie (partner factureert meer dan verkocht) als eigen scherm; de
  tab Afwijkingen dekt het signaal, de marge-analyse hoort bij het financieel
  dashboard.
- Bulk versturen van meerdere facturen; bij zo'n twintig facturen per seizoen
  volstaat per factuur.
