# Plan: het ontwerpsysteem in het klantportaal

Status: onderzoek en voorstel, 1 oktober 2026; besluiten genomen door
Erwin op 1 oktober 2026 (alle aanbevelingen, zie onderaan). Vraag van
Erwin: breng de ontwerptaal van de site door in het klantportaal ("Uw
programma", de vernieuwde klantomgeving), met de bruikbaarheid voorop; de
dagtabs van een meerdaags programma zijn "niet heel duidelijk". De bouw
volgt per fase, elke fase als eigen PR met preview.

De norm is `docs/design-systeem.md` (tokens, componenten in
`src/components/system`, interactieregels). Het onderzoek achter de site
staat in `docs/plan-design-systeem.md`; dit document is de vervolgstap
voor het klantportaal, dat daar bewust buiten viel. Het partnerportaal is
in hetzelfde onderzoek meegenomen; die bevindingen staan als bijlage
onderaan, voor later.

## Samenvatting

- **Het klantportaal is het laatste publieke deel van de app in de oude
  ontwerptaal.** Van de 562 vindplaatsen van ontwerpschuld die CI telt,
  zitten er 517 in `src/components/customer-portal` (92 procent). Van de
  42 bestanden gebruikt er één iets uit het ontwerpsysteem.
- **De dagtabs zijn een symptoom van een breder patroon:** het portaal
  toont één dag tegelijk, zonder weekdag, op een telefoon zonder datum, met
  een teller die niets zegt over wat er nog moet gebeuren. Het voorstel is
  één doorlopende tijdlijn met dagkoppen en een vaste dagbalk die per dag
  laat zien wat open staat. Dat is hetzelfde model als de
  deelnemersweergave, het Word-document en de referentiepagina.
- **De grootste bruikbaarheidsproblemen zijn geen kleur maar structuur:**
  twee aparte weergaven voor desktop en mobiel (1660 regels, 90 procent
  dubbel, met verschillende functies), status in vijf vormen boven de
  inhoud, knoppen die naar een anker op een andere tab scrollen en dus
  niets doen, een mobiele onderdeelkaart waarin de titel onder de knop
  "Details en aanpassen" valt.
- **Voorstel in vijf fasen, ongeveer 9 bouwdagen:** directe fouten,
  fundament, het programma met de nieuwe dagweergave, de overige
  tabbladen en de deelnemersweergave, borging. Elke fase is apart te
  beoordelen op een preview.
- **Acht besluiten gevraagd**, de belangrijkste: tijdlijn met dagbalk in
  plaats van tabs, één responsieve weergave, en of het opslaan zichtbaar
  in één keer blijft of per onderdeel direct gaat.

## Hoe ik dit heb onderzocht

- Code-analyse van het klantportaal (`src/pages/CustomerProgram.tsx`,
  `src/pages/ParticipantProgram.tsx`, `src/hooks/useCustomerProgram.ts`
  en de 40 componenten in `src/components/customer-portal`, samen ruim
  15.000 regels). Tellingen met de regels van
  `scripts/check-design-debt.ts`. Het partnerportaal (ruim 18.000 regels)
  is op dezelfde manier geïnventariseerd; zie de bijlage.
- Productiebuild van de branch lokaal gedraaid en met Playwright
  schermafbeeldingen gemaakt van het klantportaal met echte programma's
  (een driedaags programma met logies, een tweedaagse offerte, en het
  tweedaagse programma uit de vraag), op desktop (1280px) en telefoon
  (390px): overzicht, logies, programma per dag, praktisch, facturatie,
  akkoord en de deelnemersweergave. Schrijfacties waren geblokkeerd; het
  portaal schrijft bij openen niets.
- Jouw schermafbeelding (BV-2606-0004, "Scherp in veiligheid", 30
  personen, 5 en 6 november) als uitgangspunt voor de dagtabs.

Wat ik niet kon: het tablet-formaat (768 tot 1023px) in de praktijk zien,
en meten hoe klanten het portaal nu gebruiken (GA4 meet het portaal niet).

## Waar het nu staat

| | Klantportaal |
|---|---|
| Oppervlak (`SurfaceTheme`) | `public`: oranje actiekleur, zoals de site |
| Ontwerpschuld (regels van CI) | 517 vindplaatsen, 92 procent van het totaal |
| Waarvan losse paletkleuren | 428 (amber 209, groen 86, blauw 72, rood 37) |
| Eigen eyebrows (uppercase tracking) | 42 |
| Bestanden die het ontwerpsysteem gebruiken | 1 (`AddActivitySheet`, voor de sheet) |
| `FormField` | 0 keer, losse `Label` en `Input` |
| `Notice` | 0 keer, 69 gekleurde vlakken |
| `EmptyState` / `LoadingState` | 0 keer |
| Zwevende laag | chat `fixed` op `z-50` buiten `FloatingStack`, botst met de opslaanbalk |
| Visuele regressietest | nee |

Het ontwerpsysteem zelf is klaar voor het portaal: `Pill`, `Notice`,
`FormField`, `Stepper`, `ResponsiveSheetContent`, `FloatingStack`,
`EmptyState`, `LoadingState`, `FactList` en `SectionHeader` dekken wat het
portaal nodig heeft. Twee dingen ontbreken: een kop voor een
portaalpagina (titel, feiten, één status) en een tabbalk op de tokens.
Die twee komen in fase 1.

Eén tokenprobleem raakt alles: `--secondary` is gelijk aan `--primary`
(`src/index.css`, regel 57 en 60). Daardoor zien `Badge` `default` en
`secondary` er hetzelfde uit, donkerblauw, en is "secundair" nergens
zichtbaar secundair. Dat is in fase 1 een kleine, maar sitebrede
correctie die eerst op `/ontwerp` en in de visuele test moet worden
bekeken.

## Bevindingen klantportaal

### 1. Opbouw en navigatie

Het portaal heeft zes tabbladen (Overzicht, Logies, Programma,
Praktisch, Facturatie, Akkoord) in `ProgramNavigation`, een kop per
tabblad (`TabHeader` met titel, intro en feiten), en rechts een zijbalk
met de voortgang, de heffingen, twee advertenties van horecapartners en de
knoppen Vernieuwen en Annuleren. Een meerdaags programma opent altijd op
Overzicht (de "splash"), een eendaags programma direct op Programma.

- **Twee weergaven, één scherm.** `DesktopProgramView` (759 regels) en
  `MobileProgramView` (901 regels) zijn twee kopieën van dezelfde opbouw,
  gekozen op schermbreedte (`useIsMobile`, grens 768px). Een gesorteerde
  vergelijking laat 117 verschillende regels zien op 1660. De verschillen
  zijn wel functioneel: alleen desktop heeft de tijdkolom, de
  bulkgoedkeuring en de zijbalk; alleen mobiel heeft de plakkende
  statusbalk, de ingeklapte stepper, Programma Details, Geschiedenis,
  Annuleren en Contact. Tussen 768 en 1023px staat op desktop een lege
  kolom van 320px en ontbreken stepper en Annuleren.
- **Status in vijf vormen boven de inhoud.** Op het tabblad Programma
  staan voor het eerste onderdeel: de tabbalk met badges, de kop met pill
  "Alles goedgekeurd", de kaart "Uw voorstel" met vier feiten en de pill
  "Voorstel goedgekeurd", een blauwe melding "Aanvragen verstuurd naar
  aanbieders", en in de zijbalk een percentage (14 of 71 procent) met
  drie stappenlijsten. Op een telefoon komt de voortgang zelfs vóór het
  voorstel en vult hij een heel scherm.
- **Het percentage zegt weinig.** `ProgramStepper` deelt gedane stappen
  door het totaal van zeven. "Aanvraag ingediend" telt als gedaan zodra er
  een logiesaanvraag is, dus 14 procent betekent meestal dat de klant nog
  niets heeft gedaan. Vijf van zes goedgekeurde onderdelen tellen als nul.
  Mobiel staat er een tweede teller naast (x/4).
- **Knoppen die niets doen.** "Logies" en "Goedkeuren" in de stepper
  scrollen naar een anker op een ander tabblad
  (`DesktopProgramView`, regel 264 tot 286) en doen daar niets;
  `ActionRequiredCard` heeft dezelfde knoppen. De tekst op Overzicht zegt
  "Klik op een stap om er direct heen te gaan", maar de stappen zijn geen
  links.
- **Verborgen tabbladen en een vastgelopen weergave.** "Vandaag" en
  "Kaart" bestaan in de navigatie maar verschijnen nooit, omdat de
  navigatie in de evenementmodus verdwijnt. Wie terugkomt uit de
  deelnemersweergave blijft op "today" staan en ziet de Vandaag-weergave
  zonder actieve tab.
- **Zwevende laag.** De chatknop staat `fixed bottom-4 right-4 z-50`
  buiten `FloatingStack` en valt op desktop over de zijbalk
  ("Voorwaarden ondertekenen" in alle schermafbeeldingen); op een
  telefoon botst hij met de opslaanbalk. Mobiel hebben de statusbalk en
  de tabbalk allebei `sticky top-0 z-40`.

### 2. De dagweergave

`DayTabs` (`src/components/configurator/DayTabs.tsx`, 75 regels; alleen de
twee portaalweergaven gebruiken hem) zet shadcn `Tabs` in met per dag een
trigger "Dag 1", de datum "(5 nov.)" alleen vanaf `sm`, en een teller in
`bg-primary/10`.

Waarom hij niet duidelijk is:

- **Je ziet één dag.** De andere dagen zijn alleen een teller. Of op dag
  2 nog iets op jouw goedkeuring wacht, zie je niet; `ActionRequiredCard`
  noemt namen zonder dag.
- **Geen weekdag, mobiel geen datum.** "Dag 1" vraagt rekenwerk; klanten
  denken in "donderdag".
- **De actieve tab is nauwelijks anders:** wit op lichtgrijs
  (`data-[state=active]:bg-background` op `bg-muted/50`). Vanaf vier
  dagen staan de tabs op een telefoon in twee rijen. De balk plakt niet.
- **De teller telt verkeerd en zegt niets.** Hij telt ook onderdelen die
  Bureau Vlieland zelf regelt en wijzigingen die nog niet zijn verstuurd,
  en hij heeft geen label (is het aantal, of aantal open?).
- **Toevoegen is impliciet.** De knop in de kaartkop voegt toe aan de
  actieve dag, de sheet noemt de dag niet, het onderdeel komt achteraan
  zonder tijd en zonder melding, en de beschikbaarheidscontrole staat uit
  omdat de datum niet wordt meegegeven.
- **Verplaatsen laat het onderdeel verdwijnen.** De keuze "Dag" in de
  details verplaatst het onderdeel naar een andere tab, zonder melding;
  het is dan "weg".
- **De dag start altijd op dag 1**, ook tijdens het verblijf.
- **Tijd wijzigen is onvoorspelbaar.** De knop bestaat alleen bij status
  "niet beschikbaar" of na klantakkoord; wachtende onderdelen hebben een
  potlood zonder tekst; "Andere tijd" verschijnt nooit omdat
  `isQuoteMode` vast op `true` staat, terwijl de uitleg ernaar verwijst.

Ter vergelijking: de deelnemersweergave toont alle dagen onder elkaar met
een dagkop en een "Dag 1 / 2"-pager, de referentiepagina
(`ReferenceTimeline`) toont de dagen onder elkaar, en het Word-document
ook. Alleen het klantportaal verstopt de dagen.

### 3. Statussen, kleuren en woorden

- Een onderdeel dat op de aanbieder wacht is soms blauw ("Wacht op
  aanbieder") en soms amber ("Wacht op bevestiging aanbieder");
  `Pill` definieert blauw juist als "wacht op iemand anders" en amber als
  "jij bent aan zet".
- "Geregeld door Bureau Vlieland" is groen, alsof de klant iets heeft
  afgerond. Een prijswijziging krijgt twee pills. De prijs wordt groen
  zodra de ruwe status niet meer "wachtend" is, en het woord "voorlopig"
  volgt een andere regel dan `PriceSummaryCard`.
- Logies heet op het ene scherm "Gekozen", op het andere "Bevestigd",
  "vastgelegd" of een vinkje; "In behandeling" is amber in de
  overzichtskaart en neutraal in de tabkop.
- Akkoord: "Ondertekend" en "Nog open" zijn allebei donkerblauw.
  Goedkeuren, akkoord, ondertekenen en bevestigen lopen door elkaar.
- Facturatie: "Nog invullen" is rood, "Incompleet" amber; dat is geen
  blokkade maar een vraag.
- De uitleg bij een status staat alleen in een tooltip; op een
  aanraakscherm is die er niet.
- Knopkleuren: oranje (Toevoegen, Programma beoordelen, Open in Google
  Maps), groen (goedkeuren) en amber staan naast elkaar. Op Logies is de
  enige oranje knop "Open in Google Maps", terwijl de echte acties
  (kamers aanpassen, datum wijzigen) grijs zijn.

### 4. Formulieren en dialogen

- Alle dialogen zijn gecentreerde `Dialog`s, ook op een telefoon
  (facturatiegegevens met negen velden, details, gasten, tegenvoorstel,
  delen). Alleen de twee sheets gebruiken `ResponsiveSheetContent`.
- Velden zijn `Label` plus `Input` plus een losse rode regel; geen
  `FormField`, geen `aria-invalid`, labels zonder `htmlFor` in de
  onderdeelkaart.
- Validatie pas bij opslaan. Postcode en btw-nummer accepteren alleen de
  Nederlandse vorm: een Belgische of Duitse klant kan zijn
  facturatiegegevens niet opslaan en dus niet ondertekenen.
- Een mislukte toevoeging geeft geen melding (fout alleen in de console).
  Laadteksten wisselen: "Bezig...", "Verwerken…".

### 5. Mobiel

Uit de schermafbeeldingen op 390px:

- In de onderdeelkaart valt de titel ("Overtocht Harlingen → Vlieland")
  onder de knop "Details en aanpassen"; de kolommen zijn zo smal dat
  "1,5 uur" en adressen per woord afbreken en de actieknoppen onder
  elkaar komen.
- De kop "Uw voorstel" breekt midden in het woord ("Uw voors / tel"),
  en de pills "#BV-2606-0013" en "#LOG-2606-0003" breken per teken.
- De kaartkop van Programma (titel, Word-knop, agenda-icoon, Toevoegen,
  teller) past niet op één regel.
- De tabbalk scrolt horizontaal zonder dat je ziet dat er meer tabs
  zijn (Praktisch, Facturatie en Akkoord staan buiten beeld).
- De voortgang staat vóór het voorstel en vult een heel scherm; de
  verticale stepper klapt niet in.
- In de accordeontrigger zitten geneste knoppen; de onderbalk in de
  deelnemersweergave stuurt een toestand aan die niet wordt gelezen.

### 6. Toon en copy

- Je-vorm in klantteksten (`CustomerProgram` regel 200, 219 en 238,
  `ChangeConfirmationDialog`, `CancelRequestDialog`, `BillingDetailsCard`,
  `AcceptTermsCard`) naast de u-vorm; de deelnemersweergave zegt "Meld je
  aan".
- De aanhef op Overzicht wordt "Welkom, Mevrouw. M. Swagerman": een punt
  na de aanspreekvorm en een initiaal in plaats van een naam.
- Engels: "refresh", "handling fee", "Outdoor". Zes uitroeptekens.
  46 regels met een gedachtestreepje in de interface.
- Praktisch belooft een pdf, de knop levert een Word-bestand.
- De beta-banner "Nieuw! Vernieuwde klantomgeving" staat boven elk scherm
  en dekt op een telefoon een derde van het eerste beeld.

### 7. Wat goed is en blijft

- Eén bron voor de status van een onderdeel (`src/lib/itemStatus.ts`,
  al op de tonen van `Pill`) en de centrale tabkoppen in
  `tabHeaderConfig.ts`.
- Verwijderen met "ongedaan maken", de waarschuwing bij wegklikken met
  wijzigingen, en het overzicht per aanbieder vóór versturen.
- Ondertekenen onder voorbehoud, met uitleg welke onderdelen nog open
  staan.
- De deelnemersweergave met "Vandaag", route en contact, en de aparte
  deelnemerscode zonder facturatie.
- Logiesoffertes met foto's, de prijstransparantie met btw per onderdeel,
  toetsenbordnavigatie in de tabbalk, en aanraakdoelen van 44px waar
  `coarse:` al wordt gebruikt.

## Richting: zes regels voor het portaal

1. **Eén schaal, één kop, één status.** Elk portaalscherm begint met
   dezelfde `PortalHead`: titel, één regel feiten (datum, personen,
   kenmerk) en hoogstens één status-`Pill`. Geen tweede kop, geen
   hero-kaart met vier feiten, geen percentage.
2. **De volgende stap staat op één plek.** Per scherm één `Notice` met
   wat er nu van de klant wordt verwacht, en één primaire knop
   in de actiekleur. Alle andere knoppen `outline`, `ghost` of `link`.
3. **Status in woorden van de lezer, op vier tonen.** `info` is "wacht op
   een ander", `warning` is "u bent aan zet", `success` is "rond",
   `danger` is "geblokkeerd". Eén woordenlijst per soort (onderdeel,
   logies, akkoord, factuur) in `src/lib`, zodat ook de admin- en
   partnerkant er later op kunnen aansluiten.
4. **Tijd is de ruggengraat.** Een programma is een tijdlijn met
   dagkoppen; dagen worden nooit verstopt. Klant en deelnemer zien
   hetzelfde model.
5. **Eén weergave die meebuigt.** Geen aparte desktop- en mobielkopieën
   meer: één component met breekpunten, dezelfde functies op elk formaat,
   aanraakdoelen van 44px, sheets van onderen op een telefoon, alles wat
   zweeft in `FloatingStack`.
6. **Formulieren op `FormField`,** fouten inline en bij het veld, laden en
   leeg via `LoadingState` en `EmptyState`, bedragen via één formatter,
   de u-vorm overal, ook in de deelnemersweergave.

## Voorstel klantportaal

### De dagweergave

Voorstel A, aanbevolen: **één doorlopende tijdlijn met dagkoppen en een
vaste dagbalk.**

- **Dagbalk**, direct onder de tabbalk en plakkend bij scrollen: per dag
  een knop met weekdag en datum ("do 5 nov"), het aantal onderdelen en
  één status: "1 open" (warning, de klant moet nog iets goedkeuren),
  "wacht op 2" (info, de aanbieder is aan zet) of een vinkje (success).
  Klik scrolt naar de dag; bij scrollen licht de zichtbare dag op. Op een
  telefoon scrolt de balk horizontaal met vaste stappen, datum altijd in
  beeld, en past hij ook bij vijf dagen.
- **Dagkop** in de tijdlijn: "Donderdag 5 november · dag 1 van 2 · 4
  onderdelen · dagtotaal €1.418,50", met rechts de knop "Toevoegen aan
  deze dag" (`outline`). De sheet voor toevoegen toont de dag in de kop en
  geeft de datum mee, zodat de beschikbaarheidscontrole weer werkt. Na
  toevoegen: een melding en het nieuwe onderdeel licht kort op.
- **Onderdeelkaart** (`ProgramItemCard`, vervangt `CustomerProgramItem`):
  tijd links op desktop en bovenaan op een telefoon, met het soort tijd
  erbij ("voorstel", "bevestigd"); titel die altijd doorloopt; één
  status-`Pill`; één regel aanbieder en plek; prijs via
  `formatBlockPrice`; de uitleg ingeklapt onder "Details". Acties als
  één rij: "Goedkeuren" primair alleen als dat gevraagd wordt, verder
  "Tijd", "Naar andere dag", "Agenda", "Verwijderen" als `ghost`.
  Verplaatsen laat het onderdeel in beeld: het schuift naar de andere dag
  en licht op.
- **Tijd wijzigen** als één sheet die gewenste, voorgestelde en
  bevestigde tijd naast elkaar toont, met de regels in gewone taal (wat
  gaat direct naar de aanbieder, wat eerst naar Bureau Vlieland).
- **Dagtotalen** in de dagvoet, het totaal in de kostenspecificatie.
- **De dag van vandaag** staat tijdens het verblijf bovenaan de dagbalk
  en de tijdlijn opent daar.

Waarom dit boven betere tabs gaat: de klant beoordeelt een voorstel als
geheel, twee tot vier dagen met drie tot vijf onderdelen passen op één
pagina, de referentiepagina, het Word-document en de deelnemersweergave
werken al zo, en open punten zijn nooit verstopt. `DayTabs` wordt
daarmee overbodig (hij wordt nergens anders gebruikt).

Voorstel B, als je de tabs wilt houden: dezelfde dagbalk, maar hij
schakelt in plaats van scrolt, met weekdag, datum en status, vorige en
volgende, plakkend, en een knop "Alle dagen" die de doorlopende tijdlijn
toont. Het bouwwerk is hetzelfde; alleen het standaardgedrag verschilt.

### Per scherm

- **Schil.** `PortalHead` op `Container`; de tabbalk (`PortalTabs`, uit
  `ProgramNavigation`) op de tokens met `Pill` als badge en een
  zichtbare overloop op een telefoon (vervaging aan de rand of een
  "meer"-knop); de beta-banner wordt een `Notice` en verdwijnt na fase 3;
  chat en opslaanbalk in `FloatingStack` met `useFloatingBar`.
- **Voortgang.** Het percentage en de drie stappenlijsten maken plaats
  voor één `Stepper`-band met drie stappen (Logies, Programma, Akkoord)
  en één `Notice` "Volgende stap" met een werkende knop (eerst naar het
  tabblad, dan naar de plek). De zijbalk houdt heffingen en contact; de
  twee horecakaarten gaan naar Praktisch onder "Tips op het eiland" als
  `LinkCard` (zie besluiten).
- **Overzicht.** Blijft als startpunt voor een meerdaags programma, maar
  korter: fotomozaïek, welkom met een goede aanhef ("Welkom, mevrouw
  Swagerman"), de `Stepper`, één primaire knop "Programma beoordelen",
  delen als `outline`.
- **Programma.** Zie de dagweergave. De bulkgoedkeuring en de
  geschiedenis op elk formaat. Het opslaan blijft in één keer, maar wordt
  zichtbaar: een vaste balk "3 wijzigingen nog niet verstuurd" met
  "Versturen" en "Ongedaan maken" (zie besluiten).
- **Logies.** Eén kaart in plaats van kaart-in-kaart-in-kaart; één
  status ("Gekozen, wacht op bevestiging" of "Bevestigd"); de echte acties
  (kamers en verzorging, datum en aantal) als knoppen bij de kaart, route
  en kaart als `link`; "Open in Google Maps" niet meer in de actiekleur;
  foto's uit het partnerprofiel of een `EmptyState`.
- **Praktisch.** Gastenlijst, dieet en kamerindeling als `FormField`s;
  documenten met `EmptyState`; "Programma downloaden" belooft wat de knop
  geeft (Word en agenda).
- **Facturatie.** De dialoog wordt een `ResponsiveSheetContent` met
  `FormField`s, een landveld en validatie per land; de
  kostenspecificatie houdt haar opbouw, met "voorlopig" uit dezelfde
  bron als de onderdeelkaart.
- **Akkoord.** Eén `Notice` met de stand, de voorwaarden, de knop
  "Ondertekenen" (ook onder voorbehoud, met de open onderdelen erbij), en
  na ondertekenen een `SuccessScreen` in de pagina.
- **Deelnemersweergave.** Dezelfde dagbalk en onderdeelkaart (zonder
  acties), u-vorm, en de onderbalk op een telefoon die echt schakelt.

### Woordenlijst klant (voorstel)

| Soort | Woord | Toon |
|---|---|---|
| Onderdeel, aanbieder aan zet | Wacht op aanbieder | info |
| Onderdeel, klant aan zet | Uw goedkeuring gevraagd | warning |
| Onderdeel, nieuwe tijd of prijs voorgesteld | Voorstel: andere tijd, Voorstel: andere prijs | warning |
| Onderdeel rond | Bevestigd | success |
| Onderdeel door Bureau Vlieland geregeld | Geregeld | success |
| Onderdeel niet mogelijk | Niet beschikbaar | danger |
| Prijs nog niet definitief | voorlopig (tekst bij de prijs) | neutraal |
| Logies | Aangevraagd, Kies uw logies, Gekozen (wacht op bevestiging), Bevestigd | info, warning, info, success |
| Akkoord | Nog te ondertekenen, Ondertekend, Ondertekend onder voorbehoud | warning, success, info |
| Facturatiegegevens | Aanvullen, Compleet | warning, success |

## Fasen

Inschattingen zijn bouwdagen, exclusief jouw beoordeling. Elke fase is
een eigen PR met preview. De previews praten met de productiedatabase;
je kijkt dus met de link van een echt programma, of met een
demoprogramma (zie besluiten).

**Fase 0: directe fouten (1 dag).** Zonder ontwerpkeuze: de knoppen in
stepper en `ActionRequiredCard` die naar een anker op een ander tabblad
scrollen; de vastgelopen "today"-weergave na de deelnemersweergave; de
chat in `FloatingStack` zodat hij nergens overheen valt; de aanhef
"Mevrouw."; de pdf-belofte; je-vorm, uitroeptekens en Engels in de
klantteksten; de titel die onder "Details en aanpassen" valt en de
woordafbreking in de onderdeelkaart en de kop op een telefoon.

*Gebouwd op 1 oktober, eigen PR.* Daarbij ook: de chatknop wijkt zolang
de opslaanbalk in beeld is en staat boven de onderste navigatie van de
deelnemersweergave; de werkbalk van het programma (Word-document, agenda,
toevoegen) staat op een telefoon onder de kop in plaats van erin; de
offertestatus staat onder de titel van het overzicht, zodat de titel
niet meer afbreekt; de deellink `/programma/<code>` geeft `?eventmode=on`
en `?chat=open` door aan het portaal. Bewust niet in fase 0: de 22
gedachtestreepjes in andere klantteksten (fase 3, copy) en de
categorienaam "Outdoor & Sport", die uit de bouwstenen komt en op de
hele site staat.

**Fase 1: fundament voor het portaal (2 dagen).** `PortalHead` en
`PortalTabs` in `src/components/system`; `--secondary` los van
`--primary` (controle op `/ontwerp` en in de visuele test); de
woordenlijsten voor klantstatussen in `itemStatus.ts` en
`tabHeaderConfig.ts`; de hele `customer-portal`-map op `Pill`, `Notice`,
`Button` zonder overrides, `EmptyState` en `LoadingState` (schuld van 517
naar onder de 100); `useFloatingBar` voor de opslaanbalk; de baseline
verlaagd.

**Fase 2: het programma (3 dagen).** Eén responsieve `ProgramView` in
plaats van de twee kopieën, met dezelfde functies op elk formaat; de
dagbalk, de doorlopende tijdlijn met dagkoppen en toevoegen per dag;
`ProgramItemCard`; de tijdsheet; verplaatsen zichtbaar; de zichtbare
opslaanbalk; de `Stepper`-band met de volgende stap in plaats van het
percentage. `DayTabs` weg.

**Fase 3: de overige tabbladen en de deelnemers (2 dagen).** Overzicht,
Logies, Praktisch, Facturatie (met landveld) en Akkoord op de nieuwe
schil; de deelnemersweergave op dezelfde dagbalk en kaart; de beta-banner
weg.

**Fase 4: borging (1 dag).** De baseline per bestand en
`DESIGN_DEBT_MAX` omlaag; de visuele test met een vaste opname van één
programma (overzicht, programma, logies, akkoord, deelnemersweergave) op
desktop en telefoon; een paragraaf "Klantportaal" in
`docs/design-systeem.md` met `PortalHead`, `PortalTabs`, de dagbalk, de
onderdeelkaart en de woordenlijst.

Samen ongeveer 9 bouwdagen. Fase 0 en 1 kunnen in één week; fase 2 is de
kern en verdient een eigen beoordeling op desktop en telefoon.

## Besluiten gevraagd

1. **Dagweergave:** doorlopende tijdlijn met dagbalk (A, aanbevolen) of
   verbeterde tabs met "Alle dagen" (B)?
2. **Eén responsieve weergave** in plaats van de twee kopieën, met
   dezelfde functies op desktop en telefoon (aanbevolen)?
3. **Opslaan:** het huidige model (wijzigingen verzamelen en in één keer
   versturen) zichtbaar maken met een balk (aanbevolen, geen wijziging in
   de functies), of per onderdeel direct opslaan (eenvoudiger voor de
   klant, raakt `update-customer-program` en de meldingen naar
   aanbieders)?
4. **Actiekleur:** het klantportaal blijft oranje, zoals de site (het
   publieke oppervlak). Akkoord?
5. **Voortgang:** het percentage verdwijnt en wordt een stepper met de
   volgende stap (aanbevolen)?
6. **De twee horecakaarten** (Trattoria Oliva, Café Boven) in de zijbalk:
   naar Praktisch onder "Tips op het eiland" (aanbevolen), laten staan,
   of weg?
7. **Een demoprogramma** voor previews: een programma op jouw naam met
   drie dagen, logies en een open goedkeuring, dat alleen voor beoordelen
   dient. Dan hoef je geen klantlink te gebruiken.
8. **De beta-banner** verdwijnt na fase 3. Akkoord?

## Besluiten (genomen door Erwin, 1 oktober 2026)

Erwin heeft alle aanbevelingen overgenomen:

1. Dagweergave: voorstel A, één doorlopende tijdlijn met dagkoppen en een
   vaste dagbalk. `DayTabs` verdwijnt.
2. Eén responsieve weergave in plaats van de twee kopieën, met dezelfde
   functies op desktop en telefoon.
3. Opslaan: het huidige model blijft (wijzigingen verzamelen en in één
   keer versturen), maar wordt zichtbaar met een vaste balk.
4. Actiekleur: het klantportaal blijft oranje, zoals de site.
5. Voortgang: het percentage verdwijnt; een stepper met de volgende stap.
6. De twee horecakaarten gaan naar Praktisch onder "Tips op het eiland".
7. Er komt een demoprogramma voor previews, op naam van Erwin, met drie
   dagen, logies en een open goedkeuring.
8. De beta-banner verdwijnt na fase 3.

Volgorde: fase 0 tot en met 4 zoals hierboven, elk als eigen PR.

## Meetpunten

- Ontwerpschuld in `src/components/customer-portal`: van 517 naar onder
  de 50, en het plafond `DESIGN_DEBT_MAX` mee omlaag.
- Mails aan hallo@ over het portaal ("ergens tegenaan lopen"), vóór en na
  fase 3.
- Doorlooptijd van voorstel naar akkoord: `quote_sent_at` tot
  `terms_accepted_at` per programma, vóór en na fase 3.
- Aandeel onderdelen dat de klant zelf in het portaal goedkeurt (versus
  door Erwin na een telefoontje).

## Wat dit plan bewust niet doet

- Geen nieuwe functies in de portalen (geen chat tussen klant en
  aanbieder, geen betalingen, geen nieuwe rollen). Het gaat om dezelfde
  functies in één taal, met de fouten eruit.
- Het admin- en partnerportaal blijven buiten dit plan; ze erven de
  tokens al. De bevindingen over het partnerportaal staan in de bijlage,
  zodat ze niet verloren gaan.
- De e-mails naar klanten en partners veranderen niet, behalve waar een
  statuswoord in een mail hetzelfde moet zijn als in het portaal.
- Geen herontwerp van de evenementmodus ("Vandaag", kaart); die krijgt
  alleen de nieuwe kaart en dagbalk.

## Bijlage: tellingen

| Telling | Klantportaal |
|---|---|
| Regels code | ruim 15.000 (42 bestanden) |
| Ontwerpschuld (regels CI) | 517 |
| Losse paletkleuren | 428 |
| `text-white`, `bg-white`, `black` | 16 |
| `rounded-xl` en groter | 8 |
| Tailwind-schaduwen | 16 |
| Eigen eyebrows | 42 |
| `Badge` met eigen kleur of klasse | 37 |
| Gekleurde meldingsvlakken | 69 |
| Knoppen met overrides | ca. 34 |
| Dubbele regels desktop en mobiel | 1543 van 1660 |
| Je-vorm naast u-vorm | 7 bestanden |
| Gedachtestreepjes in de interface | 46 regels |
| Uitroeptekens | 6 |

## Bijlage: het partnerportaal, voor later

Hetzelfde onderzoek is op het partnerportaal gedaan (16 pagina's en 40
componenten, ruim 18.000 regels, alleen uit de code; een partnerlogin heb
ik niet). Het valt buiten dit plan, maar de bevindingen en de richting
staan hier zodat ze niet verloren gaan. Met de regels van CI komt het
partnerportaal op 383 vindplaatsen ontwerpschuld (buiten de telling), en
de actiekleur is daar blauw (`portal`).


### Opbouw

Zestien routes achter `PartnerLayout`: een inklapbare zijbalk met de
groepen Werk (Werkbank, Projecten, Logies, Kamersoorten, Logies-extra's),
Administratie (Facturatie) en Account, gefilterd op partnertype. Werkbank
en Projecten zijn één route met `?tab`, dus je navigeert er dubbel naartoe.
Logies staat op twee plekken: als rij in werkbank en projecten (met de
projectpagina) en als kaart met sheet onder "Logies". Breedte en
uitlijning verschillen per pagina (geen maximum, 3xl, 4xl, 6xl of 7xl).
Vijf pagina's hebben geen paginatitel.

### Afwijkingen van het systeem

346 losse paletkleuren (koplopers `PartnerItemSheet` 80,
`PartnerProjectItemRow` 39, `PartnerAccommodationRequestCard` 32), 33
eigen eyebrows, 41 badges waarvan 28 met eigen klassen, 41 gekleurde
meldingsvlakken, 69 `Card`s plus eigen kaartjes, KPI's met iconen in
gekleurde cirkels, 15 knoppen met overrides, 62 koppen met een eigen
klasse. Nauwelijks radius- en schaduwschuld: de migratie gaat hier
vooral over kleur, patronen en copy.

### Statussen

- Onderdelen zijn goed geregeld: `ItemDisplayStatusBadge` op
  `itemStatus.ts`, met de tooltip "Aan zet". Dit is de mal voor de rest.
- Daarnaast lopen drie andere kaarten: de planning gebruikt de ruwe
  status met eigen kleuren en emoji, de werkbank eigen icoonkleuren per
  groep, de projectstatus (`projectStatus.ts`) zet "Akkoord ontvangen" in
  amber en "AV getekend" is jargon.
- Logiesoffertes hebben drie woordenlijsten voor hetzelfde veld: de
  kaart (Te beantwoorden, Offerte verstuurd, Geaccepteerd, Afgewezen), de
  projectpagina (Verstuurd naar klant, Gekozen door klant, Door u
  afgewezen) en de tabs (Actie nodig, In behandeling, Akkoord,
  Afgerond). "Verlopen" is rood terwijl verlengen kan.
- Facturen: "Facturatie registreren" naast "Factuur registreren".

### Structuur en acties

- Onderdelen staan in aanmaakvolgorde, zonder dagindeling
  (`get-partner-dashboard`, `PartnerProject` regel 145): dag 3 kan boven
  dag 1 staan. Elke rij toont een eigen datum; de sheet toont de datum twee
  keer.
- Twee reactieflows met een andere uitkomst: de rij bevestigt de
  klanttijd, de sheet stuurt bij een tegenvoorstel vermoedelijk de oude
  gewenste tijd mee.
- "Terug" gaat altijd naar de werkbank, zonder tab, zoekterm of archief.
- Instellingen heeft vijf opslaanknoppen die hetzelfde opslaan.
- Dode link: "Ga naar facturen" wijst naar `/partner/financieel`, de
  route heet `/partner/facturatie`; de tabs daar lezen de URL niet.
- Een logiesfactuur kan geen pdf krijgen, terwijl de banner "pdf
  ontbreekt" blijft tellen; logies onder "Nog te factureren" heeft geen
  actie.
- Prijs excl. of incl. btw is tegenstrijdig tussen handleiding en
  formulieren; bedragen verschijnen als "€12.50" naast "€12,50".

### Formulieren en mobiel

- 160 losse labels, 25 losse rode foutregels, validatie op vier manieren
  (inline, alleen een toast, een uitgeschakelde knop zonder uitleg, zod
  bij login).
- Zes sheets met breedtes `md`, `lg` en `xl`, drie zonder volle breedte
  op een telefoon, geen `ResponsiveSheetContent`, geen vaste voet,
  wisselende knopvolgorde.
- De projecttabel heeft acht kolommen met vaste breedtes en scrolt
  horizontaal; de kopbalk is `lg:hidden` maar de zijbalk wordt pas onder
  768px een lade, dus tussen 768 en 1023px staan ze allebei in beeld;
  menuknop van 28px met de tekst "Toggle Sidebar"; de verwijderknop van
  foto's verschijnt alleen bij hover.

### Toon

Circa 150 regels u-vorm en 40 regels je-vorm, vaak op hetzelfde scherm;
"Partner Portal", "YTD Omzet", "Export CSV", "Items"; "Failed" kan in een
toast belanden; zeven uitroeptekens; 17 toasts met als titel alleen
"Fout"; aanbod, activiteiten, bouwstenen en blokken door elkaar.

### Wat goed is en blijft

De werkbank als takenlijst per fase met een hint per rij, filters in de
URL, projecten in tijdsvakken met markering van verstreken datums, de
zijbalk per partnertype met zichtbare impersonatie, uitleg in de flow bij
concept en annulering, één toastsysteem.

### Richting voor later

Als het partnerportaal aan de beurt is, in dezelfde taal als het
klantportaal: schil op de tokens met de blauwe actiekleur, één breedte,
paginatitels; vier woordenlijsten naast de bestaande voor onderdelen;
de projectpagina met dezelfde dagindeling als de klant; één
factuurdialoog voor onderdelen en logies; `FormField` en
`ResponsiveSheetContent`; een kaartlijst onder `md`; één aanspreekvorm.
Geschat 6 bouwdagen plus 1 dag borging. Twee fouten kunnen los van dit
alles: de dode link "Ga naar facturen" naar `/partner/financieel` (de
route heet `/partner/facturatie`) en de menuknop "Toggle Sidebar".
