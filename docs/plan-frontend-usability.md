# Plan: frontend usability en conversie

Status: deel 1 (bouwstenen/activiteiten-boeken) doorgevoerd en beide
koppelingen gezet, 9 september. Deel 2: fase 1 en 2 akkoord (9 september),
fase 3 wacht op een GA4-export (zie onderaan hoe).

Dit plan bouwt voort op `.lovable/funnel-audit.md` (9 juni 2026). Track A en B
uit die audit zijn gedaan (bot-filter, cancellation-classificatie,
duplicate-submit guard, RoutePicker, BasicsForm zonder verplichte datum,
logiesbanner). Dit document herhaalt dat niet, maar pakt Track C op met verse
cijfers en een volledige doorlichting van de site (navigatie, wizard-flows,
formulieren, design-systeem, mobiel, performance), plus het directe
bouwstenen/activiteiten-boeken-vraagstuk uit deel 1.

## Deel 1 — bouwstenen en activiteiten-boeken: twee werelden of één?

### Wat er deze week misging

Beide keren dat deze week een activiteit werd aangevraagd die ook direct
boekbaar was, ging het om **dezelfde bouwsteen**: Wadloopexcursie (Stichting
Natuur Educatie Centrum Vlieland). Eén aanvraag op 7 september, geannuleerd;
de volgende op 8/9 september, vandaag geannuleerd met de reden "Voorstel
gedaan om direct te boeken". Geen twee verschillende lekken dus, maar één
gemiste koppeling die twee keer misging.

De oorzaak: de bouwsteen "Wadloopexcursie" had geen `map_activity_type_id`.
De partner heeft wél een MAP-omgeving (`lepelaar-vlieland`) met een online
boekbare activiteit "Wadexcursie de Lepelaar" (100 min) — maar niemand had ze
aan elkaar gekoppeld. De automatische koppeling in `src/lib/directBookable.ts`
valt terug op naamvergelijking binnen dezelfde partner als er geen
`map_activity_type_id` is, maar "Wadloopexcursie" en "Wadexcursie de
Lepelaar" zijn niet gelijk genoeg om die match te maken. Dat is geen bug: de
namen verschillen nu eenmaal, en een losse fuzzy-match over alle partners heen
zou het risico op verkeerde koppelingen groter maken dan het nu oplost.

### Wat ik verder heb nagekeken

Ik heb alle gepubliceerde bouwstenen van partners mét een MAP-omgeving
gecontroleerd op ontbrekende koppelingen. Naast Wadloopexcursie zijn er nog
zes: de rondleiding bij Brouwerij Fortuna, "Lunch tijdens Vliehors Expres",
"Vliehors Expres Exclusief", twee watertaxi-bouwstenen en "Zeehondentocht
Exclusief". Voor vijf daarvan is er geen actie nodig: het zijn ofwel
toevoegingen zonder eigen MAP-activiteit (de lunch), ofwel varianten die MAP
zelf als niet-online-boekbaar markeert (alle privéritten en watertaxi's staan
in MAP op `IsAvailableOnline: false` — terecht, want groepsgrootte en tijden
moeten daar handmatig afgestemd worden). Voor de brouwerij-rondleiding is er
een mogelijke match ("Rondleiding en proeverij"), maar de naam wijkt genoeg
af dat ik dat niet blind zou koppelen.

**Conclusie: dit is geen structureel probleem met veel gemiste koppelingen —
het is één gemiste koppeling, plus een interfaceprobleem dat een gemiste
koppeling onnodig duur maakt.**

### De structurele oorzaak

Op de kaart in `/bouwstenen` stond, ook als een bouwsteen wél gekoppeld was
(badge "Direct boekbaar" + knop "Direct reserveren"), daaronder gewoon nog
een even grote knop "Direct aanvragen" — nog steeds volledig klikbaar, alleen
met een ander kleurtje. Niets in de interface stuurde iemand weg bij de
vertrouwde "aanvragen"-knop, ook niet als reserveren dezelfde seconde nog kon.
Dat verklaart waarom Erwin's eigen inschatting klopt: "het direct boekbare
wordt niet goed genoeg gevonden" — het staat er wel, maar met evenveel gewicht
als het alternatief dat mensen al kennen. Historisch bevestigt de database dat
beeld hard: `map_bookings` bevat sinds de start van het platform **nul
rijen**. Van de twee bouwstenen die al langer gekoppeld zijn (Vliehors Expres,
Zeehondentocht) is dus ook nog nooit iemand daadwerkelijk via de directe knop
doorgeklikt naar boeken — terwijl de boekflow zelf (`MapBookingDialog` →
`map-book` → redirect naar de betaalpagina van de aanbieder) een werkende,
volledige weg is.

Een tweede, kleinere factor: in het hoofdmenu staan "Activiteiten"
(`/bouwstenen`, omschreven als "Inspiratie: alle activiteiten op een rij") en
"Direct boeken" (`/activiteiten-boeken`) als twee aparte items. Wie op
"Activiteiten" klikt, verwacht een inspiratiepagina, geen boekpagina — de
badge moet het dus alleen doen.

### Mijn antwoord op "kunnen we deze twee werelden niet efficiënter
samenbrengen, of is dit het best haalbare?"

Niet samenvoegen tot één pagina — wel het lek dichten dat er nu is. De twee
pagina's bedienen echt verschillende vragen: `/bouwstenen` is de catalogus
waarmee je een programma van meerdere onderdelen samenstelt, met een aanvraag
die het bureau daarna afhandelt; `/activiteiten-boeken` is een losstaande,
actuele kalender van precies één moment, direct betaald bij de aanbieder. Ze
laten samenvloeien zou de aanvraagflow (die verreweg de meeste aanvragen
oplevert) nodeloos compliceren voor een boekbaar aanbod dat nu **2 van de
circa 45 gepubliceerde bouwstenen** beslaat. Een grotere samenvoeging bouwen
voor twee activiteiten is niet in verhouding.

Wat ik wél heb doorgevoerd, vandaag, in code (`src/pages/Bouwstenen.tsx`):
als een bouwsteen direct boekbaar is, is "Direct reserveren" nu de enige
gelijkwaardige primaire knop naast "Aan programma toevoegen" (nog steeds
zinvol — iemand kan de activiteit als onderdeel van een groter programma
willen). "Direct aanvragen" is niet weg, maar staat er nu als kleine,
onderschikte tekstlink onder: "Liever aanvragen in plaats van direct boeken?"
— voor de uitzondering (bijvoorbeeld een grotere groep dan MAP toelaat), niet
meer als gelijkwaardig alternatief. Getest (typecheck, lint, volledige
testsuite, build) en klaar om mee te gaan in dezelfde pull request als de
scroll-fix hieronder.

### Afgehandeld

- Wadloopexcursie → "Wadexcursie de Lepelaar" en de rondleiding bij Brouwerij
  Fortuna → "Rondleiding en proeverij": beide door Erwin zelf gekoppeld op
  9 september via "Koppel aan bestaande". Daarmee zijn nu 4 van de circa 45
  gepubliceerde bouwstenen daadwerkelijk direct boekbaar.
- **Twee vervolgvondsten na het koppelen, allebei gefixt (9 september):**
  1. De generieke activiteitpagina (`/activiteit/<slug>`, waar "Meer info"
     op de bouwstenen-kaart naar linkt) had helemaal geen weet van directe
     boekbaarheid — geen badge, geen "Direct reserveren", alleen "Direct
     aanvragen". Voor alle 4 nu gekoppelde bouwstenen liet juist de pagina
     waar de meeste bezoekers landen het directe boeken niet zien. Nu toont
     die pagina hetzelfde patroon als de bouwstenen-kaart.
  2. Erger: de SEO-landingspagina `/wadlopen-vlieland` (rankt op "wadlopen
     vlieland") beweerde al "Direct online te boeken" en had knoppen "Boek
     je wadexcursie" / "Direct boeken" — die allebei naar het
     aanvraagformulier linkten, niet naar een echte boeking. Dat was al zo
     vóór de koppeling van vandaag; de tekst loog dus al een tijdje. Beide
     knoppen linken nu naar de echte boeking wanneer de koppeling bestaat,
     en vallen terug op eerlijke "aanvragen"-tekst als dat ooit niet meer
     zo is. **Zeehondentochten-vlieland heb ik bewust niet aangepast**: die
     pagina vermeldt een minimum van 10 personen bij de hoofd-CTA, wat
     duidt op een chartertocht in plaats van losse plekken op de publieke
     "Robbentocht" in MAP — dat moet je bevestigen voordat ik die knop naar
     instant boeken zou durven omzetten (zie besluit hieronder).
- Grotere stap, alleen relevant zodra meer partners hun aanbod via MAP online
  boekbaar maken (staat al open op de roadmap: "MAP: de 7 MAP-aanbieders hun
  activiteiten laten aanbieden"): zodra dat aantal een stuk groter is dan 4,
  wordt het de moeite waard om de resultaten van `/activiteiten-boeken` inline
  op de bouwsteen-kaart te tonen (tijdstip kiezen zonder pagina-wissel) in
  plaats van door te linken. Nu zou dat overengineering zijn.

### Zeehondentochten Vlieland — opgelost (9 september)

Erwin bevestigt: als groep kan de zeehondentocht alleen exclusief (dat is de
apart bouwsteen "Zeehondentocht Exclusief", géén online-boekbare MAP-variant —
blijft dus aanvragen), maar individueel kun je gewoon los boeken. Inhoudelijk
dezelfde tocht als de al gekoppelde bouwsteen "Zeehondentocht" → MAP-activiteit
"Robbentocht". `/zeehondentochten-vlieland` heeft nu hetzelfde patroon als
wadlopen: de twee individueel-gerichte CTA's ("Boek je zeehondentocht",
"Direct boeken") linken naar de echte MAP-boeking, de groeps-CTA ("Offerte
voor een groep") blijft aanvragen.

### Inline boeken in plaats van doorklikken naar de kalender (9 september)

Erwin's feedback op de eerste versie: "Direct reserveren" klikte door naar
`/activiteiten-boeken` met een voorgeselecteerde datum — een andere pagina,
die niet als vervolg op de activiteit aanvoelt. Referentie: de activiteitpagina's
op visitvlieland.nl, die de eerstvolgende data direct op de pagina zelf tonen
en ter plekke laten boeken.

Nieuw gedeeld component `src/components/map/DirectBookingPanel.tsx`: haalt
per activiteit de eerstvolgende data en tijden op (hergebruikt dezelfde
`MapBookingDialog` die ook `/activiteiten-boeken` al gebruikt), toont ze
direct als een lijst met klikbare tijden, en opent de boekdialoog zonder
naar een andere pagina te gaan. Toegepast op:
- de activiteitpagina (`/activiteit/<slug>`) — vervangt de losse
  "Direct reserveren"-knop volledig;
- de "boeken"-secties van wadlopen en zeehondentochten;
- de hero-knoppen op diezelfde twee landingspagina's scrollen nu naar die
  sectie op de pagina zelf in plaats van naar een andere pagina te linken.

De bouwstenen-kaart linkt "Direct reserveren" nu naar de activiteitpagina
(waar het bovenstaande paneel staat) in plaats van rechtstreeks naar de
kalenderpagina.

Getest: typecheck, lint, volledige testsuite, build. **Niet gelukt:** een
live doorklik in de browser, omdat deze sessie geen websocket-verbindingen
mag maken naar Supabase (een omgevingsbeperking, geen codefout) — de React-app
laadt wel zonder fouten, maar de eigenlijke activiteitendata kon ik hier niet
zien laden. Wil je dit zelf even doorklikken op de preview-link van de pull
request voordat je 'm merget?

## Deel 2 — usability en conversie: visie en fasenplan

### Wat er nu is (gemeten, 9 juni – 9 september)

| Periode | Aanvragen | Geannuleerd | Offerte verstuurd | Getekend |
|---|---|---|---|---|
| 9–30 juni | 21 | 14 (67%) | 13 | 3 |
| Juli | 3 | 2 | 1 | 0 |
| Augustus | 6 | 1 | 2 | 0 |
| 1–9 september | 3 | 2 | 0 | 0 |
| **Totaal (9 juni–9 sept)** | **33** | **19 (58%)** | **16** | **3** |

Twee dingen vallen op. Eén: het annuleringspercentage is niet gedaald sinds
de audit (52% in de meetperiode van juni, 58% erna) — de gecontroleerde
oorzaken uit de audit (test-aanvragen, duplicate-submits) waren toen al eruit
gefilterd, dus dit is na Track A/B nog steeds het niveau. Twee, en groter: het
**aantal aanvragen zakt sterk na juni** — van 21 in de laatste drie weken van
juni naar 3 in juli, 6 in augustus, 3 in de eerste negen dagen van september.
Erwins eigen inschatting (9 september): vooral seizoen, en Google Ads is
stopgezet. Dat laatste is een directe, aanwijsbare oorzaak voor minder
verkeer, los van seizoen — als een relevant deel van het juni-verkeer uit
betaalde zoekresultaten kwam, verklaart het stopzetten daarvan een groot deel
van de terugval zonder dat er iets mis is met de site zelf. Ik kan dat van
hieruit niet aan bezoekersaantallen toetsen (geen GA4-toegang, alleen de
aanvragen die in de eigen database terechtkomen) — zie hieronder voor hoe we
dat wel meetbaar maken, dan kan fase 3 uitsplitsen hoeveel van de terugval
seizoen, Ads-stop, en eventueel echt gedragslek is.

**Logies-handoff** (funnel-audit Track C1, nog open): van de 33 aanvragen
sinds 9 juni zijn er 6 gekoppeld aan een logiesaanvraag (18%) plus 7 losse
logiesaanvragen — een verbetering ten opzichte van de ~9% uit de juni-audit
(de prominentere banner uit Track A3 lijkt te helpen), maar nog steeds ver
onder wat je zou verwachten als "één partij, één factuur" goed aansloeg.

**Duplicate-submits, uitgezocht (fase 1, 9 september)**: van de vier gevallen
sinds 9 juni waren er maar twee echt een dubbele klik: identieke aanvraag
(zelfde aantal personen, zelfde datums), 7 en 10 seconden na elkaar, binnen
dezelfde sessie. De andere twee zijn geen bug: één klant diende met 2 uur
ertussen een tweede aanvraag in met een andere datum, de ander met 11 uur
ertussen een aanvraag voor 10 personen en daarna, apart, één voor 110 — dat
zijn gewoon twee verschillende aanvragen van dezelfde klant, geen dubbelklik.

Voor de twee echte gevallen vond ik de oorzaak: in `CheckoutContactForm.tsx`
werd de knop pas op "bezig" gezet ná twee databasecontroles (de dedup-checks
zelf), niet meteen bij de klik. Een snelle tweede klik kwam daardoor door alle
guards heen voordat de eerste klik zijn eigen controles had afgerond. Ik heb
dit vandaag al gefixt: de knop vergrendelt nu synchroon bij de klik, vóór
enige databasecontrole. Getest (typecheck, lint, volledige testsuite, build).
Overblijvend risico: twee losse browsertabbladen met hetzelfde e-mailadres
zouden deze specifieke race nog steeds kunnen omzeilen, omdat elk tabblad zijn
eigen "bezig"-status heeft. Een volledig waterdichte oplossing zou een
controle in de database zelf vereisen (in de `submit_self_service_program_request`-functie,
die nu geen enkele dedup-controle heeft) — dat is een aparte, kleine
migratie; ik stel voor die pas te doen als dit na de huidige fix nog
voorkomt.

**Doorlichting van de rest van de site** (navigatie, ontwerp, formulieren,
code): het ontwerpsysteem (Tailwind/shadcn, kleurtokens, Fraunces/Inter) is
consistent toegepast — geen prioriteit. Formulieren zijn dat niet: er lopen
vier verschillende validatiepatronen door elkaar (`react-hook-form`+zod in
Offerte, losse zod-validatie in het maatwerkformulier, custom regex bij
MAP-boeken, kale HTML5-`required` bij de bouwstenen- en checkoutformulieren),
en **nergens is er live validatie tijdens het typen** — fouten verschijnen
overal pas ná een submit-poging. Code-splitting is verder prima op orde.

### Bevindingen: mijn visie

1. **Te veel gelijkwaardige keuzes, niet genoeg gestuurde paden.** De
   bouwstenen-kaart had tot vandaag drie even zware knoppen; elders in de
   funnel staat "Snel aanvragen" naast "Programma samenstellen" zonder dat
   duidelijk is wanneer je welke kiest (funnel-audit punt 5, nog open). Een
   bezoeker zonder voorkennis kiest dan vaak de optie die het meest op "gewoon
   een formulier invullen" lijkt — precies het gedrag dat deel 1 hierboven
   laat zien.
2. **Formulieren valideren te laat en te verschillend.** Vier patronen, geen
   inline feedback. Op de twee zwaarste formulieren (Offerte,
   Programma-samenstellen) is dat waarschijnlijk een reële afhaakreden,
   niet alleen een consistentie-kwestie.
3. **Logies is nog steeds los geplakt in plaats van ingebouwd** — exact
   Track C1 uit de juni-audit, nog niet opgepakt, en met 18% nog steeds de
   grootste procentuele lek in de funnel.
4. **Blinde vlek in meten.** GTM/dataLayer-events bestaan (add_to_cart,
   program_request_submitted, enzovoort) maar zonder GA4-toegang vanuit deze
   omgeving kan ik conversie per landingspagina niet meten — dat blokkeert
   zowel Track C2 uit de audit als een deel van de prioritering hieronder.
5. **De bouwstenen/direct-boekbaar-kwestie uit deel 1 is een symptoom van
   bevinding 1**, geen apart probleem: te veel gelijk gewicht, niet één
   duidelijke volgende stap.

### Voorstel in fases

**Fase 1 — CTA-hiërarchie en formulieren (akkoord 9 september, deels gedaan)**
- Bouwstenen-kaart: gedaan (deel 1).
- Activiteitpagina (`/activiteit/<slug>`) en de landingspagina wadlopen:
  gedaan, zie "Afgehandeld" bij deel 1. Zeehondentochten wacht op bevestiging.
- Duplicate-submits: uitgezocht en de race-conditie gefixt (zie hierboven).
- Nog te doen: zelfde soort keuze herzien bij Snel-aanvragen vs.
  Programma-samenstellen — één duidelijke vraag ("wilt u dit ene onderdeel
  snel regelen, of een heel programma samenstellen?") in plaats van twee
  knoppen naast elkaar.
- Nog te doen: inline validatie op Offerte en Programma-samenstellen; op
  termijn één gedeeld validatiepatroon voor nieuwe formulieren.

**Fase 2 — Logies structureel integreren (Track C1 van de audit)**
- Logies van losse banner/flow naar een officiële, overslaanbare stap in de
  programma-wizard zelf, zodat de keuze niet pas op de klantpagina ontstaat.
  Dit raakt `CheckoutContactForm` en de programma-wizard; groter dan fase 1,
  aparte planningsronde met eigen ontwerp.

**Fase 3 — Meten en bijsturen (Track C2/C3 van de audit)**
- Attributie per SEO-landingspagina naar aanvraag, zodat je per pagina kunt
  zien wat werkt.
- A/B-testbare CTA-copy op basis van fase 1 en 2.
- Exit-intent of programma-concept bewaren voor afhakers (gedeeltelijk al
  aanwezig via `useProgramDraft`, verder uitbouwen).
- Vereist GA4-toegang of periodieke export — zie besluit hieronder.

### Vier nieuwe punten van Erwin (10 september)

**1. Footer oogt rommelig — opgelost.** De zwevende "Uw programma"-knop, de
zwevende verstuur-balk op Programma-samenstellen en de "Vraag stellen"-knop
zijn `position: fixed`, dus ze blijven op hun plek staan ook als de bezoeker
helemaal naar beneden scrolt tot in de footer — en overlappen die dan. Nieuwe
hook `useFooterInView` (via een `IntersectionObserver` op de footer) laat
beide widgets vervagen zodra de footer in beeld komt; een al geopend
chat-paneel blijft gewoon staan.

**2. Horizontale scroll op de partnerpagina — nieuwe plek, zelfde patroon,
opgelost.** Niet hetzelfde component als de eerdere scroll-fix (dat was het
MAP-koppelblok onderaan): dit keer `BlockRow` in `PartnerBlocks.tsx`, de
gewone kaartjes onder "Gepubliceerd"/"Goedgekeurd". Rechts in die rij stonden
tot drie badges plus een bewerk-knop allemaal `shrink-0` zonder terugval, op
smalle schermen dus weer dezelfde categorie fout als eerder. Zelfde
oplossing: de rij stapelt nu op mobiel in plaats van breder te worden dan het
scherm.

**3. Staffelprijzen ook in het partnerportaal — gedaan (10 september).**
Bij sommige bouwstenen (zoals Vliehors Expres) is een staffelprijs per
groepsgrootte ingesteld via `TierEditor` in het adminscherm
(`src/components/admin/BuildingBlockSheet.tsx`), opgeslagen in `price_extras`
bij `price_type = "tiered_total"`. Het partnerportaal
(`PartnerBlockSheet.tsx`) had deze editor niet — een partner kon geen staffel
instellen of aanpassen aan eigen bouwstenen. Bevestigd bij het uitzoeken: geen
database-trigger blokkeerde dit (wel voor eigenaarschap en zelf publiceren),
dus puur een front-end-klus. `TierEditor` en de opslaglogica (valideren,
mergen in `price_extras`) hergebruikt in `PartnerBlockSheet.tsx`; "Staffel op
groepsgrootte" toegevoegd aan het prijstype-keuzemenu; de activiteitenlijst in
het partnerportaal (`PartnerBlocks.tsx`) toont nu ook "vanaf €… (staffel)" in
plaats van "Prijs op aanvraag" voor deze bouwstenen. Getest: typecheck, lint,
volledige testsuite, build.

**4. Voorbeeldprogramma's meer promoten — jouw hypothese klopt, en het is
vooral een plaatsingsvraag, geen bouwvraag.** Er staan 12 gepubliceerde
voorbeeldprogramma's. Ze zijn nu alleen te vinden via een klein tekstlinkje
onder de RoutePicker-sectie op de homepage ("Geen idee waar te beginnen?") en
een item in het secundaire "Inspiratie"-dropdownmenu — geen eigen kaart
tussen de drie hoofdroutes. Binnen de wizard zelf bestaat het "kopieer een
voorbeeld als vertrekpunt" al: zodra iemand met een (bijna) lege
kaart in Programma-samenstellen zit, verschijnt al een opvallende banner
("Snel starten met een voorbeeldprogramma?") die naar de templates linkt —
dat stuk hoeft dus niet gebouwd te worden.

Mijn inschatting van de kern van je vraag ("is samenstellen te
ingewikkeld?"): niet de wizard zelf (die is stap voor stap opgebouwd), maar
dat een bezoeker zonder voorbeeld eerst moet *verzinnen* wat er allemaal kan
vóórdat hij aan de wizard begint — en die drempel zit vóór de wizard, niet
erin. Concreet voorstel: een vierde kaart in de `RoutePicker` op de homepage
("Voorbeeldprogramma's bekijken", ± 2 min, "bestaand programma als
startpunt"), zodat mensen die drempel al bij de eerste keuze wegnemen in
plaats van pas te ontdekken dat die er is nadat ze de wizard al hebben
geopend.

### Besluiten (9 september)

- **Fase 1 akkoord** — start met CTA-herziening Snel-aanvragen/
  Programma-samenstellen, inline validatie, duplicate-submit uitzoeken.
- **Fase 2 akkoord** — logies als stap in de wizard, aparte planningsronde
  zodra fase 1 loopt.
- **Terugval juni→september**: vermoedelijk seizoen plus het stopzetten van
  Google Ads, geen aanwijzing voor een sitefout. Wordt in fase 3 met echte
  cijfers bevestigd zodra er een GA4-export is.

### Hoe je GA4 kunt delen

Er is geen directe koppeling tussen deze omgeving en Google Analytics (geen
Google-account om toegang aan te geven, en er is geen GA4-connector
geïnstalleerd). Twee manieren die wel werken, van makkelijk naar completer:

1. **Eenmalig, snel**: in GA4 naar *Rapporten → Levenscyclus → Acquisitie →
   Verkeersacquisitie* (of *Verkennen* voor een aangepast rapport), periode
   op de laatste 3-4 maanden zetten, uitsplitsen per maand en eventueel per
   landingspagina, en rechtsboven exporteren als CSV. Dat bestand kun je
   direct in dit gesprek plaatsen (of in een volgend gesprek als dit
   afgerond is) — dan lees en analyseer ik het meteen.
2. **Voor herhaald gebruik**: zet hetzelfde rapport in GA4 als terugkerende
   export naar een Google Sheet (GA4 heeft daarvoor een ingebouwde
   Sheets-koppeling: *Verkennen → rapport → exporteren naar Sheets*, of via
   Looker Studio met een Sheets-uitvoer), en deel die Sheet met me via
   Google Drive — die koppeling staat al aan in deze omgeving. Dan hoef je
   niet elke keer opnieuw te exporteren.

Voor fase 3 is vooral verkeer en conversie per landingspagina relevant
(welke SEO-pagina's leveren aanvragen op), plus totaal bezoekersaantal per
maand om de terugval hierboven te kunnen duiden.

## Voorstel voor volgorde van ontwikkeling (10 september)

Alles wat nu nog open staat, in de volgorde die ik zou aanhouden. Niet
gedaan zonder jouw akkoord — de twee bugs hierboven (footer, scroll) zijn al
gefixt omdat het bugreports waren, de rest wacht op jouw akkoord op deze
volgorde of een andere prioriteit.

1. **Staffelprijzen in het partnerportaal — gedaan (10 september).** Zie
   punt 3 hierboven.
2. **Voorbeeldprogramma's op de homepage — gedaan (10 september).** Vierde
   kaart toegevoegd aan de hoofdroutes in `RoutePicker` ("Voorbeeldprogramma's
   bekijken", ± 2 min, linkt naar `/voorbeeldprogrammas`), grid van 3 naar 4
   kolommen op groot scherm. De losse tekstlink die er eerder naar verwees is
   verwijderd (was dubbelop met de nieuwe kaart). Kop aangepast van "Vijf" naar
   "Zes manieren om bij ons aan te kloppen" (nu 4 hoofdroutes + 2 losse
   onderdelen). Getest: typecheck, lint, volledige testsuite, build.
3. **Snel-aanvragen vs. Programma-samenstellen: CTA-hiërarchie — gedaan
   (10 september).** Drie plekken hadden nog twee gelijkwaardige knoppen
   "Direct aanvragen" / "Aan programma toevoegen" naast elkaar: de
   bouwstenen-hero, de bouwstenen-kaart (niet-boekbare bouwstenen) en de
   activiteitpagina (niet-boekbare bouwstenen) — zelfde patroon als de
   al gedane bouwstenen-kaart-fix voor direct boekbare items. Overal nu
   "Aan programma toevoegen" als enige knop, "Direct aanvragen" als
   onderschikte tekstlink eronder — programma samenstellen is ook op de
   homepage al de gemarkeerde standaardroute, en `/snel-aanvragen` deelt
   feitelijk dezelfde cart als `/programma-samenstellen` (alleen beperkt
   tot één dag), dus dit maakt de knoppen consistent met wat er technisch
   al hetzelfde systeem is. `/snel-aanvragen` had zelf al een nette,
   ondergeschikte terugweg ("Toch meerdaags programma"), daar niets aan
   veranderd. Getest: typecheck (app + strict), lint, volledige testsuite,
   build.
4. **Inline formuliervalidatie — gedaan (10 september).** Twee verschillende
   formuliertypes, dus twee aparte oplossingen. `Offerte.tsx` gebruikt al
   react-hook-form + zod met `FormMessage`; die las de foutmeldingen al
   reactief, alleen het moment van valideren stond nog op `onSubmit` — nu
   `mode: "onBlur"`, zodat een fout meteen zichtbaar wordt zodra je een veld
   verlaat, niet pas na een volledige (mislukte) verzendpoging.
   `CheckoutContactForm.tsx` (gebruikt door zowel Programma-samenstellen als
   Snel-aanvragen) heeft geen formulierbibliotheek en controleerde tot nu toe
   alleen of naam/e-mail/telefoon niet leeg waren — geen formaatcontrole.
   Toegevoegd: een `touched`-state per veld, een `handleBlur`, en echte
   validatie (geldig e-mailadres, geldig telefoonnummer) die pas een
   foutmelding toont nadat het veld is verlaten en meteen verdwijnt zodra de
   gebruiker het corrigeert — zelfde gedrag en styling (`text-sm font-medium
   text-destructive`) als de shadcn `FormMessage` elders. Getest: typecheck
   (app + strict, 26/26 op de baseline), lint, volledige testsuite (106
   bestanden / 1535 tests), build.
5. **Logies als stap in de wizard — gedaan (10 september).** Nieuwe stap
   "Logies" toegevoegd aan `ProgrammaSamenstellen.tsx`, direct na
   Basisgegevens en vóór Vervoer & fietsen (akkoord: datum/gasten zijn dan al
   bekend, dus niet dubbel vragen). Twee ontwerpkeuzes vooraf afgestemd: de
   stap staat na basics/vóór transport, en is bewust compact — alleen type
   verblijf, locatievoorkeur en budget, geen kamerverdeling (dat blijft zoals
   nu, via e-mail/telefoon na het versturen). Volledig overslaanbaar met een
   duidelijke "Nee, wij regelen dit zelf"-keuze, standaard niet aangevinkt.
   Vóór deze wijziging bestond er wel een volledige logiesflow
   (`AccommodationWizard`), maar die stond los van de programma-wizard: een
   banner die ze had moeten koppelen (`LogiesSuggestionBanner`) bleek nergens
   daadwerkelijk gerenderd te worden — klanten zagen logies pas op hun
   klantpagina, ná het versturen van hun aanvraag. Nu wordt de logieswens,
   als een klant die invult, bij het versturen van het programma direct mee
   aangemaakt als gekoppelde `accommodation_requests`-rij (zelfde
   koppelmechanisme als de bestaande standalone wizard: `linked_program_id` +
   `program_requests.linked_accommodation_id`), zodat die meteen op de
   klantpagina zichtbaar is in plaats van pas na een aparte tweede aanvraag.
   De keuze wordt ook meegenomen in het conceptherstel (`useProgramDraft`) als
   iemand tussentijds afhaakt. Getest: typecheck (app + strict, 26/26 op de
   baseline), lint, volledige testsuite (106 bestanden / 1535 tests), build.
   Live doorklikken kon niet vanuit deze omgeving (de dev-server hier lukt
   niet op dit systeem) — wel te testen via de Netlify-deploypreview op de
   pull request.
6. **Meten en bijsturen** (fase 3) — kan niet substantieel starten zonder
   GA4-export (zie hierboven), maar hoeft nergens anders op te wachten. Deel
   de export zodra je kunt, dan kan ik dit oppakken zonder dat het de rest
   vertraagt.

Reden voor deze volgorde: eerst de kleine, afgebakende dingen met duidelijke
impact (1–3), dan de iets grotere formulierklus (4), dan de grote
structurele wijziging die een eigen besluitvormingsronde verdient (5), met
het meetwerk (6) parallel zodra de data er is in plaats van aan het einde.
