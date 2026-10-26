# Plan: de klantreis omdraaien en eerder tekenen

Status: besluiten genomen door Erwin op 26 oktober 2026 (alle voorstellen
overgenomen, zie "Besluiten"). Fase 3 (tekenen zonder te wachten), fase 1
(de voordeur), fase 2 (één formulier en de voorbeelden) en fase 4 (akkoord
en ondertekenen in één stap) zijn op 26 oktober gebouwd, net als fase 5 (meten). Daarmee is het plan uitgevoerd; wat
openstaat, staat onder "Na uitvoering". Eén afwijking
van het plan in fase 2: de pagina's voor losse catering- en
logiesaanvragen blijven bestaan, zie de toelichting bij fase 2. Het plan zelf is van 25 oktober, op basis van de
productiecijfers van dezelfde dag; Erwin was die dag al akkoord met de
richting (één voordeur, wizard naar de tweede laag, handtekening bij
akkoord).

Aanleiding (Erwin, 25 oktober): de homepage biedt te veel keuzes. Het meest
laagdrempelige pad moet winnen, en dat is maatwerk met voorbeeldprogramma's
als inspiratie. "Stel uw programma samen" is een leuke gimmick, maar te
ingewikkeld voor klanten. Liever meer aanvragen dan de hoop op minder werk:
een goed programma maken via de admin gaat snel. Tweede punt, dezelfde dag:
offertes en programma's worden vaak niet getekend terwijl we ze wel
uitvoeren. Dat moet beter of eerder dichtgespijkerd.

Schrijfregel uit de briefing van 22 september, hier ook toegepast: geen
gedachtestreepjes, gewone interpunctie. Aanspreekvorm op de site blijft "u".

## Samenvatting

- De wizard levert tweederde van de aanvragen en een tiende van de omzet.
  Van de 61 wizard-aanvragen in 2026 zijn er 46 geannuleerd en 5 gewonnen;
  van de 12 maatwerkaanvragen zakelijk zijn er 6 gewonnen. De wizard trekt
  kleine groepen (mediaan 10 personen, 41 procent privémail), het
  maatwerkformulier de zakelijke klant (mediaan 25, 69 procent met
  bedrijfsnaam).
- Het volume van de wizard is gestuurd, niet gekozen: hij is sinds februari
  de gemarkeerde hoofdroute in de hero, de zwevende knop, het slotblok en op
  zo'n 25 pagina's. Het label "meest gekozen" is daarmee een selffulfilling
  prophecy.
- Correctie (26 oktober, fase 5): de 152 chatgesprekken van 2026 zijn
  vooral partnerchats (118) en portaalchats van klanten (26). De websitechat
  had 1 gesprek en WhatsApp 8. De chat is dus geen drukke ingang; de
  koppeling naar een aanvraag is gebouwd, maar klein gehouden.
- Van de 21 gewonnen projecten in 2026 zijn er 6 nooit getekend, samen
  € 119.000 van de € 233.000 omzet, waaronder de twee grootste projecten van
  het jaar. Van de 15 handtekeningen kwamen er 5 pas na het evenement. De
  oorzaak zit in het portaal: de handtekening is de laatste van vier
  stappen en staat vergrendeld achter partnerbevestigingen en
  facturatiegegevens; de automatische herinneringen vuren daardoor
  vrijwel nooit (één keer in 2026).
- Voorstel: één voordeur (het formulier), voorbeeldprogramma's als
  inspiratie ervoor, de wizard als tweede laag, chat gekoppeld aan de
  aanvraag, en de handtekening op het moment van akkoord in plaats van aan
  het eind. Vijf fasen, circa 8 tot 10 bouwdagen, zeven besluiten.

## Cijfers uit productie (25 oktober 2026)

Aanvragen (`program_requests`, aangemaakt in 2026, zonder verwijderde):

| Herkomst (`origin`) | Aanvragen | Geannuleerd | Gewonnen | Getekend | Omzet gewonnen (incl. btw) | Mediaan personen |
|---|---|---|---|---|---|---|
| Zelfbediening (wizard, snel aanvragen) | 51 | 46 | 5 | 3 | € 13.218 | 10 |
| Programma op maat, zakelijk | 12 | 6 | 6 | 5 | € 77.750 | 25 |
| Offerte (9 van de 12 door Erwin aangemaakt na mail of telefoon) | 12 | 5 | 7 | 5 | € 136.735 | 10 |
| Sales-inbox | 5 | 3 | 2 | 1 | € 4.775 | 24 |
| Alleen catering | 4 | 1 | 1 | 1 | € 876 | 16 |
| Programma op maat, privé | 3 | 2 | 0 | 0 | | 45 |

"Gewonnen" is hier: status actief en uitgevoerd, gefactureerd of akkoord
ontvangen. "Getekend" is `terms_accepted_at` of `signature_id` gevuld.
Het offerteformulier op de site (`/offerte`) leverde zelf 3 aanvragen; de
andere 9 met deze herkomst zijn in de admin aangemaakt.

Ruis in de zelfbediening: 17 van de 46 annuleringen binnen een dag, 25 van
de 61 aanvragen met binnen 24 uur een tweede aanvraag van hetzelfde
e-mailadres, 18 annuleringen zonder reden, 5 aanvragen zonder enige tekst.
Na aftrek blijven er ongeveer 36 echte wizard-aanvragen over, met 5 gewonnen.
De annuleringsredenen bij maatwerk en offerte zijn inhoudelijk (budget,
andere partij, geen reactie na een voorstel); die bij de wizard zijn vooral
leeg of technisch ("fout in ons systeem, lege aanvraag", "test", "Datum
klopt niet").

Overig:

- Chat: 152 gesprekken in 2026 (`chat_conversations`), waarvan 78 in juni.
  Correctie op 26 oktober: 118 daarvan zijn partnerchats, 26 portaalchats
  van klanten over hun programma, 8 WhatsApp en 1 via de websitechat. Als
  ingang voor nieuwe aanvragen telt alleen die laatste groep.
- Instappagina (`attribution.entry_path`, vastgelegd sinds juni, 20
  aanvragen): 14 keer de homepage, 4 keer `/bouwstenen`, 2 keer
  `/wadlopen-vlieland`, 3 keer `/catering`. De twaalf landingspagina's komen
  niet voor.
- Direct boeken via MAP: nul boekingen sinds de start.
- Losse logiesaanvragen: 23 in 2026, 17 geannuleerd.
- Bewaarde concepten (exit-intent): 3, waarvan 2 hersteld.
- Groepsgrootte: 61 procent onder de 20 personen; de hero zegt "50-150
  personen per groep".

Ondertekening (gewonnen projecten 2026):

| | Aantal |
|---|---|
| Gewonnen | 21 |
| Getekend | 15, waarvan 13 via het portaal (IP en naam vastgelegd) |
| Niet getekend | 6: BV-2602-0003 (130 personen, € 79.401), BV-2604-0002 (166, € 27.634), BV-2608-0002 (8, € 5.827, aankomst 5 november), BV-2607-0002 (64, € 3.548), BV-2605-0001 (13, € 1.932), BV-2606-0020 (6, € 634) |
| Getekend na het evenement | 5 (tot 17 dagen erna) |
| Mediaan handtekening vóór de eerste programmadag | 4 dagen |
| Doorlooptijd offerte verstuurd tot handtekening | maatwerk gemiddeld 28 dagen, wizard en offerte 80 tot 100 dagen |
| Automatische mail "voorwaarden ondertekenen" verstuurd in 2026 | 1 (3 oktober) |

Bij vier van de zes ongetekende projecten ontbreken ook de
facturatiegegevens op het project; ze zijn wel volledig gefactureerd.

## De site en het portaal nu

De voorkant:

- De hero-knop "Start uw aanvraag" springt naar het keuzeblok (`#routes`);
  de oranje knop in het menu en de knop in de voettekst doen hetzelfde. De
  zwevende knop op mobiel (`StickyMobileCTA`) en het slotblok (`FinalCTA`)
  gaan naar de wizard. Wie "start" klikt, krijgt dus eerst een menu.
- Het keuzeblok (`RoutePicker`) biedt zes ingangen: de wizard met foto en
  label "meest gekozen", direct boeken, programma op maat,
  voorbeeldprogramma's, catering, logies.
- 41 bestanden linken naar `/programma-samenstellen`: het landingssjabloon
  (`LandingPage`), de routekaarten op Onze werkwijze (`RouteCards`), de
  interne linkregels (`internalLinks.ts`), menu, voettekst en de
  voorbeeldprogramma's (primaire knop "Gebruik dit programma" opent de wizard
  met het voorbeeld voorgeladen; "Programma op maat" staat als tweede).
- Vijf aanvraagformulieren naast elkaar: Programma op maat (type zakelijk of
  privé, aantal personen, datums, naam, bedrijf, e-mail, telefoon, wensen),
  Offerte (soort uitje uit tien, naam, bedrijf, e-mail, telefoon, aantal,
  omschrijving), Catering, Logies (vijf stappen) en Snel aanvragen (deelt
  de kaart van de wizard, beperkt tot één dag). Programma op maat en
  Offerte vragen vrijwel hetzelfde.
- De chat (`FloatingStack`) staat op elke pagina; een gesprek wordt pas een
  aanvraag als Erwin het in de admin overneemt via de sales-inbox.

Het portaal, in de volgorde die de actiekaart (`ActionRequiredCard`) de
klant opdringt:

1. Akkoord op het voorstel of per onderdeel (`accept-quote-proposal`,
   `approve-quote-item`). De bevestigingsmail heet "Uw akkoord is
   ontvangen" en noemt de voorwaarden niet.
2. Wachten tot alle partners bevestigd hebben.
3. Facturatiegegevens invullen. Het vinkje bij de voorwaarden in
   `AcceptTermsCard` staat uitgeschakeld zolang die ontbreken.
4. Ondertekenen: vinkje, naam als handtekening. Tekenen "onder voorbehoud"
   (zolang niet alles bevestigd is) bestaat in de code, maar de actiekaart
   toont "Programma gereed voor ondertekening" pas als alles bevestigd is én
   de facturatiegegevens compleet zijn.

De automatische reeks (`customerTermsReminder.ts` in `check-pending-items`:
eerste verzoek, dan 14, 7 en 3 dagen vooraf, plus een beltaak op dag 3) is
netjes gebouwd, maar vuurt alleen als álle onderdelen door partners bevestigd
zijn (`allItemsConfirmedForTerms`). Bij een programma met 15 tot 20
onderdelen is er altijd iets open; vandaar één mail in heel 2026. In de
admin is er geen knop om los een ondertekenverzoek te sturen. De twee
grootste projecten van het jaar hebben nooit de status "offerte verstuurd"
gehad: ze zijn per mail en telefoon geregeld, dus het portaal heeft de klant
nooit iets gevraagd.

## Beoordeling

Erwins hypothese klopt, en de cijfers maken hem sterker dan "naar de
achtergrond". Drie dingen wegen zwaarder dan het aantal kaarten:

1. **De tussenpagina.** Drie van de vier "start"-knoppen leiden naar een
   menu. Dat is de grootste lek en in een uur te dichten.
2. **De wizard bespaart het bureau niets.** Erwins eigen aanvulling van 22
   september: elk programma vraagt toch zijn controle bij partners en
   klanten, of de klant het nu zelf samenstelt of niet. De enige resterende
   waarde van de wizard is prijstransparantie voor de bezoeker. Dat is een
   reden om hem te houden als gereedschap, niet als route.
3. **De handtekening staat op de verkeerde plek.** Het moment van commitment
   is het akkoord op het voorstel. Alles wat daarna komt is
   wijzigingsbeheer, en daar is het portaal al goed in (herbevestiging per
   onderdeel, tegenvoorstellen, datumwijzigingen).

Twee kanttekeningen. De aantallen bij maatwerk zijn klein (12 en 12), dus de
percentages kunnen een paar punten schelen; maar elke maatstaf wijst dezelfde
kant op. En de hoge annulering is grotendeels niet de schuld van de route
(tests, dubbelklikken, seizoen): verwacht meer en schonere aanvragen, geen
halvering van het annuleringspercentage.

Juridische kanttekening, zonder jurist: voorwaarden die pas na uitvoering
worden geaccepteerd beschermen in de praktijk niet. Het gaat om
annuleringsvoorwaarden, aansprakelijkheid en betalingstermijnen op precies de
projecten waar het bedrag het hoogst is. Erwin legt de voorwaardentekst en
het moment van ter hand stellen desgewenst voor aan zijn jurist; dit plan
regelt alleen dat het moment vóór de uitvoering ligt.

## Principes

1. **Eén voordeur.** Elke "Start uw aanvraag" opent het formulier, nergens
   een keuzemenu ertussen.
2. **Inspiratie vóór het formulier, niet ernaast.** Voorbeeldprogramma's
   zijn content die het formulier voorinvult, geen gelijkwaardige route.
3. **De wizard is gereedschap, geen route.** Hij blijft bereikbaar voor wie
   zelf wil puzzelen en prijzen wil zien, één laag dieper, zonder label.
4. **Handtekening bij akkoord.** Akkoord op het voorstel en acceptatie van de
   voorwaarden zijn één handeling, onder voorbehoud van bevestiging door
   partners.
5. **Meten op gewonnen, niet op getekend.** De pipeline rekent "akkoord" als
   winst; "AV getekend" blijft zichtbaar als controle erop.
6. **Niets weggooien wat werkt.** De wizard-engine, de kaart, de templates,
   het portaal en de herinneringsreeks blijven; ze krijgen een andere plek of
   een andere trigger.

## Voorstel

### De homepage

- Hero: één knop "Start uw aanvraag" naar het formulier. Tweede regel als
  tekstlink: "Liever eerst inspiratie? Bekijk voorbeeldprogramma's." De vier
  cijfers onder de hero: "50-150 personen per groep" vervalt (zie het
  geparkeerde plan voor grote groepen); daarvoor in de plaats "van 8 tot
  150 personen" of het cijfer vervalt helemaal.
- Het keuzeblok `RoutePicker` verdwijnt als sectie. Ervoor in de plaats één
  korte sectie "Zo werkt het" in drie stappen (u vertelt wat u zoekt, wij
  sturen binnen vijf werkdagen een voorstel, u geeft akkoord in uw eigen
  portaal) met de knop naar het formulier. Het `SectionHeader`-nummer
  schuift op; de overige hoofdstukken blijven.
- De voorbeeldprogramma's (`ProgramTemplatesPreview`) blijven als hoofdstuk,
  met per kaart "Dit programma aanvragen" naar het voorgevulde formulier.
- Direct boeken en de live agenda (`UpcomingActivitiesFeed`) gaan van de
  homepage af naar `/activiteiten-vlieland` en `/activiteiten-boeken`. Bij
  nul boekingen is dit de verkeerde etalage voor een zakelijke bezoeker.
- Zwevende knop op mobiel, slotblok, menu en voettekst: allemaal naar het
  formulier.
- De chatknop blijft en krijgt op de homepage een korte regel boven het
  formulierblok: "Liever even overleggen? Stel uw vraag via de chat."

### Het formulier: één aanvraag

`/programma-op-maat` wordt de ene aanvraag en krijgt de naam "Uw aanvraag"
(pad blijft, met `/aanvraag` als alias). Velden, in deze volgorde:

1. Wat voor groep: zakelijk of privé (bestaat), en optioneel de soort
   (bedrijfsuitje, teamuitje, heisessie, incentive, familieweekend,
   groepsweekend, jubileum, anders; de lijst van `/offerte`).
2. Aantal personen (bestaat).
3. Wanneer: datums of periode, optioneel. "Weet ik nog niet" is een geldige
   keuze.
4. Wat heeft u nodig (vinkjes, meerdere): activiteiten, eten en drinken,
   overnachting, boot en fietsen. Deze vinkjes vervangen de losse
   formulieren voor catering en logies.
5. Naam, bedrijf (optioneel), e-mail, telefoon (bestaan).
6. Uw wensen (bestaat), met een voorbeeldprogramma als voorgevulde tekst
   wanneer de bezoeker vanuit een voorbeeld komt.

Eronder de belofte uit `promises.ts` ("binnen 5 werkdagen een voorstel") en
"vrijblijvend". Geen woord "offerte" in de knop; de knop heet "Aanvraag
versturen" (bestaat in `WizardFooter`).

Herkomst blijft `maatwerk_zakelijk` of `maatwerk_prive`. Nieuw in
`attribution`: `template_id` als het formulier vanuit een voorbeeld is
geopend, en `needs` (de vinkjes). Een aanvraag met alleen "eten en drinken"
of alleen "overnachting" krijgt in de admin dezelfde behandeling als nu
`catering_only` en een losse logiesaanvraag, maar komt binnen als één
programma-aanvraag; Erwin maakt er in de admin van wat het moet worden.

De oude paden blijven bestaan voor SEO en voor bestaande links:
`/offerte`, `/catering-aanvragen` en `/logies-aanvragen` sturen door naar het
formulier met het juiste vinkje voorgeselecteerd. De pagina's `/catering` en
`/logies-vlieland` (inhoud) blijven; alleen hun aanvraagknop gaat naar het
ene formulier. `/snel-aanvragen` blijft bestaan als onderdeel van de wizard
(tweede laag).

### Voorbeeldprogramma's

- Overzicht en detail blijven. Op de detailpagina wordt "Dit programma
  aanvragen" de primaire knop, naar het formulier met `template=<slug>`:
  aantal dagen, doelgroep en de onderdelen komen als tekst in "Uw wensen",
  de vinkjes staan voorgeselecteerd op wat het voorbeeld bevat.
- "Zelf aanpassen in de programma-bouwer" blijft als tekstlink eronder (de
  huidige `?template=` naar de wizard).
- In de wizard zelf blijft de stap "Voorbeeld" ongewijzigd.

### De wizard als tweede laag

- Blijft volledig werken op `/programma-samenstellen`, inclusief concepten,
  exit-intent en delen.
- Bereikbaar via: een tekstlink onder het formulier ("Liever zelf
  samenstellen en direct prijzen zien?"), het menu onder "Wat we
  organiseren", de tekstlink op voorbeeldpagina's en de bouwstenenpagina
  ("Aan programma toevoegen" blijft daar de knop, want wie op die pagina
  komt zoekt juist de bouwstenen).
- Weg: het label "meest gekozen", de foto-kaart op de homepage, de wizard als
  doel van de zwevende knop, het slotblok, het landingssjabloon en de
  routekaarten. `internalLinks.ts` krijgt het formulier als standaard
  actie.
- Het zelfbedieningsargument uit `docs/concurrentie-positionering.md`
  ("geen offerte-aanvraag nodig om te zien wat mogelijk is") verhuist naar
  de bouwstenenpagina en de wizard zelf.

### Chat

- Een chatgesprek krijgt in de admin een knop "Aanvraag aanmaken" die een
  `program_requests`-rij maakt met herkomst `sales_inbox` en de
  gespreksgegevens erin (bestaat deels via `create-request-from-sales-inbox`;
  na te gaan of de chat daar al op aansluit).
- De chat-bot stelt na het eerste bericht de drie kernvragen (groepsgrootte,
  periode, wat heeft u nodig) als de bezoeker die nog niet noemde, zodat een
  gesprek direct bruikbaar is als aanvraag. Dit is een tekstwijziging in de
  begroeting, geen nieuwe techniek.

### Landingspagina's en overige pagina's

- Het landingssjabloon (`LandingPage`) en de routekaarten (`RouteCards`)
  krijgen het formulier als primaire knop en de wizard als tekstlink.
- Het keuzeblok onderaan zo'n 25 pagina's wordt één knop naar het formulier
  plus de chatregel.
- De teksten met "van 8 tot 200 personen" en varianten blijven zoals ze zijn;
  dat is het geparkeerde plan voor grote groepen.

### Ondertekenen bij akkoord

**In het portaal.** `AcceptView` wordt de ene plek voor akkoord: het
voorstel, de voorwaarden (bureau, UVH, partnervoorwaarden zoals nu in
`AcceptTermsCard`), het vinkje, de naam als handtekening, en bedrijfsnaam
plus adres. KvK en btw-nummer worden optioneel en komen later terug bij de
facturatiegegevens. De knop heet "Akkoord en ondertekenen". Is nog niet elk
onderdeel bevestigd, dan is het akkoord "onder voorbehoud van bevestiging
door de aanbieders" (de bestaande `underReservation`), met de regel dat een
substantiële wijziging per onderdeel opnieuw om akkoord vraagt (bestaat:
`program_partner_reapproval`). `accept-quote-proposal` accepteert de
handtekening in dezelfde aanroep en schrijft `terms_accepted_at`,
`signature_*` en `accepted_terms_log` zoals `acceptTerms` nu doet. De
bevestigingsmail "Uw akkoord is ontvangen" noemt de geaccepteerde
voorwaarden met link.

De actiekaart stuurt vanaf de eerste offerte naar "Akkoord en
ondertekenen"; de stappen "wachten op partners" en "facturatiegegevens"
komen erna en blokkeren niets meer. Wie al akkoord gaf zonder handtekening
(de huidige zes en toekomstige gevallen via mail of telefoon) ziet als enige
actie "Ondertekenen", ongeacht partnerstatus.

**In de admin.** Een knop "Ondertekenverzoek sturen" op elk project,
ongeacht status, die de bestaande template `customer_terms_request` stuurt
met een directe link naar `AcceptView`. Daarmee kan Erwin een telefonisch
gesloten deal binnen een minuut laten tekenen. Op de werkbank een lijst
"Gewonnen, niet getekend" (akkoord, uitgevoerd of gefactureerd zonder
handtekening), gesorteerd op aankomstdatum.

**Herinneringen.** De voorwaarde `allItemsConfirmedForTerms` in
`check-pending-items` vervalt. Nieuwe trigger voor het eerste verzoek:
`quote_status` is `akkoord_ontvangen` of `definitief_bevestigd`, of
`offerte_verstuurd` sinds zeven dagen. De reeks 14, 7 en 3 dagen vooraf en
de beltaak op dag 3 blijven. Snooze en "hot" blijven gerespecteerd.

**Grens.** In fase 3 een waarschuwing bij "Naar partners sturen" en bij
"Factureren" zolang de handtekening ontbreekt. In fase 4 een blokkade bij
"Naar partners sturen" met overrule en reden (vastgelegd), alleen als Erwin
daarvoor kiest (besluit 3).

**Pipeline.** `getProjectPipelineStage` blijft, maar de werkbank en de
attributie tellen "akkoord ontvangen" als gewonnen en tonen "AV getekend"
als aparte kolom. De vergelijking per herkomst uit dit plan komt als vaste
weergave in de admin (zie Meten).

### Meten

- Per herkomst in de admin (Projecten of Attributie): aanvragen,
  geannuleerd, gewonnen, getekend, omzet, mediaan groepsgrootte. Dezelfde
  tabel als hierboven, elke maand te herhalen.
- `attribution.template_id` en `attribution.needs` op elke aanvraag.
- GA4: `form_start` en `form_submit` met de bron (homepage, voorbeeld,
  landingspagina, chat), naast het bestaande `quote_request_submitted`. De
  wizard-events (`wizard_step_view`) blijven voor de tweede laag.
- Chat: aantal gesprekken dat een aanvraag wordt (herkomst `sales_inbox`
  met gesprek-id in `attribution`).
- Ondertekening: aandeel gewonnen projecten met handtekening vóór de eerste
  programmadag, nu 10 van 21; doel 20 van 21.

## Fasen

**Fase 1: de voordeur (1 dag).** Alle "Start uw aanvraag"-knoppen (hero,
menu, voettekst, zwevende knop, slotblok) naar `/programma-op-maat`.
`RoutePicker` vervangen door de sectie "Zo werkt het". Label "meest gekozen"
weg. Direct boeken en de live agenda van de homepage af. Hero-cijfers
aangepast. Landingssjabloon, routekaarten en `internalLinks.ts` naar het
formulier. Visuele referenties opnieuw maken. Dit kan vóór fase 2, omdat
Programma op maat al een werkend formulier is.

Fase 1 is op 26 oktober gebouwd. Homepage: `RoutePicker` is weg, in zijn
plaats staat `HowItWorks` als hoofdstuk 01 (drie stappen: u vertelt wat u
zoekt, wij stellen het samen, u geeft akkoord in uw portaal) met de knop
naar het formulier, de voorbeeldprogramma's als tweede regel, "Stel uw
vraag via de chat" (opent de chatwidget via `openPreSalesChat`) en de
programma-bouwer als tekstlink. De live agenda staat niet meer op de
homepage maar op Activiteiten op Vlieland; de kaart "Losse activiteiten
direct boeken" is daarmee ook van de homepage af (de pagina en het menu-item
blijven). De hero zegt "van 8 tot 150 personen" in plaats van "50 tot
150", de knop gaat naar het formulier met "vrijblijvend, binnen 5 werkdagen
een voorstel" eronder en "Liever eerst inspiratie?" als tweede regel; het
cijfer onderin is "8-150". Alle "Start uw aanvraag"-knoppen (menu, mobiel
menu, voettekst, zwevende knop, slotblok) gaan naar `/programma-op-maat`;
het anker `#routes` bestaat niet meer. Het keuzeblok op de marketingpagina's
(`RouteChooser`) heeft het formulier als primaire kaart, de voorbeelden als
tweede en de programma-bouwer als derde; het landingssjabloon, de
routekaarten op Onze werkwijze, de hero's van Voor wie, Partners,
Veelgestelde vragen, Voorbeeldprogramma's, Contact en Activiteiten op
Vlieland, de linkregels (`internalLinks.ts`), de 404-pagina, de sitemap en
de linkpagina volgen. Het menu "Wat we organiseren" kreeg "Zelf
samenstellen" zodat de bouwer bereikbaar blijft. Het formulier zelf heet nu
"Vertel ons wat u zoekt" (eyebrow "Uw aanvraag", paginatitel "Start uw
aanvraag"); de velden zijn ongewijzigd tot fase 2, dus een datum is nog
verplicht. Het label "meest gekozen" is verdwenen met het keuzeblok.
Getest: typecheck, lint onder het plafond, strict op 26, design debt 0,
volledige Vitest-suite, build; de handmatige e2e-test voor de bouwer opent
die nu rechtstreeks. De visuele referenties worden via de workflow
"Visuele referenties vernieuwen" op de branch opnieuw gemaakt.

Aanvulling 26 oktober: de drie stappen van "Zo werkt het" hebben een echte
foto in plaats van een icoon in een cirkel (principe 3 van het
ontwerpsysteem): de wegwijzer op het strand bij "u vertelt wat u zoekt",
Erwin zelf bij "wij stellen het samen" en de juichende groep in de duinen bij
"u geeft akkoord". De foto's zijn 4:3-uitsneden van bestaande beelden als
webp van 35 tot 95 KB (`src/assets/stap-*.webp`); op mobiel staan ze in
16:9 zodat de drie kaarten onder elkaar niet te lang worden.

**Fase 2: één formulier en de voorbeelden (2 tot 3 dagen).** Programma op
maat uitgebreid met soort, de vinkjes en de voorinvulling vanuit een
voorbeeld. `/offerte`, `/catering-aanvragen` en `/logies-aanvragen` als
doorverwijzing met voorselectie; de bijbehorende pagina's en componenten
opruimen voor zover niets anders ze gebruikt. Voorbeeldpagina's: "Dit
programma aanvragen" primair, wizard als tekstlink. Bevestigingsmail
`program_request_customer` nalopen op de nieuwe velden. Admin: de vinkjes
zichtbaar op de aanvraag. Tests voor de voorinvulling en de doorverwijzingen.

Fase 2 is op 26 oktober gebouwd. Het formulier op `/programma-op-maat`
(alias `/aanvraag`) heeft nu vier blokken: wat voor groep (zakelijk of
privé, plus optioneel de soort uit tien keuzes; een soort zet het type
mee), wat heeft u nodig (vinkjes activiteiten, eten en drinken,
overnachting, boot en fietsen), wanneer en met hoeveel (datums, of "ik
weet de datum nog niet" met een periode als tekst; de aanvraag krijgt dan
een lege datumlijst in plaats van een verzonnen datum) en uw gegevens met
uw wensen. Voorinvulling via de URL: `?template=<slug>` zet het
voorbeeldprogramma per dag in de wensen en vinkt aan wat erin zit (uit de
categorieën van de onderdelen en de duur), `?nodig=eten,overnachting` zet
vinkjes (ook de oude namen catering en logies), `?soort=heisessie` de
soort. De logica staat in `src/lib/requestForm.ts` met Vitest-tests. Wat er
wordt vastgelegd: `program_description` als één regel ("Maatwerk zakelijk ·
Heisessie / MT-dag · activiteiten, eten en drinken · periode: voorjaar 2027
· voorbeeld: Eilanddag compleet"), dezelfde samenvatting als eerste alinea
van de notities (die ook in de bevestigingsmail staat), en in `attribution`
de velden `template_id`, `needs`, `event_type`, `date_unknown` en
`period_text`. De telefoonregel eist nu minstens tien tekens, net als de
bevestigingsmail al deed. Het offerteformulier `/offerte` is weg: route,
`_redirects` (301), sitemap, `llms.txt`, 404-kaart en linkregels verwijzen
naar het formulier. Op de voorbeeldpagina's is "Dit programma aanvragen"
de primaire knop (naar het voorgevulde formulier) en de programma-bouwer de
tweede; de pagina Logies, de homepage-cateringsectie, de voettekst, het
menu en de linkregels sturen catering- en logiesaanvragen naar het
formulier met het vinkje voorgeselecteerd.

Afwijking van het plan: `/catering-aanvragen` en `/logies-aanvragen` zijn
níet doorverwezen. De logiesaanvraag is de vervolgstap vanuit het
klantportaal en de programma-bouwer (de logiesbanner, het tabblad Logies,
de boekingsstatus) en draagt daarbij de programmagegevens mee; de
cateringaanvraag krijgt vanaf de cateringpagina een soort mee (BBQ,
borrel, maatwerk) met eigen velden. Die twee stromen blijven werken; alleen
de algemene ingangen gaan via het ene formulier. Erwin maakt van een
aanvraag met alleen het vinkje overnachting of eten in de admin wat het
moet worden. Niet gedaan: een aparte weergave van de vinkjes in de admin
(de regel in `program_description` staat bovenaan het project) en de
voorinvulling van het aantal personen vanuit een voorbeeld (de doelgroep
van een voorbeeld is tekst, geen getal).

**Fase 3: tekenen zonder te wachten (1 dag).** Knop "Ondertekenverzoek
sturen" in de admin (edge function, hergebruik van de template). Trigger van
de herinneringsreeks losgekoppeld van partnerbevestiging, met Deno-tests op
`pickTermsMail` en de nieuwe voorwaarde. Lijst "Gewonnen, niet getekend" op
de werkbank. Waarschuwing bij partners sturen en factureren.

Fase 3 is op 26 oktober gebouwd. De logica staat in
`_shared/customerTermsReminder.ts`: `termsStageFor` bepaalt of een project
in aanmerking komt (akkoord ontvangen, of een voorstel dat zeven dagen
zonder akkoord staat en niet verlopen is), `buildTermsMailCopy` levert één
tekst voor de cron en de admin-knop (na akkoord: "onderteken, onder
voorbehoud als er nog iets open staat"; zonder akkoord: "geef akkoord en
onderteken"; handmatig: neutrale intro), `buildTermsCallTodo` de beltaak
vanaf drie dagen vooraf. In `check-pending-items` is de voorwaarde "alle
onderdelen bevestigd" vervallen; snooze, "hot" en de uitsluiting van
projecten in facturatie blijven, dus de zes al gefactureerde projecten
krijgen niets (besluit 7). De link in de mail opent met `?view=akkoord`
direct het tabblad Akkoord in het portaal. Nieuw: edge function
`send-terms-request` (alleen admins; weigert geannuleerde, verwijderde en
al getekende projecten; werkt ook bij status concept voor telefonisch
gesloten projecten; logt als `customer_terms_request` met actor "admin →
klant (ondertekenverzoek)"), knop `SendTermsRequestButton` bij
Voltooiingsstatus in het projectdossier en in het overzicht van de
werkbank, snelle weergave "Gewonnen, niet getekend" op de werkbank
(akkoord of facturatie zonder handtekening, eerste programmadag voorop),
waarschuwing in de dialoog "Verstuur naar partners" en in "Markeer als
klaar voor facturatie" zolang de handtekening ontbreekt. Getest: 18
Deno-tests (fasebepaling, reeks, teksten, beltaak, toegangscontrole van de
functie), Vitest voor `isWonUnsigned`, typecheck, lint onder het plafond,
strict op 26, design debt 0, build. Bij de eerstvolgende nachtelijke run
krijgt BV-2608-0002 (RMD Trainingen, 8 personen, aankomst 5 november) het
eerste verzoek; BV-2604-0003 staat gesnoozed tot januari en wordt
overgeslagen. Niet gedaan: de blokkade bij "Naar partners sturen" (fase 4,
besluit 3).

**Fase 4: akkoord en ondertekenen in één stap (2 tot 3 dagen).** `AcceptView`
herbouwd op het ontwerpsysteem met voorwaarden, handtekening en bedrijf
plus adres; `accept-quote-proposal` uitgebreid; actiekaart in de nieuwe
volgorde; bevestigingsmail aangepast; optioneel de blokkade met overrule.
Deno-tests voor de nieuwe aanroep, Vitest voor de actiekaart.

Fase 4 is op 26 oktober gebouwd. In het portaal is het tabblad Akkoord
vanaf het verstuurde voorstel de ene plek: de kaart "Akkoord en
ondertekenen" (`AcceptTermsCard`, modus akkoord) met de voorwaarden, het
vinkje, de naam als handtekening en, als ze nog ontbreken, bedrijfsnaam en
adres (verplicht, besluit 4; contactpersoon en e-mail komen van de
aanvrager, KvK en btw blijven optioneel bij Facturatie). Partnerbevestigingen
blokkeren niets meer: staat er iets open, dan tekent de klant onder
voorbehoud met de bestaande erkenning. `customerPortalStatus` kreeg
`canSignNow` (vanaf het voorstel zolang het niet verlopen is, na akkoord
zodra niets meer op de klant wacht), `signingIncludesProposal` en
`proposalExpired`; de voortgangsbalk, de actiekaart (vanaf het voorstel
"Uw voorstel staat klaar: geef akkoord en onderteken", na akkoord
"Onderteken nog de voorwaarden" vóór het wachten op aanbieders, geen aparte
facturatiestap meer) en de splash volgen. De voorstelkaart op het tabblad
Programma heeft geen eigen akkoordknop meer en verwijst naar Akkoord.

De drie serverstappen zijn niet samengevoegd maar in één klik achter elkaar
gezet (`handleAcceptTerms` in `CustomerProgram`): factuurgegevens opslaan,
handtekening (`update-customer-program`), en in de voorstelfase daarna het
akkoord (`accept-quote-proposal`). Zo blijven de bestaande controles,
geschiedenis en mails gelden; de akkoordmail zegt nu dat de voorwaarden al
getekend zijn en dat de boeking onder voorbehoud van de bevestigingen staat.
Eén noodzakelijke correctie: een handtekening zette het project altijd
meteen op "klaar voor facturatie", wat bij tekenen op het moment van akkoord
het portaal op "uitgevoerd" zou zetten en de dagelijkse controles zou
uitschakelen. Dat gebeurt nu alleen nog als de eerste programmadag voorbij
is (`_shared/signingCompletion.ts`, met Deno-tests); anders doet
`auto-close-past-execution` het de dag na afloop, zoals bij elk project. De
facturatietaak wordt wel aangemaakt, gesnoozed tot na het evenement.

Admin (besluit 3): "Verstuur naar partners" eist zonder handtekening een
reden van minstens vijf tekens; per onderdeel versturen vraagt dezelfde
reden. `send-items-to-partners` legt de verzending dan vast als
`admin_sent_to_partners_without_terms` met de reden in de geschiedenis.
Interne aanroepen (na een klantakkoord per onderdeel) blijven ongemoeid.
Getest: 25 Vitest-tests voor status, stappen en actiekaart (nieuw of
aangepast), volledige suite groen, 368 Deno-tests, typecheck, lint onder
het plafond, strict op 26, design debt 0, build. Niet gedaan: de
pipeline-telling op "akkoord" (fase 5).

**Fase 5: meten (1 dag).** Tabel per herkomst in de admin, `template_id` en
`needs` in `attribution`, GA4-events, chatkoppeling naar `sales_inbox`,
pipeline-telling op "akkoord".

Fase 5 is op 26 oktober gebouwd. Attributie heeft een nieuw eerste tabblad
"Per ingang": per herkomst aanvragen, geannuleerd, gewonnen (actief en
uitgevoerd, gefactureerd of akkoord ontvangen), getekend, vooraf getekend,
omzet en mediaan groepsgrootte, met een totaalregel en de periode "Dit
kalenderjaar"; daaronder de ondertekening van gewonnen projecten (vooraf,
achteraf, nog niet; nulmeting 10 van 21), via welke weg het formulier
geopend werd en hoeveel websitechats en WhatsApp-gesprekken een aanvraag
werden. De telling staat in `src/lib/requestMetrics.ts` met Vitest-tests en
is dezelfde als de query in de bijlage. Het formulier stuurt `form_start`
(eerste invoer) en `form_submit` naar GA4 met de weg waarlangs het geopend
is (homepage, voorbeeldprogramma, landingspagina, vinkje, soort, direct) en
legt die vast als `attribution.form_source`; `template_id` en `needs`
zaten er sinds fase 2 al in. Chat (besluit 6): de websitechat vraagt in de
begroeting om groepsgrootte, periode en wat u nodig heeft; in Berichten
heeft een websitechat of WhatsApp-gesprek zonder project de knop "Aanvraag
aanmaken", die het nieuwe-programmascherm opent met naam, e-mail en
telefoon voorgevuld en het gesprek na het aanmaken aan het project koppelt
(`chat_conversations.request_id`, `attribution.chat_conversation_id`). De
pipeline-telling op "akkoord" is de kolom Gewonnen in dezelfde tabel; de
werkbank heeft sinds fase 3 de lijst "Gewonnen, niet getekend". Niet
gedaan: GA4 zelf; `form_start` en `form_submit` moeten daar net als
`wizard_step_view` als gebeurtenis geregistreerd worden (zie Open in de
roadmap).

## Na uitvoering

- In GA4 de gebeurtenissen `form_start`, `form_submit`, `wizard_step_view`
  en `program_request_submitted` registreren (Erwin).
- Na een seizoen de tabel "Per ingang" naast de nulmeting leggen: minder
  ruis in de aanvragen, een hoger aandeel gewonnen, en vrijwel alles vooraf
  getekend. Dan ook het besluit over de wizard (tweede laag of dicht) en het
  geparkeerde plan voor grote groepen.
- `/catering-aanvragen` en `/logies-aanvragen` blijven bestaan voor het
  portaal en de bouwer; als de losse aanvragen daar opdrogen, kunnen de
  pagina's weg.
- Herzien op 26 oktober, dezelfde dag: de bouwstenenpagina toont alleen
  nog een prijs bij direct boekbare bouwstenen; de rest "Prijs in ons
  voorstel" met de meerwaarde van het bureau erbij. Het zelfbedieningsargument
  ("zelf samenstellen en direct prijzen zien") hoort daarmee alleen bij de
  bouwer, niet meer bij de catalogus. De partners blijven genoemd. Zie de
  roadmap onder Gedaan.

Samen 7 tot 9 bouwdagen. Fase 1 en 3 zijn klein en onafhankelijk; die
zou ik als eerste doen, in deze volgorde: 3 (het geld), dan 1 (de
voordeur), dan 2, 4, 5.

## Besluiten (Erwin, 26 oktober 2026)

Alle voorstellen overgenomen; uitvoering begint met fase 3.

1. **Wizard:** tweede laag; in het voorjaar van 2027 opnieuw bekijken samen
   met het plan voor grote groepen, met de cijfers van een seizoen.
2. **Offerteformulier `/offerte`:** opheffen als doorverwijzing; de tien
   soorten uitje gaan in het ene formulier.
3. **Grens zonder handtekening:** waarschuwen in fase 3, blokkeren bij
   "Naar partners sturen" met overrule in fase 4.
4. **Verplicht bij akkoord:** bedrijfsnaam en adres verplicht, KvK en btw
   optioneel.
5. **Direct boeken en de live agenda** van de homepage af naar de
   activiteitenpagina's.
6. **Chat:** de koppeling naar een aanvraag en de drie kernvragen in de
   begroeting gaan nu mee, in fase 5.
7. **De zes ongetekende projecten:** laten rusten. Geen verzoek achteraf aan
   de al gefactureerde projecten; het lopende project BV-2608-0002 krijgt
   het eerste verzoek automatisch via de nieuwe trigger.

## Wat dit plan bewust niet doet

- Het plan voor grote groepen uitvoeren (geparkeerd tot voorjaar 2027); de
  hero-cijfers worden alleen niet meer tegengesproken door de aanvragen.
- De wizard herbouwen of verwijderen.
- De landingspagina's herschrijven.
- De voorwaardentekst zelf beoordelen; dat is aan Erwin en zijn jurist.
- MAP uitbreiden of direct boeken promoten.
- De annulering van wizard-aanvragen verder uitzoeken; met de wizard op de
  tweede laag lost het grootste deel van de ruis zichzelf op.

## Bijlage: de nulmeting herhalen

Beide queries zijn alleen-lezen en draaien in de SQL-editor van Supabase.

Aanvragen per herkomst (2026):

```sql
select origin,
  count(*) aanvragen,
  count(*) filter (where status = 'cancelled' or cancelled_at is not null) geannuleerd,
  count(*) filter (where status = 'active' and (completed_at is not null
    or coalesce(invoice_spec_total_incl_vat, 0) > 0
    or quote_status in ('akkoord_ontvangen', 'definitief_bevestigd'))) gewonnen,
  count(*) filter (where terms_accepted_at is not null or signature_id is not null) getekend,
  round(sum(invoice_spec_total_incl_vat) filter (where status = 'active')) omzet,
  round(percentile_cont(0.5) within group (order by number_of_people)) mediaan_personen
from program_requests
where created_at >= '2026-01-01' and status <> 'deleted'
group by 1 order by 2 desc;
```

Gewonnen zonder handtekening:

```sql
select reference_number, origin, number_of_people, (selected_dates->>0)::date eerste_dag,
  round(invoice_spec_total_incl_vat) totaal, completion_status
from program_requests
where status = 'active' and terms_accepted_at is null and signature_id is null
  and (completed_at is not null or coalesce(invoice_spec_total_incl_vat, 0) > 0
    or quote_status in ('akkoord_ontvangen', 'definitief_bevestigd'))
order by eerste_dag;
```
