# Plan: situatie van de groep, vervoerskeuze en beschikbaarheid in de programma-wizard

Status: besluiten genomen en fase 0 t/m 4 gebouwd op 16 september 2026 (één
pull request). Te testen via de Netlify-preview; de dev-server is in deze
omgeving niet gedraaid. Zie "Gebouwd" onderaan voor wat er precies staat en
wat bewust niet.

## Waarom

Drie vragen van Erwin over de stap "Vervoer & fietsen" in
`/programma-samenstellen`:

1. Watertaxi's en andere charters zijn ook een optie, maar de wizard biedt
   alleen "Ja, boot heen & terug" of "Nee, wij regelen zelf".
2. "Nee, wij regelen zelf" dekt twee heel verschillende situaties: een groep
   die die dag overkomt maar de boot zelf boekt, en een groep die al op
   Vlieland zit en alleen een dag(deel) programma wil.
3. Het voorbeeldprogramma komt pas ná boot en fietsen in beeld. Moet dat niet
   eerder? En houden die voorbeeldprogramma's rekening met de beschikbaarheid
   van partners, die zelf kunnen aangeven dat ze gesloten zijn?

## Wat er nu is (gemeten op 16 september)

### De wizard

Zes stappen: Basisgegevens → Logies → Vervoer & fietsen → Programma →
Gegevens → Versturen (`CheckoutStepIndicator.tsx`, `ProgrammaSamenstellen.tsx`).

- **Vervoer & fietsen** (`TransportBikesStep.tsx`) kent twee keuzes: boot
  ja/nee en fiets standaard/e-bike/geen. "Nee" doet niets anders dan de twee
  Doeksen-bouwstenen niet toevoegen (`planTransportCartOps` in
  `programWizardCart.ts`). Er wordt geen aankomst- of vertrektijd gevraagd,
  en nergens wordt vastgelegd óf de groep überhaupt overkomt.
- **Alternatieve overtochten bestaan al als gepubliceerde bouwstenen**:
  watertaxi De Bazuin (max 12 personen, heen en terug apart), snelle RIB van
  Zeehonden (8–24), privévaart Regina Andrea (vanaf 30). `CartContext` kent
  ze al (`ALTERNATIVE_CROSSING_BLOCK_IDS`) om een dubbele Doeksen-boot te
  voorkomen. Ze zijn alleen te vinden via "Activiteit toevoegen" in de
  programmastap of via de twee voorbeeldprogramma's die ze bevatten. De
  vervoerstap noemt ze niet.
- **De aanvraag bewaart geen situatie of tijden.** `program_requests` heeft
  geen veld voor "al op Vlieland", aankomst- of vertrektijd; de boot is
  gewoon een cart-item met een afvaarttijd.

### Voorbeeldprogramma's

- 12 gepubliceerd, opgebouwd uit **bouwstenen** (`program_templates` →
  `program_template_items` → `building_blocks`) met dag en voorkeurstijd per
  onderdeel. Dus geen vaste teksten: dat is goed nieuws, alles wat hieronder
  staat kan per bouwsteen beoordeeld worden.
- Ze verschijnen op twee plekken: in de programmastap (banner + zijpaneel in
  `ProgramBuilderView.tsx`, dus pas na Basisgegevens, Logies én Vervoer), en
  vanaf `/voorbeeldprogrammas/:slug` met `?template=`. In dat laatste geval
  slaat de wizard Logies en Vervoer helemaal over, en voegt `loadFromTemplate`
  altijd Doeksen heen/terug plus standaardfietsen toe. Wie via een
  voorbeeldprogramma binnenkomt, krijgt dus nooit de vraag of hij al op het
  eiland is of e-bikes wil.

### Beschikbaarheid van partners

- **Partners kunnen nu al sluitingen doorgeven.** Tabel
  `partner_unavailability` (begindatum, einddatum, reden), in te vullen in
  het partnerportaal (`PartnerUnavailabilityManager.tsx`) en in admin.
  Publiek leesbaar, zonder reden, via de RPC
  `get_public_partner_unavailability` (`usePublicPartnerUnavailability.ts`).
- Die informatie wordt op precies twee plekken getoond: als notitie op
  `/bouwstenen` en op de activiteitpagina. **Niet** in de wizard, niet bij de
  voorbeeldprogramma's, niet in "Activiteit toevoegen" in de programmastap,
  en niet in de AI-suggestie van Erwin (`generate-program-suggestion` krijgt
  alle bouwstenen zonder sluitingen).
- De conflictcontrole (`conflictChecker.ts`) draait pas **ná** het versturen
  en maakt een admin-taak. Dat is het vangnet; de klant heeft dan al een
  programma gezien dat niet kan.
- **Concreet vandaag:** Vlieland Outdoor Center staat gesloten van 16
  september 2026 tot en met 31 maart 2027. Hun bouwstenen (Strandspektakel,
  Powerkiten, Beach Golf, Lasergamen) zitten in 6 van de 12
  voorbeeldprogramma's. Iedereen die nu een datum in oktober kiest, krijgt
  "Eilanddag Compleet" met Strandspektakel voorgesteld. Vlieland Yoga was
  11–16 september gesloten; Strandyoga zit in "Wellness & Natuur".
- **Capaciteit:** 25 van de 49 gepubliceerde bouwstenen hebben een minimum
  en/of maximum. De controle bestaat (`capacityCheck.ts`) maar wordt alleen
  in admin en op de klantpagina gebruikt, niet in de wizard. Voorbeelden die
  nu stil doorgaan: "Vergaderdag+" begint met een watertaxi (max 12) en
  bevat een Luxe Lunchbuffet (min 15); "Exclusieve Eilanddag Regina Andrea"
  vereist 30 personen terwijl de wizard met 20 start.
- **Beschikbaarheid per dag uit MijnActiviteitenplanner** bestaat voor drie
  bouwstenen (Fortuna, wadloop, zeehonden) maar wordt alleen op de klantpagina
  getoond (`MapAvailabilityLine.tsx`), niet in de wizard.
- **Geen** vaste sluitingsdagen per week of seizoen in het datamodel. Het veld
  `seasonal_notes` bestaat, is bij 0 bouwstenen ingevuld en wordt nergens
  gelezen. Voor de wintersluiting van VOC volstaat één datumbereik, dus dit
  is voorlopig geen gemis.

### Losse bevinding: zes voorbeeldprogramma's kunnen niet verstuurd worden

Zes gepubliceerde voorbeeldprogramma's bevatten de niet-gepubliceerde
bouwsteen `vrije-tijd` (Eilandbeleving Compleet, Regina Andrea, Ontspannen
Eilandweekend, Chill Eilanddag, Culinaire Ontdekking, en Vergaderdag+ heeft
`zaalhuur-brouwerij-fortuna`). `loadFromTemplate` zet zo'n onderdeel gewoon
in het programma, de programmastap tekent het niet (`if (!block) return
null`), en bij versturen weigert `CheckoutContactForm` met "Enkele onderdelen
uit uw programma zijn niet meer beschikbaar. Vernieuw de pagina…". De klant
kan het onzichtbare onderdeel niet weghalen. Zelfde patroon als de dode
Borrel-bouwsteen van 11 september, maar dan met een blokkerend gevolg. Dit
staat los van het plan en moet eerst: `loadFromTemplate` moet
niet-gepubliceerde onderdelen overslaan, en de admin-templatepagina moet
waarschuwen bij zo'n onderdeel. Of `vrije-tijd` bewust ongepubliceerd is,
hoor ik graag; als het een echt onderdeel is ("Vrije tijd, 2 uur") kan het
gewoon gepubliceerd worden zonder prijs.

## Advies

### 1. Vraag in stap 1 waar de groep is, niet wie de boot regelt

Eerder stelde ik drie situaties voor. Na het lezen van de code zijn er
**twee** genoeg, omdat het aantal dagen al uit de datumkeuze komt en logies al
een eigen stap is:

- **"Wij komen vanaf de wal"** (één of meer dagen). Daarna: Logies (bij meer
  dan één dag), dan Vervoer.
- **"Wij zijn al op Vlieland"**. Daarna: geen Logies, geen Vervoer, maar een
  korte stap **Startpunt & tijdvak**: naam van de accommodatie of het adres,
  en van–tot (standaard 10:00–17:00). Het programma kan dan een volle dag
  vullen en start bij de accommodatie in plaats van de haven.

De stappenbalk wordt dynamisch: stappen die niet van toepassing zijn staan er
niet in.

### 2. De vervoerstap wordt een keuze uit vier

Alleen bij "vanaf de wal". Vier kaarten, elk met wat het betekent voor deze
groepsgrootte:

- **Veerboot Rederij Doeksen** (standaard). Afvaarttijden zoals nu in de
  programmastap.
- **Watertaxi** (De Bazuin, max 12 per boot; RIB van Zeehonden 8–24). Boven
  de capaciteit toont de kaart direct "voor 20 personen: 2 watertaxi's" of
  verwijst naar de RIB. Niet grijs, wel eerlijk.
- **Privévaart Regina Andrea** (vanaf 30). Onder de 30 personen: zichtbaar
  met "vanaf 30 personen", niet kiesbaar.
- **Wij regelen de overtocht zelf**, met aankomsttijd en vertrektijd. Geen
  kaal "Nee" meer. De optie "geen overtocht nodig" staat hier niet; die is
  in stap 1 al afgevangen.

Technisch: `TransportPreferences.ferryIncluded` wordt `crossing:
"doeksen" | "watertaxi" | "regina" | "eigen"` plus tijden, en
`planTransportCartOps` zet de bijbehorende bouwstenen op dag 0 en de laatste
dag. De bestaande logica die dubbele boten voorkomt blijft.

### 3. Fietsen krijgen een derde optie en een afleverplek

- **Regel het voor ons** (versnellingsfietsen of e-bikes, zoals nu).
- **Wij hebben al fietsen.**
- **Geen fietsen** (met de bestaande uitleg).

Bij "al op Vlieland" en "regel het voor ons" vragen we of de fietsen bij de
accommodatie afgeleverd moeten worden; dat gaat als notitie mee op de
fiets-bouwsteen.

### 4. Het voorbeeldprogramma komt direct na stap 1

Zodra datum, groepsgrootte en situatie bekend zijn, krijgt de klant de
voorbeeldprogramma's te zien, gefilterd op aantal dagen en met een
beschikbaarheidsstatus per programma (zie 5). "Zelf samenstellen" blijft
naast de programma's staan. Logies en Vervoer komen daarna als korte
invulstappen en passen het gekozen programma aan in plaats van het te
overschrijven: `loadFromTemplate` voegt niet langer hard Doeksen en fietsen
toe, maar laat dat aan `planTransportCartOps` over. Dat lost meteen op dat de
route via `/voorbeeldprogrammas` nu Logies en Vervoer overslaat.

Volgorde wordt: Groep, datum & situatie → Voorbeeldprogramma of leeg →
Logies (alleen meerdaags, vanaf de wal) → Vervoer & fietsen (vanaf de wal) of
Startpunt & tijdvak (al op Vlieland) → Programma → Gegevens → Versturen.

### 5. Beschikbaarheid meenemen in de wizard: niveau 2, en het meeste is er al

Eén pure functie, `assessProgramAvailability(items, dates, people,
sluitingen, bouwstenen)`, die per onderdeel een status geeft:

- `beschikbaar`
- `partner gesloten` (uit `partner_unavailability`, datum van het onderdeel
  valt in een gesloten periode)
- `te groot` / `te klein` (uit `min_people` / `max_people`, hergebruik
  `capacityCheck.ts`)
- `op aanvraag` (MAP-activiteit zonder gepland moment op die dag, hergebruik
  `mapAvailability.ts`)

Die status wordt op vier plekken gebruikt:

- **Op de kaart van elk voorbeeldprogramma**: "Volledig beschikbaar op uw
  datum" of "1 onderdeel niet beschikbaar: Strandspektakel (Vlieland Outdoor
  Center gesloten tot 1 april)". Programma's met een probleem worden niet
  verborgen maar onderaan gezet, met het label. Verbergen zou verwarrend zijn
  voor iemand die hetzelfde programma net op `/voorbeeldprogrammas` zag.
- **In het programma zelf**, per onderdeel: hetzelfde label als op
  `/bouwstenen`, plus bij "te groot" de tekst "wij splitsen in 2 rondes" en
  bij "te klein" "minimaal 15 personen, wij overleggen met de aanbieder".
- **In "Activiteit toevoegen"**: gesloten partners onderaan met label, zodat
  niemand ze per ongeluk toevoegt.
- **In de AI-suggestie van Erwin**: gesloten partners en bouwstenen buiten
  de capaciteit gaan niet mee in de lijst die de AI krijgt.

Alternatieven: in de eerste versie stelt de wizard bij een gesloten
onderdeel **één** vervanger voor uit dezelfde categorie, van een open partner,
passend in capaciteit, met de uitleg "Strandspektakel kan niet op 12 oktober,
wij stellen Wadloopexcursie voor". De klant kiest; niets wordt stil
vervangen. Automatisch vervangen is een latere stap, pas als blijkt dat
klanten de keuze vervelend vinden.

Wat ik bewust weglaat: een status "beperkt beschikbaar" (eerder besloten),
vaste sluitingsdagen per week (niet nodig zolang de praktijk datumbereiken
zijn), en live koppelingen voorbij wat er al is (Doeksen-dienstregeling en
MAP lopen al).

### 6. Als een partner sluit terwijl er al aanvragen lopen

Bestaat deels: `conflictChecker.ts` maakt een admin-taak bij een conflict,
maar wordt alleen aangeroepen vanuit admin. Aanvulling: zodra een partner
zelf een sluiting invoert, controleren we lopende aanvragen op die partner in
die periode en maken een taak "Partner X gesloten, raakt aanvraag Y". Het
programma van de klant wijzigt niet vanzelf; dat blijft een beslissing van
het bureau.

## Voorstel in fases

### Fase 0: de blokkade en de snelle winst (~halve dag)

- `loadFromTemplate` slaat niet-gepubliceerde onderdelen over; admin
  templatepagina toont een waarschuwing bij zo'n onderdeel. Test erbij.
- Sluitingsnotitie (bestaande hook) op de kaarten van voorbeeldprogramma's en
  in "Activiteit toevoegen"; gesloten partners uit de Erwin-AI-lijst. Daarmee
  is het VOC-probleem van vandaag zichtbaar voor de klant, nog zonder
  nieuwe logica.

### Fase 1: situatie, vervoer, fietsen, startpunt (~2 dagen)

- Situatievraag in `BasicsForm`, dynamische stappenbalk, nieuwe stap
  Startpunt & tijdvak, vervoerstap met vier kaarten en capaciteitsregels,
  fietsen met drie opties en afleverplek.
- `TransportPreferences` uitbreiden, `planTransportCartOps` herschrijven met
  tests (`programWizardCart.test.ts` bestaat al).
- Situatie, startpunt en tijden mee in het concept (`useProgramDraft`) en in
  de aanvraag: nieuwe kolommen op `program_requests` (`group_situation`,
  `start_location`, `arrival_time`, `departure_time`), migratie, zichtbaar in
  admin en op de klantpagina.

### Fase 2: voorbeeldprogramma direct na stap 1 (~1 dag)

- Nieuwe fase "template" in `ProgrammaSamenstellen.tsx` tussen Basisgegevens
  en Logies; `TemplateSelector.tsx` (bestaat, wordt nu nergens gebruikt) als
  basis.
- `loadFromTemplate` laat vervoer aan de vervoerstap; `/voorbeeldprogrammas`
  komt in dezelfde flow terecht in plaats van stappen over te slaan.

### Fase 3: beschikbaarheid als status in de wizard (~2 dagen)

- `src/lib/programAvailability.ts` met tests: sluitingen, capaciteit, MAP.
- Status op programmakaarten, per onderdeel in het programma, in "Activiteit
  toevoegen"; één voorgestelde vervanger bij een gesloten onderdeel.
- Rondes bij "te groot" als notitie op het onderdeel.

### Fase 4: partner sluit na aanvraag (~1 dag)

- Databasetrigger of edge function op `partner_unavailability`: lopende
  aanvragen controleren, taak aanmaken, geen stille wijziging.

## Besluiten die ik van jou nodig heb

1. **Twee situaties** ("vanaf de wal" / "al op Vlieland") in plaats van drie.
   Akkoord?
2. **Watertaxi boven de 12**: automatisch twee boten voorstellen, of
   doorverwijzen naar de RIB (8–24) en Regina Andrea (30+)? En welke charters
   horen er nog meer in de vervoerstap?
3. **Programma's die niet kunnen**: tonen met label en onderaan (mijn
   advies), of verbergen?
4. **Volgorde**: fase 0 nu, dan 1 → 2 → 3 → 4. Of liever eerst fase 3 omdat
   de VOC-sluiting nu speelt? Fase 0 vangt het ergste al op.
5. **`vrije-tijd`**: bewust ongepubliceerd, of publiceren als echt onderdeel?

## Besluiten (16 september 2026)

1. Twee situaties: "vanaf de wal" en "al op Vlieland". Akkoord.
2. Watertaxi boven de 12: meer boten voorstellen. De RIB en Regina Andrea
   blijven als losse keuze (privévaart als kaart, RIB via "Activiteit
   toevoegen").
3. Programma's die niet kunnen: tonen met label, onderaan.
4. Volgorde: fase 0, 1, 2, 3, 4.
5. `vrije-tijd`: publiceren.
6. Geen fietsen bezorgen bij de accommodatie, dus geen afleverplek in de
   wizard.

## Gebouwd (16 september 2026)

### Fase 0

- `lib/programTemplateCart.ts` (met tests) zet een voorbeeldprogramma om in
  cart-items en slaat onderdelen over die de klant niet kan zien. Daarmee
  kan een programma nooit meer een onzichtbaar, onverwijderbaar onderdeel
  bevatten.
- Admin: waarschuwing per onderdeel in de templatesheet en een teller in de
  lijst ("2 niet gepubliceerd").
- Migratie `20260916100000` publiceert `vrije-tijd`. De bouwsteen
  `zaalhuur-brouwerij-fortuna` in "Vergaderdag+" is nog steeds
  ongepubliceerd en wordt dus overgeslagen; publiceren of vervangen is aan
  Erwin.
- "Activiteit toevoegen" in de wizard toont de sluitingsnotitie van de
  aanbieder; Erwin's AI-voorstel krijgt gesloten aanbieders niet meer.

### Fase 1

- Stap 1 vraagt de situatie (twee kaarten). Stappen zijn dynamisch
  (`lib/wizardSteps.ts`, met tests): logies alleen meerdaags en vanaf de wal,
  "Startpunt & fietsen" in plaats van "Vervoer & fietsen" bij al op Vlieland.
- Vervoerstap met vier kaarten. Watertaxi rekent met `max_people` van de
  bouwsteen (terugval 12) en zet "2 watertaxi's voor 20 personen" als
  notitie op het onderdeel; het aantal boten in de offerte zet het bureau
  zelf. Regina Andrea alleen kiesbaar vanaf `min_people` (terugval 30).
  "Zelf geregeld" vraagt aankomst- en vertrektijd, mag leeg.
- Fietsen: versnellingsfietsen, e-bikes, "wij hebben al fietsen", geen.
- `lib/programWizardCart.ts` herschreven (19 tests): precies de gekozen
  overtocht in het programma, alle andere overtochten eruit, fietsen
  wederzijds uitsluitend.
- Situatie en vervoerskeuze zitten in de cart-context en in het concept
  (`useProgramDraft`). Bij versturen gaan zes kolommen mee
  (`group_situation`, `crossing_choice`, `bike_choice`, `start_location`,
  `arrival_time`, `departure_time`; migratie `20260916110000`, RPC
  bijgewerkt, lokaal getest in Postgres). Zichtbaar in admin
  (aanvraagdetail) en op de klantpagina (Praktisch, kaart "Uw situatie").
  Snel-aanvragen stuurt deze velden niet mee en blijft werken.

### Fase 2

- Nieuwe fase "template" direct na stap 1 met de bestaande
  `TemplateSelector` (die werd nergens gebruikt en haalde bij "Gebruik" geen
  onderdelen op; dat is gefixt).
- `loadFromTemplate` voegt geen vervoer meer toe; de vervoerstap doet dat en
  neemt een watertaxi of privévaart uit het programma over als keuze. Vanuit
  de programmastap blijft het al gekozen vervoer staan bij het wisselen van
  programma.
- `/voorbeeldprogrammas/:slug` → wizard doorloopt nu ook logies en vervoer.

### Fase 3

- `lib/programAvailability.ts` (13 tests): per onderdeel op de dag waarop
  het staat: beschikbaar, aanbieder gesloten, te groot (met aantal rondes),
  te klein, onbekend. Plus `suggestReplacement`: één vervanger uit dezelfde
  categorie, open op die dag, passend bij de groep, nog niet in het
  programma, laagste `sort_order`.
- Programmakaarten: samenvatting per programma ("Volledig beschikbaar op uw
  datum" of "1 onderdeel vraagt aandacht: Strandspektakel (aanbieder
  gesloten t/m 31 maart)"), programma's met een probleem onderaan. Vervoer
  telt niet mee (dat regelt de wizard). Voorbeeldvenster: label per
  onderdeel.
- Programmastap: label per onderdeel, knop "Vervang door …" bij een gesloten
  aanbieder (klant kiest, niets wordt stil vervangen), en de live
  MAP-agenda per MAP-onderdeel (nieuwe hook `usePublicPartnerMapSlugs`, leest
  `partners_public`).
- "Activiteit toevoegen": label per bouwsteen op de actieve dag, gesloten
  aanbieders onderaan.
- Bewust niet: MAP-beschikbaarheid op de programmakaarten (dat zou per
  aanbieder een aparte MAP-call per kaart zijn). Automatisch vervangen.

### Fase 4

- Migratie `20260916120000`: trigger op `partner_unavailability` (insert en
  wijziging van de periode). Voor elk lopend onderdeel van die partner op
  een dag in de sluiting komt een werkbanktaak "Beschikbaarheidsconflict"
  (prioriteit hoog), dezelfde taaksoort als de bestaande admin-controle,
  dus nooit dubbel. Geannuleerde onderdelen en aanvragen, verleden datums en
  vrije-tekst-datums worden overgeslagen. Lokaal getest in Postgres 16 met
  vijf gevallen.
- Bewust niet: taken automatisch sluiten als de partner de sluiting weer
  verwijdert of inkort. Zo'n taak kan al opgepakt zijn; dat blijft handwerk.

### Kwaliteitspoorten

Typecheck 0 fouten, strict 26/26 op de baseline, lint van 1204 naar 1193
(plafond mee verlaagd), 108 testbestanden / 1578 tests groen, productiebuild
groen. Backend-wijzigingen (drie migraties) gaan via de deploy-workflow mee
bij de merge naar `main`.
