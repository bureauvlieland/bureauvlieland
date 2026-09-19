# Plan: één consistent ontwerpsysteem (interactieontwerp en design)

Status: onderzoek afgerond 17 september 2026. Zes besluiten genomen op
18 september (zie "Besluiten"), volgorde afgesproken (zie "Afgesproken
volgorde"). Fase 0 gebouwd op 18 september (pull request 51), het
wizard-vervolg op 18 september (pull request 52), fase 1 (fundament) op 18
september (pull request 53), fase 2 deel 1 (de programma-wizard) op 18
september (pull request 54), fase 2 deel 2 (de overige
aanvraagformulieren) op 19 september. De levende referentie is voortaan
`docs/design-systeem.md`. Volgende stap: fase 2 deel 3 (de zwevende laag,
sheets als bottom-sheet op mobiel, prijzen in de bouwer).

Aanleiding (Erwin, 17 september): de site oogt mooi maar "template-achtig",
en pagina's verschillen onderling in opbouw, elementen en kleurgebruik. Wens:
één consistent ontwerpsysteem dat uniek is, past bij doel en doelgroep, en
conversie in het oog houdt. Focus: interactieontwerp en design, niet de
teksten of SEO op zich.

## Hoe ik dit heb onderzocht

- Code-analyse van alle 29 publieke pagina's (`src/pages/*`), de 26
  configurator-componenten (`src/components/configurator/*`), de
  logies-wizard, catering, kaartboeken, de gedeelde componenten en de
  shadcn-primitieven (`src/components/ui/*`). Tellingen zijn gedaan met
  `rg` over `src/pages` en `src/components` met admin, partner- en
  klantportaal uitgesloten (die delen wel de tokens, maar zijn hier buiten
  scope).
- Productiebuild gedraaid en met Playwright schermafbeeldingen gemaakt van
  24 pagina's op desktop (1280px) en van de homepage en een landingspagina
  op mobiel (390px). Let op: Supabase is vanuit deze omgeving niet
  bereikbaar, dus datagedreven schermen (programma-samenstellen,
  voorbeeldprogramma's, direct boeken, agenda) toonden alleen skeletons. De
  wizard heb ik daarom via de code beoordeeld, niet visueel.
- Eerdere documenten meegenomen: `docs/plan-frontend-usability.md`
  (conversiecijfers, CTA-hiërarchie, fase 3 meten),
  `docs/concurrentie-positionering.md` (waarin wij ons onderscheiden van
  Island Events en WadEvents) en `.lovable/funnel-audit.md`.

Wat ik niet kon: GA4 raadplegen (geen koppeling) en de wizard live
doorklikken. Waar dat uitmaakt staat het erbij.

## Conclusie in het kort

**De site bestaat uit drie verschillende ontwerptalen die naast elkaar
leven.** Dat is de kern van het "template-gevoel", niet één los element.

1. **De homepage is redactioneel** ("editorial"): Fraunces in lichte
   letter, enorme koppen, cursieve accenten in zonsondergang-oranje,
   donkere oceaan-secties, sectienummers ("· 04 — Het verhaal achter"),
   hoekige knoppen (`rounded-sm`), framer-motion. Dit is het meest eigen
   en het minst template-achtige deel van de site, en het is het enige deel
   dat zo is.
2. **De 28 subpagina's zijn een generiek "SaaS-marketing"-sjabloon**:
   blauwe fotohero met gecentreerde vette kop, drie iconen in cirkels op
   een rij, generieke koppen ("Waarom Bureau Vlieland?", "Klaar om te
   beginnen?"), een blauwe CTA-band, een "Bekijk ook"-grid, een FAQ en nóg
   een linkgrid. Dat sjabloon is 12 keer gekopieerd en overal net iets
   anders. Dit is precies wat "template-achtig" aanvoelt.
3. **De funnel (wizard, formulieren, portaal) is een derde taal**:
   shadcn-standaard, ronde hoeken, zes verschillende stapindicatoren,
   vier validatiepatronen, twee toastsystemen tegelijk. De knop waar iemand
   op de homepage op klikt lijkt in niets op de knop op het volgende scherm.

Het fundament is niet het probleem: de kleurtokens in `src/index.css` zijn
goed gekozen (oceaanblauw, zand, zonsondergang), er staan bijna geen
hardgecodeerde hex-waarden in de code, en de lettercombinatie Fraunces/Inter
is onderscheidend. Het probleem is dat het fundament te dun is (geen regels
voor radius, spacing, containers, statuskleuren, motion), dat de tokens die
er zijn nauwelijks worden gebruikt (`sunset` en `sand` komen buiten de
homepage vrijwel niet voor; `success`/`warning`/`info` bijna nergens), en
dat elke pagina zijn eigen componenten in elkaar heeft gezet in plaats van
ze te delen.

De aanbeveling is dan ook niet "een nieuw ontwerp", maar: **de redactionele
taal van de homepage tot dé taal van de site maken**, die taal
uitschrijven in tokens en een kleine set gedeelde componenten, en daar
vervolgens eerst de funnel en dan de landingspagina's op overzetten. Daarbij
wordt de funnel bewust rustiger en functioneler dan de homepage, maar in
dezelfde familie.

## Voor wie en waarvoor het systeem moet werken

**Doelgroep.** Uit de navigatie, de 12 landingspagina's (7 zakelijk, 3
privé, 2 activiteiten) en de aanvragen: vooral zakelijke beslissers en
organisatoren (HR, officemanagers, teamleads, secretariaat) die een
bedrijfsuitje, heisessie of meerdaags programma moeten regelen en daar
zekerheid bij zoeken: klopt het logistiek, wat kost het, wie staat ervoor
in. Daarnaast privégroepen (jubileum, familie, vriendenweekend) die
ontzorgd willen worden. Beide groepen oriënteren zich vaak op mobiel
(landingspagina's via zoeken) en stellen op desktop samen.

**Doel van de site.** Vertrouwen wekken (lokaal, één factuur, echte
mensen) en de bezoeker zo snel mogelijk naar de juiste van zes routes
brengen, waarvan "Stel uw programma samen" de gemarkeerde standaard is.

**Het onderscheidende punt** (uit `docs/concurrentie-positionering.md`):
de concurrenten zijn pure offertebureaus, wij tonen prijzen en laten mensen
zelf samenstellen of direct boeken. Het ontwerpsysteem moet dat
zelfbedieningsvoordeel zichtbaar maken (prijs, beschikbaarheid, status) in
plaats van het te verstoppen achter generieke "Neem contact op"-banden.

**Conversie.** De cijfers uit `docs/plan-frontend-usability.md` blijven
de meetlat: 33 aanvragen sinds 9 juni, 58% geannuleerd, 3 getekend.
Ontwerpconsistentie is daar geen doel op zich, maar één duidelijk pad
(één primaire actie per scherm, één knopkleur, één stapindicator, één
succesbeeld) haalt ruis weg op precies de plekken waar mensen nu afhaken.

## Bevindingen

Hieronder per thema, met tellingen. Bestandsverwijzingen staan erbij zodat
de bouwfases er direct op kunnen aansluiten.

### 1. Fundament: tokens zijn er, maar te weinig en te vrij gebruikt

**Kleur.**
- `--primary`, `--secondary` en `--accent` zijn in `src/index.css`
  letterlijk dezelfde kleur (198 71% 22%). Toch staat er 30 keer
  `bg-accent` en 26 keer `bg-primary` als override op een `<Button>`, terwijl
  `variant="default"` maar 5 keer voorkomt. Er is dus geen "de primaire knop",
  er zijn tientallen lokale keuzes die toevallig dezelfde kleur opleveren.
- `sunset` (oranje) en `sand` komen alleen op de homepage, de 404 en de
  voorbeeldprogramma-detailpagina voor. Geen enkele van de 12
  landingspagina's gebruikt ze. `ocean-deep` idem.
- De semantische tokens `success`, `warning`, `info` (met `-soft` en
  `-foreground`) bestaan in `tailwind.config.ts` maar worden buiten het
  portaal vrijwel niet gebruikt. In de funnel staan in plaats daarvan
  losse paletklassen: vier verschillende groenen voor "gelukt"
  (`text-green-500`, `text-green-600`, `emerald`, `text-primary`), vijf
  ambervarianten voor "let op", `sky-500` voor logies in de stepper. Voor
  drie betekenissen (goed / aandacht / geblokkeerd) zijn minstens negen
  kleurrecepten in omloop. `MicroPill.tsx` en `ItemDisplayStatusBadge.tsx`
  bevatten letterlijk dezelfde toonkaart, tweemaal.
- `text-white`/`bg-white`/`from-black` (37 keer) in plaats van
  `primary-foreground`, vooral in `Programmas.tsx`,
  `VoorbeeldprogrammaDetail.tsx` en `ProgramCard.tsx`. Sterren staan als
  `fill-yellow-400` in twee identieke, gedupliceerde `RatingStars`-functies
  (`Testimonials.tsx`, `GoogleReviewsBlock.tsx`).
- `hsl(var(--sunset))` met de hand geschreven waar `text-sunset` bestaat
  (`VoorbeeldprogrammaDetail.tsx`, `ProgramHighlights.tsx`,
  `ProgramPractical.tsx`); `style={{background:"var(--gradient-sand)"}}`
  naast `bg-gradient-sand`.

**Typografie.**
- Fraunces wordt 193 keer `font-bold`, 55 keer `font-semibold` en 14 keer
  `font-light` gebruikt. De lichte, ruime letter van de homepage is dus de
  uitzondering; de rest van de site zet dezelfde letter vet en gecentreerd,
  wat "gewoon een serif-thema" oogt.
- Acht verschillende h1-formaten (van `text-xl` tot `text-7xl` en één
  `clamp`); vijf verschillende h1-schalen alleen al in de hero's.
- 22 h1's en 38 h2's zonder `font-display` (o.a. `VeelgesteldeVragen.tsx`,
  `RelatedLinks.tsx`, `GoogleReviewsBlock.tsx`, shadcn `CardTitle`).
- Negen verschillende "eyebrow"-stijlen (kleine kop boven de titel):
  `tracking-[0.3em]`, `[0.25em]`, `[0.2em]`, `[0.18em]`, `[0.15em]`,
  `[0.12em]`, `widest`, `wider`, `wide`, in `text-sunset`, `text-primary`,
  `text-primary/70`, `text-muted-foreground` en `text-white/85`.
- Titelhoofdletters ("Neem Contact Op", "Offerte Aanvragen") op twee
  plekken, elders normale zinshoofdletters.

**Vorm, schaduw, ruimte.**
- Zes hoekradii door elkaar: `rounded-lg` 144×, `rounded-full` 113×,
  `rounded-2xl` 63×, `rounded-md` 38×, `rounded-xl` 28×, `rounded-sm` 13×.
  De homepage-knoppen zijn hoekig (`rounded-sm`), de funnelknoppen rond
  (`rounded-md`), landingspaginakaarten heel rond (`rounded-2xl`).
- Vier schaduwsystemen: Tailwind (`shadow-lg` 48×), eigen tokens
  (`shadow-soft/medium/dramatic` 18×), inline `style={{boxShadow:
  "var(--shadow-soft)"}}` en `hover:shadow-elegant` in
  `werkwijze/RouteCards.tsx:59`, een klasse die niet bestaat.
- Negen sectiepaddings (`py-8` t/m `py-48`), acht containerbreedtes
  (`max-w-3xl` 91×, `max-w-2xl` 56×, `max-w-7xl` 38×, `max-w-5xl` 35×,
  `max-w-4xl` 34×, `max-w-6xl` 21×, `max-w-xl` 6×, `max-w-[1400px]` alleen
  homepage) en vier container-idiomen (`container mx-auto px-4`, met
  `sm:px-6 lg:px-8`, met `max-w-7xl`, met `px-6`).

### 2. Pagina-opbouw: zeven hero's, vijf CTA-banden, kopieerwerk

- **Zeven hero-types.** Type A (foto met blauwe waas, gecentreerde vette
  kop, geen CTA) staat byte-identiek op 11 pagina's, alleen de hoogte
  wisselt (`min-h-[50vh]` vs `[60vh]`) en Logies heeft als enige wél een
  knop. Daarnaast: donkere hero met kruimelpad ín de hero (Wadlopen,
  Zeehondentochten), vlakke gradient zonder foto (Activiteiten, Evenementen,
  Contact), CSS-achtergrond met `useKenBurns()` en twee decoratieve
  SVG-golven (Over ons, Voor wie, Werkwijze, Programma's), korte
  utility-hero (Partners, Bouwstenen, Voorbeeldprogramma's), maatwerk
  donker (Catering, Voorbeeldprogramma-detail) en de redactionele homepage.
  Veelgestelde vragen heeft geen hero.
- **Ken Burns twee keer gebouwd**: als CSS-klasse `animate-ken-burns` op
  11 hero's en als hook `useKenBurns()` met inline style op 11 andere.
- **Vijf CTA-banden** voor dezelfde boodschap ("Klaar om te beginnen?"):
  blauw vlak met `secondary`+`outline`-knoppen (9 pagina's), hetzelfde
  vlak met `heroPrimary`/`heroOutline` (3), `bg-gradient-hero` met
  inline-overrides (4, waarvan één met `bg-white`), licht `bg-muted/30`
  met `bg-accent`-knop (5) en de redactionele FinalCTA. De tweede knop
  heet afwisselend "Maatwerk aanvragen", "Liever maatwerk?" en "Vraag
  maatwerk aan": drie labels voor één bestemming.
- **Drie gestapelde linkblokken** onderaan de meeste landingspagina's:
  een handgeschreven "Bekijk ook"-grid (14 pagina's, identieke markup),
  `RelatedLinks` (3 kolommen) en op drie pagina's ook `SeeAlsoActivities`
  (zelfde tegel, andere container). `GroepsweekendVlieland.tsx` en
  `FamilieweekendVlieland.tsx` linken in dat grid twee keer naar
  "Jubileum vieren" (kopieerfout).
- **Vier FAQ-implementaties**: `FaqSection` (20 pagina's), losse
  `Accordion` met eigen JSON-LD (3), `WerkwijzeFaq` en de FAQ-pagina zelf.
- **Kruimelpad** op 11 van 29 pagina's, in twee uitvoeringen (strook boven
  de hero vs `<nav>` ín de hero); 15 pagina's hebben er geen.
- **De 12 landingspagina's zijn gekopieerd, niet gesjabloneerd.** Tien
  delen exact dezelfde volgorde (hero, intro, 3 USP-kaarten, 4 fototegels,
  "geschikt voor", CTA-band, Bekijk ook, FAQ, RelatedLinks). Wat verschilt
  is een foto-import, drie iconen met tekst, drie tot vier tegels, de
  FAQ-array en de linklijst. Bedrijfsuitje, Jubileum en Familieweekend
  wijken elk net iets af. `id="main-content"` (doel van de skip-link)
  ontbreekt op 7 van de 12.

### 3. Componenten: elf kaarten, vijf badges, knoppen zonder systeem

- **Elf verschillende kaartimplementaties** voor grofweg vier
  betekenissen (activiteit/aanbod, programma, route/link, feature/USP):
  shadcn `Card`, de "USP-kaart" (`rounded-2xl p-8 shadow-lg` met icoon
  in cirkel, 10 kopieën, geen hover), dezelfde kaart mét hover, fototegel
  in twee beeldverhoudingen met en zonder hover, catalogus-kaart,
  `ProgramCard` (vaste hoogte, hardgecodeerd zwart verloop), redactionele
  mozaïektegel, redactionele template-kaart, twee reviewkaarten voor
  dezelfde inhoud, en de linktegel.
- **Vijf badge/pill-systemen**: shadcn `Badge`, `MicroPill` (eigen
  docstring zegt "gebruik altijd deze", maar de funnel doet het niet),
  `ItemDisplayStatusBadge` (gedupliceerde toonkaart),
  `ItemAvailabilityBadge` (is een `<p>`), en ad-hoc pills op zes plekken.
- **Knoppen.** `buttonVariants` heeft acht varianten (waaronder
  `heroPrimary`/`heroOutline` voor donkere vlakken), maar in de praktijk
  winnen inline overrides: `bg-accent` 30×, `bg-primary` 26×, `bg-white`,
  `bg-sunset`, `bg-sand`, `bg-ocean-deep`, hoogtes `h-12/h-14/h-16`,
  `rounded-sm` alleen op de homepage. `CateringHighlight.tsx:87-102`
  gebruikt een kale `<Link>` als knop met een schuivende oranje vulling.
  De vier prijsnotaties (`formatBlockPrice`, `toFixed(2).replace`,
  string-concat, "Op aanvraag") horen hier ook bij: dezelfde bouwsteen
  toont op vier schermen vier verschillende prijzen of geen prijs
  (`ProgramBuilderView` toont er geen, staat al op de roadmap).

### 4. Interactie in de funnel: elke stap zijn eigen regels

Dit is voor conversie het belangrijkste deel.

- **Zes stapindicatoren** (plus twee statische "zo werkt het"-rijen):
  `CheckoutStepIndicator` (wizard), `Progress`-balk + eigen cirkelrij
  (logies-wizard, met andere "gedaan"-kleur), `ProgramStepper` (portaal),
  tekststatussen (`ConceptRecover`, het enige bestand met `font-serif`),
  genummerde rij in `LogiesAanvragen`, `HowItWorksBlock`. Snel-aanvragen,
  Programma op maat, Catering en Offerte hebben géén voortgang.
- **Vorige/volgende is binnen één wizard al inconsistent**: `BasicsForm`
  volle-breedte knop zonder Terug, `TemplateSelector` alleen Terug (vooruit
  = een kaart), `AccommodationWishStep`/`TransportBikesStep` ghost-Terug +
  Volgende, `ProgramBuilderView` een zwevende balk, `CheckoutContactForm`
  Terug bovenaan en versturen onderaan. Labels: "Terug", "Vorige", "Terug
  naar programma", "Terug naar alle bouwstenen"; icoon `ArrowLeft` vs
  `ChevronLeft`; op `ProgramBuilderView.tsx:644` staat de pijl vóór het
  label.
- **Vijf succesbeelden**: `CheckoutSuccess` (5 s aftellen), eigen blok in
  Programma op maat (`text-green-500`), eigen Card in de logies-wizard
  (2,5 s), aparte pagina `BookingStatus`, en Offerte heeft er geen (alleen
  een toast en `form.reset()`). Catering navigeert naar
  `/?catering_submitted=1`.
- **Vier validatieparadigma's** (react-hook-form+zod alleen in Offerte;
  handmatig+zod op submit; handmatig met `touched`; alleen een
  `canSubmit`-boolean zonder uitleg), twee foutmeldingsformaten
  (`text-sm font-medium` vs `text-xs`), foutrand op het veld soms wel,
  soms niet. **Drie markeringen voor verplicht** (`*`, niets,
  "(optioneel)" of placeholder "Optioneel"). **Vier telefoonveld-
  contracten** (strikt 06 met twee verschillende placeholders, losse regex,
  geen validatie). **Vier datumkiezers** (`MultiDatePicker`,
  Popover+Calendar single, Calendar multiple inline, native `type="date"`)
  met drie verschillende minimumdatums. **Vijf optiekaart-implementaties**
  (`role="radio"` met en zonder aria, `RadioGroup` met `border` of
  `border-2`, CSS `has-[]`). **Drie toestemmingspatronen** (impliciete
  tekst, blokkerende Checkbox, kale `<input type="checkbox">`).
- **Feedback.** Twee toastsystemen tegelijk gemonteerd (`App.tsx:153-154`:
  radix `Toaster` én `Sonner`); 89 bestanden gebruiken sonner, 74
  `use-toast`; binnen één funnel door elkaar (logies-wizard sonner, de rest
  use-toast). Toastduur 1200/1500/1800/standaard. Vier laadstaten
  (`Skeleton`, eigen `animate-pulse`, `Loader2`, tekst "Laden..." én
  "Laden…"), vier lege staten, drie inline-alertstijlen. `EmptyCartTips`
  bestaat maar wordt niet gebruikt. Alleen `CheckoutContactForm` biedt
  "Opnieuw proberen"; het dubbele-aanvraag-dialoog daar heeft vijf acties
  in één voet.
- **Overlays.** Vijf verschillende sheet-breedtes, nergens een
  bottom-sheet op mobiel (sheets zijn `w-3/4` van rechts, krap op 390px),
  `drawer.tsx` ongebruikt, `AiErwinDialog` heet Dialog maar is een Sheet,
  `ProgramEditorSheet` heeft twee sluitknoppen, `DraftRecoveryDialog` is
  niet met Esc te sluiten, sluitknop-label "Close" onvertaald.
- **Aanraakdoelen onder 44px** in de bouwer: verwijderknoppen `h-7 w-7`,
  notitieknop `h-6`/`h-5`, sleepgreep `p-1` om een 16px-icoon,
  tijdselects `h-7`.

### 5. Mobiel en de zwevende laag

- Zeven `fixed`/`sticky` elementen met z-index 30/30/40/50/50/40/50:
  verstuurbalk van de bouwer (z-30, volle breedte), `StickyMobileCTA`
  (z-30, alleen homepage), chat-FAB + "Uw programma" (z-40, `bottom-4
  right-4`), `ChatWidget` (z-50), portaal-`MobileBottomNav` (z-50). Op
  `/programma-samenstellen` staat de chatknop over de rechterrand van de
  verstuurbalk; op de landingspagina staat de chatknop op mobiel half over
  de kop "Waarom een bedrijfsuitje op Vlieland?" (schermafbeelding). Twee
  verschillende oplossingen voor hetzelfde probleem (`useFooterInView`
  vervagen vs hardgecodeerde `right-[4.75rem]`).
- De sticky "Start uw aanvraag" bestaat alleen op de homepage, niet op de
  landingspagina's die de eigenlijke SEO-ingang zijn.
- Op mobiel is de `RoutePicker` (vier kaarten met foto, elk bijna een
  scherm hoog) vier schermen scrollen vóór de eerste inhoud; de
  hero-intro van landingspagina's is een lange alinea over een foto.
- Onderrand-compensatie voor zwevende balken bestaat op één plek
  (`pb-28`).

### 6. Motion

- framer-motion alleen in vijf homepage-bestanden; de rest CSS. Sommige
  wizardstappen glijden in (`animate-in`), andere springen. `animate-ping`
  oneindig op de sjabloon-banner in de bouwer. `animate-tab-highlight` is
  dood (prop wordt nooit doorgegeven). `prefers-reduced-motion` wordt
  nergens gerespecteerd (Ken Burns, framer, pulse, ping draaien altijd).

### 7. Copy en toon (voor zover het interactie raakt)

- **u en je door elkaar in dezelfde flow**: de wizard is "u", de toast en
  het successcherm na versturen zeggen "Check je inbox"
  (`CheckoutContactForm.tsx:492`, `CheckoutSuccess.tsx:36`); de
  Offerte-FAQ is "je" onder een "u"-formulier; Wadlopen en
  Zeehondentochten zijn grotendeels "je".
- **Zeven verzendwerkwoorden**: "Aanvraag versturen", "Verstuur
  aanvraag", "Aanvraag verzenden", "Offerte Aanvragen", "Vrijblijvend
  aanvragen", "Overzicht en versturen", "Door naar contactgegevens".
- **Vier responstijd-beloftes**: 5 werkdagen (Offerte, FinalCTA), 1 werkdag
  (Programma op maat, Contact, Bouwstenen), 2 werkdagen (Catering, Logies),
  "twee tot vijf" (FAQ). Wie `/offerte` en `/programma-op-maat` vergelijkt
  ziet 5 dagen naast 1 dag.
- **Placeholder in productie**: `FinalCTA.tsx:52` toont letterlijk
  "Liever bellen? +31 6 ...". De stats "8+ / 200+ / 20+ / 1" en "4,9 ·
  200+ groepen" in de hero staan hardgecodeerd zonder bron.
- Sectienummers op de homepage lopen 02, 04, 05 (01 en 03 ontbreken),
  stond al op de roadmap.

### 8. Wat het precies "template-achtig" maakt

Samengevat, zodat we het kunnen afvinken:

1. Tien keer dezelfde rij van drie iconen in een cirkel met een vette
   kop en één regel tekst (`rounded-full bg-primary/10` komt 38 keer voor).
2. Generieke koppen die op elke site kunnen staan: "Waarom Bureau
   Vlieland?", "Klaar om te beginnen?", "Van idee tot uitvoering".
3. Eén foto met een blauwe waas en een gecentreerde vette kop als
   standaardhero, zonder eigen typografie of CTA.
4. Blauwe CTA-band met witte en outline-knop, negen keer.
5. Vijf decoratie-stijlen naast elkaar: vervaagde bollen, SVG-golven,
   korrel, spookletters, Ken Burns.
6. Lucide-iconen als betekenisdrager (`MapPin` voor "Meerdaags",
   "Logies", "Heisessie" én "Locatie"; `Star` voor "Jubileum" én
   "Materialen").
7. Ronde `rounded-2xl`-kaarten met `shadow-lg`, het shadcn/Lovable-
   uiterlijk uit de doos.

De homepage doet het tegenovergestelde (grote typografie, echte foto's,
Erwin's citaat, "eilandfeiten" als 53°17′N) en voelt daardoor wél eigen.
Daar zit de richting.

## Richting: het ontwerpsysteem in vijf principes

1. **Het eiland als bestemming, redactioneel.** Fraunces licht (300) voor
   grote koppen, cursief als accent, ruimte, foto's die het werk doen.
   Geen vette Fraunces meer voor grote koppen; middelzwaar (500) alleen
   voor kaarttitels en in de funnel.
2. **Eén pad, één actie.** Elke pagina heeft één primaire actie in één
   vaste kleur en vorm, en eindigt in dezelfde routekeuze
   (`RouteChooser`) in plaats van vijf verschillende CTA-banden. Nooit
   twee even zware knoppen naast elkaar.
3. **Lokaal en persoonlijk, met echte feiten.** Geen icoon-rijen maar
   foto's, mensen (Erwin, gidsen, koks) en concrete eilandfeiten
   ("autoluw, 1.150 inwoners, 20 minuten fietsen van boot tot strand")
   waar nu generieke USP's staan. Iconen alleen functioneel (tijd,
   personen, locatie).
4. **Zelfbediening met vertrouwen.** Prijs, beschikbaarheid en status
   overal in dezelfde vorm en kleur; "vrijblijvend" en de responstijd op
   één vaste plek naast de knop; één succesbeeld met een volgende stap.
5. **Rust: decoratie alleen met functie.** Bollen, golven en korrel
   verdwijnen; motion alleen als het iets betekent (entree van de hero,
   toevoegen aan programma) en altijd met `prefers-reduced-motion`.

### Tokens (voorstel, concreet)

| Token | Nu | Voorstel |
|---|---|---|
| Actiekleur | ocean (`primary`), soms `accent` (zelfde kleur), soms `sunset` | Eén actiekleur voor de primaire knop, sitebreed (besluit 1). `secondary` en `accent` krijgen een eigen betekenis of verdwijnen als knopkleur. |
| Accentkleur | `sunset` alleen homepage | `sunset` voor cursieve accenten, eyebrows en de "Meest gekozen"-markering; `sand` voor warme tussensecties; `ocean-deep` voor donkere secties. Overal, niet alleen op de homepage. |
| Statuskleuren | 9+ recepten | Uitsluitend `success`/`warning`/`info`/`destructive` (+ `-soft`). Lintregel die `-green-`, `-amber-`, `-red-`, `-blue-`, `-emerald-`, `-sky-` buiten `ui/` verbiedt. |
| Display-letter | Fraunces 300 t/m 900, meestal 700 | 300 voor h1/h2 op marketingpagina's, 500 voor h3/kaarttitels/funnel-koppen, cursief 400 als accent. 600+ verdwijnt. Fontlaad in `index.html` terugbrengen tot 300/400/500 (sneller). |
| Typeschaal | 8 h1-formaten | `display-xl` clamp(2.75rem,6vw,5.5rem) hero; `display-lg` clamp(2rem,4vw,3.25rem) sectiekop; `display-md` 1.5–1.75rem; `heading` 1.125–1.25rem (Inter 600) voor kaarten en funnel; body 1rem/1.125rem; `eyebrow` 0.75rem uppercase tracking 0.2em, één variant. |
| Radius | 6 waarden | `--radius-sm` 4px (knoppen, velden, chips), `--radius-md` 8px (kaarten, sheets), `full` alleen voor avatars en statuspuntjes. `xl`/`2xl`/`3xl` verdwijnen. |
| Schaduw | 4 systemen | Alleen `soft`, `medium`, `dramatic`. Tailwind `shadow-*` en inline `boxShadow` verdwijnen; `shadow-elegant` wordt verwijderd. |
| Sectie-ruimte | 9 waarden | Marketing `py-16 md:py-24`; hero-naar-inhoud `py-20 md:py-32`; funnel `py-8 md:py-12`. |
| Container | 8 breedtes, 4 idiomen | Eén `Container`-component met `size="prose" (48rem) / "content" (64rem) / "wide" (80rem) / "full" (1400px)`. |
| Motion | ad hoc | Duur 150 (hover), 300 (staat), 700 (entree); één easing; `useReducedMotion` in framer en `motion-safe:` in CSS. Eén Ken Burns of geen. |
| Iconen | overal, betekenisdrager | Lucide alleen functioneel (16/20px), nooit in een cirkel als "feature". |

### Componentbibliotheek (publiek), wat er komt en wat het vervangt

| Component | Vervangt |
|---|---|
| `PageHero` met drie varianten: `editorial` (donker, grote kop, CTA + vertrouwensregel), `photo` (foto, kop links, korte intro, één CTA, kruimelpad erboven), `utility` (kort, titel + intro, voor bouwstenen/partners/faq) | 7 hero-types, 2 Ken Burns-implementaties |
| `Section` + `SectionHeader` (eyebrow, titel, intro, optioneel nummer) | 9 paddings, 9 eyebrow-stijlen, losse sectienummers |
| `RouteChooser` (compact: primaire route + twee alternatieven; en volledig: de zes routes) | 5 CTA-banden, "Zo begint u", "Bekijk ook", `RouteCards` |
| `MediaCard` (foto, titel, meta, één actie), `LinkTile`, `FactList` (eilandfeiten i.p.v. icon-USP's), `PersonQuote` (Erwin/gids/kok), `ReviewCard` | 11 kaarten, 2 reviewkaarten, 10 USP-rijen |
| `Button`: `primary`, `secondary`, `ghost`, `link`, `inverse` (op donker), `destructive`; sizes `sm/md/lg`; `fullWidthOnMobile` | 8 varianten + 60+ overrides, de `<Link>`-knop in CateringHighlight |
| `Pill` met `tone` (neutral/info/success/warning/danger/brand) en `size` | shadcn Badge, MicroPill, ItemDisplayStatusBadge, ItemAvailabilityBadge, ad-hoc pills |
| `Notice` (inline melding, zelfde tonen) | 3 alertstijlen, gekleurde `<p>`'s |
| `Stepper` (één, met compact-mobiel) + `WizardFooter` (Terug links ghost, Volgende rechts primary, stapelt op mobiel, één labelset) | 6 stapindicatoren, 6 vorige/volgende-uitvoeringen |
| `FormField` (label, `*`, hulptekst, fout, foutrand), `PhoneField`, `EmailField`, `DateField` (één kiezer, één minimum-regel), `OptionCard` (toegankelijk, één stijl), `ConsentNote` | 4 validatiepatronen, 3 verplicht-markeringen, 4 telefoonvelden, 4 datumkiezers, 5 optiekaarten, 3 toestemmingspatronen |
| `SuccessScreen` (icoon, kop, wat er nu gebeurt, referentie, volgende stap, geen aftellen) | 5 succesbeelden + Offerte zonder |
| `EmptyState`, `LoadingState` | 4 + 4 idiomen |
| `Faq` (één, met JSON-LD) en `Breadcrumb` (één, boven de hero, op elke pagina behalve home) | 4 FAQ's, 2 kruimelpaden |
| `FloatingLayer` (één plek die sticky CTA, chat en "Uw programma" beheert: vaste z-lagen, één positie, verbergt bij footer, compenseert onderrand) | 7 losse fixed-elementen |
| Toast: alleen sonner, met vaste duur en stijl in de tokens | radix Toaster |
| Sheet: `side="bottom"` op mobiel als standaard, twee breedtes op desktop | 5 breedtes, ongebruikte drawer |

### Interactieregels (kort, komen in `docs/design-systeem.md`)

- Eén primaire knop per scherm; de tweede actie is `ghost` of `link`.
- Knoppen op mobiel volle breedte in wizards; aanraakdoelen minimaal
  44×44px.
- Validatie bij verlaten van het veld, samenvatting bovenaan bij
  mislukte verzending, verplicht altijd met `*`, optioneel nooit
  gemarkeerd.
- Verzendknop heet overal "Aanvraag versturen"; laadtekst "Versturen…";
  "vrijblijvend" en de responstijd staan in één regel direct onder de knop
  en komen uit één constante (besluit 5).
- Aanspreekvorm "u" op alle publieke pagina's en in de funnel (besluit 4).
- Status: goed = success, aandacht = warning, geblokkeerd = destructive,
  informatief = info; schaarste ("bijna vol") is warning, geen destructive.
- Prijs altijd via `formatBlockPrice`, met dezelfde notitie ("p.p.",
  "totaal") op elke plek waar de bouwsteen verschijnt.
- Motion: entree 700ms alleen in de hero; staatwisselingen 300ms;
  nooit oneindig behalve een spinner.

## Stappenplan

Volgorde: eerst besluiten en kleine fouten, dan het fundament, dan de
funnel (daar zit de conversie), dan de landingspagina's (daar komt het
verkeer binnen), dan de rest, en tot slot borging. Elke fase levert op
zichzelf een zichtbare verbetering en kan apart via een preview worden
beoordeeld. Inschattingen zijn bouwdagen, exclusief jouw beoordeling.

**Fase 0: besluiten en directe fouten (1 dag). Gedaan, 18 september.**
Wat er is gedaan, allemaal zonder ontwerpkeuze en los van de rest:
- "+31 6 ..." in `FinalCTA` vervangen door 0562 700 208 als belknop.
- Dubbele Jubileum-link op Groepsweekend en Familieweekend vervangen door
  "Activiteiten op Vlieland".
- `id="main-content"` (het doel van de skip-link) op alle 30 pagina's
  waar `<main>` het miste; Evenementen had geen `<main>` en heeft er nu
  een.
- Dode klasse `shadow-elegant` in `RouteCards` vervangen door
  `shadow-medium`.
- Eén toastsysteem: `src/hooks/use-toast.ts` is nu een dunne laag op
  sonner met dezelfde API (`toast({ title, description, variant, action })`),
  zodat de 74 bestaande aanroepen ongewijzigd blijven; de radix `Toaster`,
  `ui/toast.tsx` en `ui/toaster.tsx` zijn weg, de twee
  `ToastAction`-knoppen (bulk-snooze in admin, "Bekijk" in de
  programma-editor) zijn sonner-acties geworden, en `variant:
  "destructive"` toont een rode rand en tekst via de `error`-klasse in
  `ui/sonner.tsx`. Het pakket `@radix-ui/react-toast` staat nog in
  `package.json` maar wordt niet meer gebruikt (lockfiles bewust niet
  aangeraakt).
- "u" in de funnel: "Check je inbox" (toast en successcherm), "Wanneer
  willen jullie komen?", "Je kunt alles nog controleren", de Offerte-FAQ en
  het tekstveld-voorbeeld, de logies-offertepagina, het gedeelde programma
  en de chatwidget. De "je"-teksten op Wadlopen, Zeehondentochten,
  Activiteiten Vlieland, Programma's en de privé-landingspagina's blijven
  staan tot fase 3, omdat die pagina's daar toch opnieuw worden opgebouwd.
- Responstijd uit één bron: `src/content/promises.ts` (`RESPONSE_TIME`,
  "binnen 5 werkdagen een voorstel") vervangt de 1-, 2- en 1-3-daagse
  beloftes op 14 plekken (catering, logies, maatwerk, werkwijze, FAQ,
  bouwstenen, offerte, bedrijfsuitje, logies-wizard, klantpagina).
  Bewust gelaten: "we reageren doorgaans binnen één werkdag" (Contact-FAQ)
  en "binnen één werkdag antwoord van een vast aanspreekpunt" (Catering),
  omdat dat over een reactie gaat en niet over een voorstel. Als Erwin die
  ook op vijf dagen wil, is dat één regel per plek. E-mailteksten in de
  database vallen buiten deze wijziging.
- Sluitknop-label "Close" in dialogen en sheets is "Sluiten".
- Meten vóór fase 2: `trackWizardStep` in `src/lib/analytics.ts` stuurt
  per getoonde wizardstap één `wizard_step_view`-event (wizard, stap,
  volgnummer, totaal) naar de dataLayer; `ProgrammaSamenstellen` roept het
  aan bij elke stapwissel. In GA4 moet dit event nog als gebeurtenis
  worden geregistreerd (Beheer → Gebeurtenissen) om er een afhaaktrechter
  van te maken.

Bewust niet gedaan: `EmptyCartTips` is wél in gebruik (programma-editor en
klantpagina), dus blijft; `DraftRecoveryDialog` dwingt bewust een keuze af
en is daarom niet met Esc te sluiten, dat is geen fout.

**Fase 1: fundament (3–4 dagen).**
Tokens uitbreiden in `src/index.css` en `tailwind.config.ts` (radius,
typeschaal, motion, containerbreedtes), `Button`/`Pill`/`Notice`/
`Container`/`Section`/`SectionHeader` bouwen, de fontlaad terugbrengen.
Let op bij de actiekleur (besluit 1): `Button` wordt ook door het admin-
en partnerportaal gebruikt. Voorstel: een token `--action` dat in het
publieke deel zonsondergang-oranje is en in de portalen oceaanblauw
blijft, zodat de portalen niet ongevraagd van kleur veranderen; of ook
daar oranje, dat is een aparte, kleine keuze tijdens fase 1.
Verder in fase 1: `useReducedMotion` toevoegen,
`useReducedMotion` toevoegen, en een lintregel (ESLint `no-restricted-
syntax` op klassenamen, of een klein script in CI) die losse paletklassen,
`rounded-2xl/xl`, Tailwind-`shadow-*` en `text-white` buiten `ui/`
tegenhoudt. Daarnaast `docs/design-systeem.md` als levende referentie en
een niet-geïndexeerde pagina `/ontwerp` (alleen buiten productie) waarop
alle componenten naast elkaar staan, zodat jij ze in de preview kunt
beoordelen zonder door de site te klikken.

Fase 1 is op 18 september gebouwd. Wat er staat: tokens voor de actiekleur
(`--action`, publiek oranje, admin en partnerportaal blauw via
`data-surface`), inkt- en zachte statuskleuren, radius 8px/4px met de
Tailwind-namen `xl`/`2xl`/`3xl` op dezelfde 8px, drie schaduwen waar de
Tailwind-namen naar wijzen, drie duren, typeschaal `display-xl/lg/md` en
`eyebrow`; `Button` met `default` in de actiekleur, `secondary` licht,
`inverse`/`inverseOutline` op donker, `brand` voor zwevende hulpknoppen,
sizes t/m `xl`; `Container`, `Section`, `SectionHeader`, `Pill` (met
`MicroPill` en `ItemDisplayStatusBadge` erop), `Notice`; `SurfaceTheme`;
`MotionConfig reducedMotion="user"` plus de css-regel voor
`prefers-reduced-motion`; de referentiepagina `/ontwerp` (alleen buiten
productie); `scripts/check-design-debt.ts` met plafond `DESIGN_DEBT_MAX`
in CI; `docs/design-systeem.md`. Meegenomen omdat het één beweging was:
alle publieke knop-overrides (`bg-accent`, `bg-primary`, `heroPrimary`,
witte knoppen op blauwe banden) zijn omgezet naar de varianten, waardoor
ook een echte fout is verdwenen: op negen landingspagina's was de
primaire knop "Stel uw programma samen" blauw op een blauwe band en dus
onzichtbaar. Niet gedaan: de fontlaad terugbrengen (Fraunces 600/700
worden nog op 190 plekken gebruikt tot fase 3 en 4 de koppen omzetten;
alleen 900 is weg) en de lintregel als ESLint-regel (het plafondscript
doet hetzelfde en past bij de bestaande CI-poorten).

**Fase 2: funnel (5–6 dagen).** Programma-samenstellen, Snel-aanvragen,
Programma op maat, Logies-aanvragen, Catering-aanvragen, Offerte en
Direct boeken over op `Stepper`, `WizardFooter`, `FormField` en de
veldcomponenten, `OptionCard`, `SuccessScreen`, `FloatingLayer`, sheets
als bottom-sheet op mobiel, aanraakdoelen, prijs op de bouwer-kaarten
(open roadmap-punt: ontwerpkeuze per stuk/dag/totaal hoort bij deze
fase). Meetbaar: wizard-stap-events naar GA4 (open roadmap-punt, zelfde
mechanisme als `data-analytics-section`) vóór de wijziging aanzetten,
zodat we voor/na per stap kunnen vergelijken.

Fase 2 deel 1 is op 18 september gebouwd: de programma-wizard. Nieuwe
componenten in `src/components/system`: `Stepper` (op een telefoon één
regel met voortgangsbalk, daarboven genummerde cirkels), `WizardFooter`
(Terug links, "Volgende: …" rechts, op de laatste stap "Aanvraag
versturen" met `SubmitNote` eronder), `FormField` (label, icoon vooraan,
hulptekst, foutmelding via `aria-describedby`), `OptionCard` en
`OptionGroup` (keuzekaartjes als radiogroep), `SuccessScreen`,
`SubmitNote`, `EmptyState` en `LoadingState`; `SectionHeader` kreeg
`size` en `weight` zodat de funnel dezelfde kop gebruikt, iets kleiner
en middelzwaar. Alle stappen van `/programma-samenstellen` staan erop:
basisgegevens, voorbeeldprogramma, logies, vervoer en fietsen (of
startpunt en fietsen), programma, gegevens en bevestiging. De foto-hero
met Ken Burns is een rustige donkere kop geworden met de stappen eronder;
`CheckoutStepIndicator` is weg, de knipperende "ping" bij het
voorbeeldprogramma-banner ook; de bouwerknop "Overzicht en versturen"
heet "Volgende: uw gegevens", de contactvelden hebben `autocomplete`, en
de privacyregel is de ene `SubmitNote`. Bij een stapwissel scrolt de
pagina naar de stappenbalk (de volgende-knop staat onderaan de vorige
stap). Een echte fout op de telefoon is weg: de chatknop en de zwevende
programma-knop stonden op de programmastap over "Volgende" heen; de vaste
balk meldt nu zijn hoogte (`--floating-offset`) en de programma-knop is
in de wizard zelf verborgen. Ontwerpschuld van 815 naar 806.
Deel 2 van fase 2: de overige aanvraagformulieren (Snel aanvragen,
Programma op maat, Logies, Catering, Offerte, Direct boeken) op dezelfde
componenten, de zwevende laag (chat, programma-knop, vaste balk), sheets
als bottom-sheet op mobiel, aanraakdoelen, en de prijzen in de bouwer
(ontwerpkeuze per stuk, per dag of totaal door Erwin).

Fase 2 deel 2 is op 19 september gebouwd: de overige aanvraagformulieren.
Nieuw: `FunnelHead` (de donkere kop van elke funnelpagina), `StepperBar`
(de stappenbalk op volle breedte, met `useScrollOnStepChange`),
`OptionCard` met `selection="multiple"`, `SuccessScreen` met `as="h1"`.
Omgezet: Snel aanvragen (drie stappen in de stappenbalk, lege staat als
`EmptyState`), Programma op maat (keuzekaartjes, velden met foutmelding,
bevestiging met link naar de programmapagina), Offerte (zelfde velden en
voet als de wizard, bevestiging in de pagina in plaats van een toast en
een leeg formulier), Catering (keuzekaartjes, waarschuwing bij korte
aanlooptijd als `Notice`, bevestiging in de pagina in plaats van een
doorverwijzing naar de homepage; het vinkje "ik begrijp dat dit
vrijblijvend is" is weg, de `SubmitNote` zegt hetzelfde), Logies (vijf
stappen in de stappenbalk, keuzekaartjes voor type, kamertype, locatie,
verzorging en budget, bevestiging in de pagina zonder de automatische
doorverwijzing na 2,5 seconde), Activiteiten boeken en de boekingsstatus
(kop, lege en ladende staat). Overal dezelfde knop "Aanvraag versturen"
met "Versturen…" als laadtekst; "Verzenden…", "Vrijblijvend aanvragen",
"Verstuur aanvraag" en "Offerte Aanvragen" zijn weg. Het ongebruikte
`MaatwerkIntakeForm` is verwijderd. Ontwerpschuld van 806 naar 800, lint
van 1193 naar 1192. Na Erwins eerste blik (19 september): de datumkiezer
op Offerte is de kalender met Nederlandse notatie in plaats van het
browserveld (dat toonde mm/dd/yyyy in Engelstalige browsers), de
budgetindicatie is niet meer verplicht (veel gasten hebben nog geen idee;
de edge function `send-quote-request` accepteert een leeg budget en zet
"Niet opgegeven" in de mail), en de emoji's bij de logieskeuzes (type
verblijf, locatie, verzorging) zijn lijniconen uit de vaste set geworden
(`src/lib/accommodationIcons.ts`): emoji's tekent elk besturingssysteem
anders en in kleur, en dat paste niet bij de rest. Het veld `icon` in
`src/types/accommodation.ts` blijft bestaan voor de portalen. Deel 3 van fase 2: de zwevende laag (chat,
programma-knop, vaste balk als één `FloatingLayer`), sheets als
bottom-sheet op mobiel, aanraakdoelen, en de prijzen in de bouwer.

**Fase 3: landingspagina's als sjabloon (4–5 dagen).** Eén
`LandingPage`-component gevoed door een inhoudsbestand per pagina
(`src/content/landings/*.ts`: titel, intro, foto's, eilandfeiten, FAQ,
verwante routes). De 12 pagina's worden dan data in plaats van code; een
ontwerpwijziging is één wijziging. Opbouw per pagina: `Breadcrumb`,
`PageHero photo` met één CTA, korte intro met `FactList`, twee of drie
`MediaCard`s met echte programma's of activiteiten (uit de database, niet
statische tegels), `PersonQuote`, `RouteChooser`, `Faq`, `RelatedLinks`
(één linkblok in plaats van drie). Sticky mobiele CTA ook hier.
Wadlopen en Zeehondentochten (met boekpaneel en reviews) worden een
tweede variant van hetzelfde sjabloon.

**Fase 4: overige pagina's en homepage (4–5 dagen).** Werkwijze, Over
ons, Voor wie, Contact, Catering, Logies, Bouwstenen, Voorbeeldprogramma's,
Partners, Evenementen, FAQ en 404 over op `PageHero`, `Section`,
`RouteChooser` en de kaarten; decoratie (golven, bollen, korrel) eruit;
eyebrow en sectienummers uniform. Homepage: `Testimonials`, `RoutePicker`
en `UpcomingActivitiesFeed` in lijn brengen met de rest van de homepage,
`RoutePicker` op mobiel compact (lijst met één foto in plaats van vier
volle schermen), ontbrekende sectienummers, `CateringHighlight`-knop naar
`Button`. Dode bestanden (`Hero.tsx`, `Services.tsx`, `components/
Contact.tsx`, `drawer.tsx`) verwijderen.

**Fase 5: borging (1–2 dagen).** De lintregel hard maken in CI, een
visuele-regressietest met Playwright (het screenshotscript uit dit
onderzoek, in `tests/e2e/visual`, per pagina op desktop en mobiel,
vergelijken tegen een vastgelegde referentie), `docs/design-systeem.md`
afronden, en een korte checklist voor nieuwe pagina's ("gebruik
`PageHero`, eindig met `RouteChooser`, geen losse kleuren"). Admin- en
partnerportaal blijven buiten scope maar erven de tokens; die kunnen
later per scherm worden bijgetrokken.

Totaal ongeveer 18 tot 23 bouwdagen, verspreid over meerdere pull
requests zodat elke fase apart op een preview te beoordelen is en de
CI-plafonds (`.github/quality-baselines.env`) per stap omlaag kunnen.

## Besluiten (genomen door Erwin, 18 september 2026)

1. **Actiekleur: zonsondergang-oranje.** Eén knopkleur voor de primaire
   actie, sitebreed, en nergens anders gebruikt; oceaanblauw voor alles wat
   "merk" is. Enige uitzondering: de cursieve regel in de hero-kop.
   Gevolg: de navigatieknop, de sticky mobiele knop, de RoutePicker-
   markering en alle CTA-banden worden oranje; `secondary`/`accent`
   verdwijnen als knopkleur. Voor de portalen zie de opmerking bij fase 1.
2. **Redactioneel op alle marketingpagina's.** Fraunces licht en groot
   op elke publieke pagina, niet alleen op de homepage; de funnel in
   dezelfde familie maar rustiger (middelzwaar, kleiner).
3. **Landingspagina's als één sjabloon** met inhoudsbestanden
   (`src/content/landings/*.ts`). Een nieuwe doelgroep-pagina is dan een
   inhoudsbestand, geen nieuwe component.
4. **Aanspreekvorm "u"** op alle publieke pagina's en in de funnel; "je"
   alleen op de deelnemerspagina en in WhatsApp. Fase 0 heeft de funnel
   gedaan, fase 3 doet de landingspagina's.
5. **Responstijd: binnen één werkweek (5 werkdagen) een voorstel.**
   Vastgelegd in `src/content/promises.ts`; zie fase 0 voor de twee
   reactietijd-zinnen die bewust zijn blijven staan.
6. **Volgorde: funnel vóór landingspagina's.** Fase 2 komt vóór fase 3,
   zoals hierboven.

## Afgesproken volgorde (18 september 2026)

De roadmap en dit plan zijn samengevoegd tot één volgorde. Elke stap is
een eigen pull request met Netlify-preview, die Erwin goedkeurt voordat de
volgende begint.

1. **Gedaan: fase 0** (deze pull request, met het plan zelf): directe
   fouten, "u" in de funnel, één toastsysteem, responstijd uit één bron,
   en meetpunt `wizard_step_view` zodat fase 2 meetbaar wordt.
2. **Wizard-vervolg van 16 september** (roadmap). Gedaan op 18
   september: MAP-beschikbaarheid op de programmakaarten, de
   werkbanktaak "Beschikbaarheidsconflict" die nu vanzelf sluit als de
   aanbieder de sluiting intrekt, en de zaalhuur in "Vergaderdag+" is
   door Erwin gepubliceerd. Parallel, door Erwin in GA4:
   `program_request_submitted` en `wizard_step_view` als gebeurtenissen
   registreren, zodat de nulmeting loopt vóór fase 2 live gaat.
3. **Fase 1: fundament.** Gedaan op 18 september: tokens, `Button` met
   oranje actiekleur, `Pill`, `Notice`, `Container`, `Section`,
   `SectionHeader`, plafond op ontwerpschuld in CI, referentiepagina
   `/ontwerp`, `docs/design-systeem.md`.
4. **Fase 2: funnel.** Hierin gaan ook de roadmap-punten "prijzen
   zichtbaar in de programma-bouwer" (ontwerpkeuze: per stuk, per dag of
   totaal) en de logiesstap-afronding mee, omdat het dezelfde schermen
   zijn. Deel 1 (de programma-wizard met de nieuwe componenten) is op 18
   september gebouwd, deel 2 (de overige aanvraagformulieren) op 19
   september; deel 3 (zwevende laag, sheets op mobiel, prijzen) volgt.
5. **Fase 3: landingspagina's als sjabloon.** Hierin gaan mee: "reviews
   zichtbaarder maken" (concurrentiepositie punt 3, vaste plek voor
   reviews in het sjabloon), de "je"-teksten van de resterende pagina's,
   en de attributie per landingspagina uit `plan-frontend-usability.md`
   fase 3.
6. **Fase 4: overige pagina's en homepage.** Hierin gaan de open
   homepage-bevindingen van 11 september mee (sectienummers, Testimonials
   naar voren, overlappende secties beoordelen met de GA4-sectiedata).
7. **Fase 5: borging.**

Los hiervan, zonder bouwwerk of door Erwin zelf: Lovable Cloud opruimen,
storage-bucket, zelftest controleren, partnerprofielen, MAP-aanbieders,
uitschrijflink. Sentry "Script error" blijft liggen.

## Meetpunten

- Voor/na per fase: aanvragen per week, annuleringspercentage, aandeel
  aanvragen met logies (baseline 18%), getekend (baseline 3 van 33).
- Na fase 2: afhaakpunt per wizardstap (events aanzetten vóór de
  wijziging).
- Na fase 3: aanvragen per landingspagina (vereist dat
  `program_request_submitted` in GA4 als belangrijke gebeurtenis staat,
  zie `docs/plan-frontend-usability.md`, fase 3).
- Technisch: aantal losse paletklassen en Button-overrides buiten `ui/`
  (nu 60+ en 30+) naar 0; lint- en strict-plafonds omlaag.

## Bijlage: tellingen in één oogopslag

| Onderwerp | Aantal varianten nu | Doel |
|---|---|---|
| Hero-types | 7 | 3 |
| CTA-banden onderaan pagina's | 5 | 1 (`RouteChooser`) |
| Kaartimplementaties | 11 | 5 |
| Badge/pill-systemen | 5 | 1 |
| Stapindicatoren | 6 (+2 statisch) | 1 |
| Succesbeelden | 5 (+1 ontbrekend) | 1 |
| Validatiepatronen | 4 | 1 |
| Datumkiezers | 4 | 1 |
| Optiekaarten | 5 | 1 |
| Toastsystemen | 2 tegelijk | 1 |
| FAQ-implementaties | 4 | 1 |
| Hoekradii | 6 | 2 (+ full) |
| Schaduwsystemen | 4 | 1 |
| Sectiepaddings | 9 | 3 |
| Containerbreedtes | 8 | 4 |
| Eyebrow-stijlen | 9 | 1 |
| h1-formaten | 8 | 2 |
| Fraunces-gewichten in gebruik | 5 | 3 |
| Kleurrecepten voor 3 statussen | 9+ | 4 tokens |
| Verzendwerkwoorden | 7 | 1 |
| Responstijd-beloftes | 4 | 1 |
