# Plan: referenties oogsten via de eigen applicatie

Status: besluiten genomen door Erwin op 22 september 2026 (alle adviezen
overgenomen, zie "Besluiten"; later die dag: Tripadvisor vervalt helemaal).
Fase 1 (verzamelen), fase 2 (tonen op de site) en fase 3
(referentiepagina's) zijn op 22 september gebouwd; fase 4 volgt in een
eigen pull request.

Aanleiding (Erwin, 22 september): referenties oogsten bij klanten, niet per
se via Google maar via de eigen applicatie, en die vervolgens kunnen
doorplaatsen naar Google en Tripadvisor. Daarbij klanten om akkoord vragen
om op de website een referentiepagina te maken op basis van hun programma.
Dit sluit aan op punt 3 van `docs/concurrentie-positionering.md` (reviews
zichtbaarder en talrijker maken, omdat het trackrecord de sterkste troef van
de concurrent is).

## Wat er nu is

- **De nazorgmail bestaat al, maar is nog nooit verstuurd.** Template
  `customer_aftersales_review` ("Bedankt voor uw bezoek aan Vlieland — deelt
  u uw ervaring?") met een knop naar Google en een verborgen tweede knop
  "Review op bureauvlieland.nl" (instelling `customer_aftersales_review_url`,
  leeg). Drie dagen na de laatste uitgevoerde activiteit maakt
  `check-pending-items` een taak "Aftersales-mail versturen" aan
  (`customer_aftersales_days_after` = 3); automatisch versturen staat uit
  (`customer_aftersales_auto_send` = false). Van de 14 programma's die sinds
  september 2025 zijn afgerond (april 2, juni 4, juli 7, september 1) is bij
  geen enkele de mail verstuurd. Het volume is dus klein en seizoensgebonden:
  elke beoordeling telt.
- **Google:** 11 reviews, gemiddeld 5,0. `fetch-google-reviews` haalt ze
  dagelijks in de cache; de homepage (hero, klantquotes), elke landingspagina
  (`GoogleReviewsBlock`, drie recente) en de structured data (score en aantal
  bij de organisatie) putten daaruit. Daarnaast staan vier vaste citaten in
  de code van `Testimonials.tsx`.
- **Tripadvisor:** komt nergens voor in code of documentatie. Of Bureau
  Vlieland een vermelding heeft, is niet bekend.
- **Klant- en deelnemersportaal:** `/mijn-programma/:token` en
  `/programma-deelnemers/:token`. Na afloop tonen ze het programma; er is
  geen plek om iets terug te zeggen.
- **E-mail:** Mailjet, templates in de database en in admin te bewerken,
  `email_log` met opens en kliks, suppressielijst, antwoorden komen via
  reply-to bij de aanvraag terecht.
- **Gegevens per programma** die een referentiepagina kunnen dragen:
  klantnaam en organisatie, aantal personen, data, de programma-onderdelen
  (bouwstenen, logies, catering) met hun foto's uit de mediabibliotheek, en
  sinds fase 3 van het ontwerpsysteem de instappagina (`attribution`), zodat
  een beoordeling straks bij de passende landingspagina kan verschijnen.
- **Geen privacyverklaring op de site.** Zodra wij namen en organisaties van
  klanten publiceren, moet die er zijn (zie "Spelregels").

## Spelregels die het ontwerp bepalen

- **Google en Tripadvisor kennen geen "doorplaatsen".** Een review kan alleen
  door de klant zelf worden geplaatst; er is geen API om dat namens iemand te
  doen en de voorwaarden verbieden het. Wat wél kan: de klant een directe
  schrijflink geven en zijn eigen tekst met één knop laten kopiëren. Dat is
  in dit plan het doorplaatsen.
- **Geen selectie op score.** Google verbiedt "review gating": alleen
  tevreden klanten naar Google sturen. De Google- en Tripadvisor-knoppen
  staan daarom voor iedereen op de bedankpagina, ongeacht de score. Wat wij
  wél zelf bepalen is wat er op bureauvlieland.nl verschijnt.
- **Geen beloningen** voor een review (beide platforms verbieden dat).
- **AVG:** een beoordeling met naam en organisatie op de site, en zeker een
  referentiepagina met programma en foto's, vraagt uitdrukkelijke
  toestemming. Die leggen we vast (tijdstip, IP, tekstversie) en is
  intrekbaar: de klant mailt, wij halen het weg. Een korte privacyverklaring
  op de site is dan nodig.
- **SEO:** eigen beoordelingen leveren geen sterren in Google-zoekresultaten
  op (Google negeert "self-serving" reviews in structured data). De
  Google-score blijft de bron voor de structured data; de winst van dit plan
  zit in meer Google-reviews en in de referentiepagina's als unieke content.

## Voorstel: zo werkt het

1. **Drie dagen na afloop** gaat de nazorgmail automatisch de deur uit, met
   één knop: "Deel uw ervaring" naar de eigen beoordelingspagina. Google
   blijft als tweede regel genoemd, voor wie liever direct daarheen gaat.
2. **De beoordelingspagina** (`/beoordeling/:token`, op het ontwerpsysteem:
   `FunnelHead`, `FormField`, `SuccessScreen`) vraagt een score (1 tot 5),
   een korte tekst ("Wat sprak u het meest aan?" en "Wat kan beter?"), naam
   en organisatie (vooringevuld), en twee vinkjes:
   - "Bureau Vlieland mag deze beoordeling met mijn naam en organisatie op
     bureauvlieland.nl tonen."
   - "Bureau Vlieland mag een referentiepagina over ons programma maken; ik
     krijg die eerst te zien en keur hem goed voordat hij online gaat."
3. **De bedankpagina** toont de eigen tekst met een knop "Kopieer uw tekst"
   en de knoppen "Plaats ook op Google" en, als er een vermelding is,
   "Plaats ook op Tripadvisor". Voor iedereen, ongeacht de score. Bij een
   score van 3 of lager staat er ook "Wij nemen persoonlijk contact met u
   op" en krijgt Erwin een taak met hoge prioriteit.
4. **Admin, Content → Beoordelingen:** lijst met score, tekst, toestemmingen,
   programma en instappagina; publiceren of verbergen; een citaat kiezen
   voor de site. Teksten worden niet herschreven, hooguit ingekort met
   behoud van betekenis.
5. **Op de site:** de klantquotes op de homepage tonen eigen gepubliceerde
   beoordelingen naast de Google-reviews; elke landingspagina toont eerst de
   beoordelingen van klanten die via die pagina binnenkwamen (of hetzelfde
   soort programma deden), met Google als aanvulling; een activiteitpagina
   toont beoordelingen van programma's waar die activiteit in zat.
6. **Referentiepagina's** (`/referenties` en `/referenties/<slug>`): per
   programma een pagina met organisatie, groepsgrootte, maand en jaar, het
   programma per dag (dezelfde tijdlijn als bij de voorbeeldprogramma's),
   het citaat met naam en functie, foto's van de bouwstenen, en onderaan
   "Zoiets ook?" met een knop die de programma-wizard opent met dezelfde
   bouwstenen voorgeselecteerd. Dat maakt een referentie meteen een
   verkoopkanaal.
7. **Akkoord op de referentiepagina** in twee stappen: het vinkje bij de
   beoordeling is de toestemming in beginsel; daarna maakt Erwin het concept
   (met een AI-voorzet uit het programma, die hij redigeert) en stuurt vanuit
   admin de mail "Mag dit zo online?" met een voorbeeldlink. De klant klikt
   "Akkoord" (of antwoordt met wijzigingen); pas dan gaat de pagina live.
   Beide toestemmingen worden vastgelegd.
8. **Opvolging:** wie de eigen beoordeling heeft ingevuld maar niet op de
   Google-knop klikte, krijgt na zeven dagen één herinnering (uitzetbaar).
   Meer niet.

## Fasen

**Fase 1: beoordelingen verzamelen (2 tot 3 dagen).** Tabel
`customer_reviews` (programma, token, score, tekst, naam, organisatie, de
twee toestemmingen met tijdstip, gepubliceerd of verborgen, bron). Edge
function `submit-customer-review` (openbaar, alleen met geldig token, één
beoordeling per programma, rate limit). De beoordelingspagina en de
bedankpagina op het ontwerpsysteem. Nazorgmail aangepast (één knop naar de
eigen pagina, Google als tweede regel) en automatisch versturen aan.
Instelling voor de Tripadvisor-link. Admin: Content → Beoordelingen met
publiceren en verbergen; taak met hoge prioriteit bij score 3 of lager.
Meting: verstuurd, geopend, geklikt, ingevuld, Google-knop geklikt.

Fase 1 is op 22 september gebouwd. Elk programma heeft een vaste
beoordelingslink (`review_token`, los van het portaal-token dat na 90
dagen verloopt). De pagina `/beoordeling/:token` staat op het
ontwerpsysteem (`FunnelHead`, `FormField`, sterren als radiogroep,
`SuccessScreen`): score, "Wat sprak u het meest aan?", "Wat kan beter?"
(intern), naam, functie, organisatie en de twee toestemmingen, standaard
uit. De bedankpagina toont de eigen tekst met "Kopieer uw tekst" en de
knoppen naar Google en Tripadvisor (die laatste alleen als de instelling
`customer_review_tripadvisor_url` gevuld is), voor iedereen; bij een score
van 3 of lager staat er dat wij persoonlijk contact opnemen en krijgt het
bureau een taak met hoge prioriteit ("Lage beoordeling"). De edge function
`customer-review` (openbaar, de link is het bewijs) doet context, opslaan
(één per programma, met tijdstip en IP van de toestemming) en het
vastleggen van een klik naar Google of Tripadvisor; tien Deno-tests. De
nazorgmail heeft nu één knop "Deel uw ervaring" naar de eigen pagina en
Google als tweede regel, en gaat automatisch drie dagen na de laatste
uitgevoerde activiteit (`customer_aftersales_auto_send` aan). Admin:
Content → Beoordelingen met score, teksten, toestemmingen, status (nieuw,
gepubliceerd, verborgen; publiceren alleen met toestemming) en een eigen
citaat. Nog niet: een knop in het klantportaal en de deelnemers (fase 4),
het tonen op de site (fase 2) en de beoordelingspagina in de visuele
regressietest (kan zodra de functie live staat en er een opname van is).

**Fase 2: tonen op de site (1 tot 2 dagen).** Eigen beoordelingen in de
klantquotes op de homepage, per landingspagina en per activiteitpagina, in
de kaarten van het ontwerpsysteem. De vier vaste citaten uit de code
verhuizen naar de tabel (bron "bestaand", ze staan al jaren openbaar).
Privacyverklaring op de site.

Fase 2 is op 22 september gebouwd. De view `published_reviews` geeft
alleen gepubliceerde beoordelingen en alleen de veilige kolommen vrij (het
citaat of anders de volledige tekst, naam, functie, organisatie, score,
tags, de instappagina van de aanvraag en de bouwstenen van het programma);
de tabel zelf blijft dicht voor bezoekers. `ReviewsBlock` vervangt het
Google-blok op de landingspagina's, de activiteitlandingspagina's en
Activiteiten op Vlieland: eigen beoordelingen die bij de pagina passen
(instappagina of tag) eerst, dan de overige eigen beoordelingen, aangevuld
met Google-reviews van vier sterren of meer, met de Google-score erbij. Een
activiteitpagina uit de database toont alleen beoordelingen van programma's
waar die bouwsteen in zat, en niets als die er niet zijn. De klantquotes op
de homepage komen uit dezelfde bron; de vier vaste citaten uit de code
staan nu in de tabel als bestaande citaten zonder score (sterren alleen bij
een echte score). In admin kan een beoordeling tags krijgen (slug van een
landingspagina of id van een bouwsteen) om hem ergens vooraan te zetten.
Nieuw: een privacyverklaring op `/privacy`, gelinkt vanuit de voettekst
en de beoordelingspagina; Erwin controleert de tekst. De visuele
referenties zijn na deze wijziging opnieuw gemaakt.

**Fase 3: referentiepagina's (3 tot 4 dagen).** Tabel `reference_cases`
(programma, slug, titel, intro, momentopname van het programma, citaat,
foto's, status concept, verstuurd, akkoord, gepubliceerd; akkoordtoken en
tijdstip). Admin: concept maken uit het programma met AI-voorzet, bewerken,
akkoordmail versturen. Pagina `/referentie-akkoord/:token` voor de klant.
Publieke pagina's `/referenties` en `/referenties/<slug>` op het
ontwerpsysteem (`PageHero`, `FactList`, tijdlijn, `PersonQuote`,
`RouteChooser`), in de sitemap, gelinkt vanaf de landingspagina's en de
homepage ("Zo deden anderen het"). De knop "Zoiets ook?" opent de wizard
met dezelfde bouwstenen.

Fase 3 is op 22 september gebouwd. Tabel `reference_cases` bewaart per
programma een momentopname (dagen met onderdelen op tijd, foto's van de
bouwstenen, feiten: soort, groepsgrootte, periode, duur, overnachting), het
citaat uit de beoordeling en de teksten; publiceren kan alleen na akkoord
van de klant, en de database dwingt dat af (status gepubliceerd vereist een
akkoord met tijdstip, naam en IP). Admin: Content → Referenties. Een concept
ontstaat uit een beoordeling met toestemming (knop "Referentie" bij
Beoordelingen, of de lijst "Toestemming gekregen, nog geen pagina"); Erwin
redigeert titel, webadres, intro, tekst en citaat, met een AI-voorzet
(`draft-reference-case`: feitelijk, u-vorm, geen superlatieven en niets
verzinnen), bekijkt de voorvertoning, vraagt akkoord
(`send-reference-approval` stuurt de mail "Mag deze referentiepagina over uw
programma online?" met de link naar `/referentie-akkoord/<token>`),
publiceert of verbergt, en kan de momentopname vernieuwen zonder de teksten
aan te raken. De klant ziet op de akkoordpagina precies de pagina zoals hij
online komt, geeft akkoord met zijn naam (taak voor Erwin: publiceren) of
stuurt een opmerking (taak met hoge prioriteit). Publiek: `/referenties`
(overzicht met `MediaCard`s) en `/referenties/<slug>` (`PageHero` met de
eerste foto, tekst met `FactList` "In het kort", tijdlijn per dag,
`PersonQuote`, "Andere referenties", `RouteChooser` "Zoiets ook?"); die knop
opent de programma-bouwer met dezelfde bouwstenen op dezelfde dagen
(`?blocks=`), na de basisstap met de eigen datum en groepsgrootte. Gelinkt
uit het menu (Inspiratie), de voettekst en, zodra er een referentie online
staat, onder de beoordelingen op de homepage en de landingspagina's; in de
sitemap via de view `published_reference_cases`. Edge function
`reference-case` (openbaar, de link is het bewijs) met zeven tests;
`draft-reference-case` en `send-reference-approval` alleen voor admins. Nog
niet: de referentiepagina's in de visuele regressietest (kan zodra de view
live staat en er een gepubliceerde referentie is om op te nemen).

**Fase 4: opvolging en overzicht (1 dag).** De eenmalige herinnering voor
Google. Een blok in admin met de trechter (verstuurd, ingevuld,
gepubliceerd, Google-kliks) en het aantal Google-reviews per maand uit de
cache. Tripadvisor-vermelding aanmaken of bevestigen (door Erwin).

Totaal ongeveer 7 tot 10 bouwdagen. Fase 1 levert direct op: het volume
aan beoordelingen begint te groeien bij het eerstvolgende afgeronde
programma.

## Besluiten (Erwin, 22 september 2026)

Alle adviezen hieronder zijn overgenomen: de nazorgmail gaat automatisch
drie dagen na afloop; eerst alleen de opdrachtgever, deelnemers later als
optie; Google eerst en Tripadvisor alleen als er een passende vermelding
is (de knop bestaat, verborgen zolang de link leeg is); lage scores niet
op de site maar wel de Google-knop en persoonlijke opvolging; de
referentiepagina met organisatie, aantal personen, maand en jaar,
programma-onderdelen, citaat met naam en functie en foto's van de
bouwstenen; een AI-voorzet voor de tekst die Erwin redigeert; één
uitzetbare herinnering voor Google na zeven dagen; de vier vaste citaten
naar de database.

Aanvulling van Erwin later op 22 september: de hele Tripadvisor-route
vervalt. De bedankpagina verwijst alleen nog naar Google; de instelling en
de kolom voor Tripadvisor zijn in fase 2 weer verwijderd.

De vragen zoals ze zijn gesteld:

1. **Nazorgmail automatisch versturen**, drie dagen na afloop? Advies: ja.
   Via de takenlijst is hij tot nu toe nul keer verstuurd.
2. **Wie vragen we:** alleen de opdrachtgever, of ook de deelnemers via het
   deelnemersportaal? Advies: eerst de opdrachtgever; deelnemers als optie
   in fase 4 (meer Google-reviews, maar minder zeggingskracht voor B2B).
3. **Tripadvisor:** is er een vermelding? Zo nee: aanmaken of overslaan?
   Advies: Google eerst; Tripadvisor alleen als de vermelding bestaat en
   past bij de doelgroep (het is vooral een consumentenplatform).
4. **Lage scores** (3 of lager): niet op de site, wel de Google-knop (dat
   moet) en persoonlijke opvolging. Akkoord?
5. **Wat mag standaard op een referentiepagina:** organisatie, aantal
   personen, maand en jaar, programma-onderdelen, citaat met naam en
   functie, foto's van de bouwstenen (geen klantfoto's, tenzij aangeleverd).
   Iets weglaten of toevoegen?
6. **Tekst van de referentiepagina:** AI-voorzet die jij redigeert, of
   handgeschreven? Advies: AI-voorzet; de klant keurt toch goed.
7. **Eén herinnering voor Google na zeven dagen:** ja of nee? Advies: ja,
   uitzetbaar.
8. **De vier vaste citaten** overzetten naar de database als bestaande
   beoordelingen? Advies: ja.

## Meetpunten

- Trechter per kwartaal: verstuurd, geopend, ingevuld, gepubliceerd,
  Google-knop geklikt. Doel: minstens 40 procent van de verstuurde mails
  ingevuld.
- Aantal Google-reviews (nu 11) per kwartaal, vóór en na.
- Referentiepagina's live, bezoek en aanvragen via "Zoiets ook?" (de
  instappagina gaat al met elke aanvraag mee).

## Wat dit plan bewust niet doet

- Niet automatisch plaatsen op Google of Tripadvisor: kan niet en mag niet.
- Geen beloningen voor een review.
- Geen selectie op score voor de knoppen naar Google en Tripadvisor.
- Geen eigen sterren in de structured data; de Google-score blijft de bron.
