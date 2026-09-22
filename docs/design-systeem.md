# Ontwerpsysteem: de levende referentie

Status: fase 1 (fundament) gebouwd op 18 september 2026. Dit document is de
regel; `docs/plan-design-systeem.md` is het onderzoek en het plan erachter.
Alle componenten staan naast elkaar op `/ontwerp` (alleen op previews en
lokaal, niet in productie).

## Vijf principes

1. **Het eiland als bestemming, redactioneel.** Fraunces licht (300) en groot
   voor koppen op marketingpagina's, cursief als accent, ruimte, foto's die
   het werk doen. In de funnel dezelfde familie, maar rustiger (500, kleiner).
2. **Eén pad, één actie.** Eén primaire knop per scherm, altijd in de
   actiekleur. Nooit twee even zware knoppen naast elkaar.
3. **Lokaal en persoonlijk, met echte feiten.** Foto's, mensen en
   eilandfeiten in plaats van iconen in cirkels en generieke USP's.
4. **Zelfbediening met vertrouwen.** Prijs, beschikbaarheid en status overal
   in dezelfde vorm en kleur; "vrijblijvend" en de responstijd
   (`src/content/promises.ts`) op één vaste plek naast de knop.
5. **Rust.** Decoratie alleen met functie. Beweging alleen als het iets
   betekent, en nooit voor wie `prefers-reduced-motion` aan heeft.

## Tokens (`src/index.css`, `tailwind.config.ts`)

| Token | Klasse | Gebruik |
|---|---|---|
| `--primary` (oceaanblauw) | `bg-primary`, `text-primary` | Merk: koppen, links, iconen, blauwe banden |
| `--ocean-deep` | `bg-ocean-deep` | Donkere secties |
| `--action` | `bg-action`, `text-action-foreground`, `hover:bg-action-hover` | Dé primaire knop. Publiek zonsondergang-oranje, in admin en partnerportaal blauw (`[data-surface="portal"]`, gezet door `SurfaceTheme`) |
| `--sunset` | `text-sunset` | Alleen de cursieve regel in de hero-kop en de "Meest gekozen"-markering. Niet voor knoppen, niet voor eyebrows |
| `--sand` | `bg-sand`, `text-sand` | Warme tussensecties, eyebrow en intro op donker |
| `--accent-soft` | `bg-accent-soft` | Secundaire knop, zachte vlakken |
| `--muted` | `bg-muted`, `text-muted-foreground` | Lichte vlakken, hover, bijschriften |
| `--info` / `--success` / `--warning` / `--destructive` | `bg-*`, `bg-*-soft`, `text-*-ink` | Status: uitleg / goed / aandacht / geblokkeerd. Zacht vlak plus inkt voor pills en meldingen, vol vlak voor iconen en puntjes |
| `--radius` = 0.5rem | `rounded-sm` 4px, `rounded-lg` 8px, `rounded-full` | Knoppen, velden en chips 4px; kaarten en overlays 8px; rond alleen voor avatars, puntjes en tags. `rounded-xl/2xl/3xl` zijn ook 8px (overgang) |
| `--shadow-soft/medium/dramatic` | `shadow-soft`, `shadow-medium`, `shadow-dramatic` | Kaart, zwevend element, hero-foto. `shadow-sm/md/lg/xl/2xl` wijzen naar dezelfde drie (overgang) |
| `--duration-fast/base/slow` | `duration-fast`, `duration-base`, `duration-slow` | 150ms hover, 300ms staatwissel, 700ms entree |
| typeschaal | `text-display-xl`, `text-display-lg`, `text-display-md`, `text-eyebrow` | Hero-kop, sectiekop, kaarttitel, eyebrow |

Verboden buiten `src/components/ui` en `src/components/system`: losse
paletkleuren (`bg-amber-50`, `text-green-600`, …), `text-white`/`bg-white`
(gebruik `primary-foreground`), `hsl(var(--…))` met de hand, eigen
eyebrow-stijlen, kleur- of hoogte-overrides op `<Button>`. Het script
`scripts/check-design-debt.ts` telt deze en CI bewaakt het plafond
`DESIGN_DEBT_MAX` in `.github/quality-baselines.env`: het getal mag alleen
omlaag. `bunx tsx scripts/check-design-debt.ts --list` toont elke vindplaats.

## Componenten (`src/components/system`, `src/components/ui`)

| Component | Waarvoor | Niet meer gebruiken |
|---|---|---|
| `Button` (`ui/button.tsx`) | `default` = primaire actie; `secondary` licht; `outline`/`ghost`/`link` ondergeschikt; `inverse`/`inverseOutline` op donker; `brand` (merkblauw) alleen voor zwevende hulpknoppen zoals de chat; `destructive`. Sizes `sm` 36, `default` 40, `lg` 48, `xl` 56px | `className` met `bg-*`, `h-*`, `rounded-*`, `text-lg`; `heroPrimary`/`heroOutline` (oude namen, werken nog) |
| `Container` | Breedte: `prose` 48rem, `content` 64rem, `wide` 80rem, `full` 1400px | Losse `max-w-*` en `container mx-auto px-4` |
| `Section` | Toon (`default`, `muted`, `sand`, `dark`, `card`) en ruimte (`compact`, `default`, `spacious`) | Losse `py-*` en `bg-*` op secties |
| `SectionHeader` | Eyebrow (met nummer), kop (`h1`/`h2`/`h3`), intro; `onDark` voor donkere secties; `align="center"` | Eigen eyebrow-stijlen, vette Fraunces-koppen |
| `Pill` | Status- en infolabel met toon `neutral`/`info`/`success`/`warning`/`danger`/`purple`/`brand` | `MicroPill` (oude naam, werkt nog), losse `Badge`-kleuren, gekleurde `<p>` |
| `Notice` | Melding in de pagina met toon `info`/`success`/`warning`/`danger` | Gekleurde `div`s met eigen rand en achtergrond |
| `SurfaceTheme` | Zet `data-surface` op `public` of `portal` per route | – |
| `FunnelHead` | De kop van elke funnelpagina: donkere band met eyebrow, h1 en intro, zonder foto of beweging | Foto-hero's met Ken Burns, gekleurde koppen met badge en USP-iconen |
| `Stepper` in een `StepperBar` | Stappen van een wizard: op een telefoon één regel met voortgangsbalk, vanaf `sm` genummerde cirkels met labels. Merkblauw, niet de actiekleur. `StepperBar` is de balk op volle breedte onder de `FunnelHead`; geef een `ref` mee voor `useScrollOnStepChange` | Eigen stappenrijen en voortgangsbalken per formulier (`CheckoutStepIndicator` is weg) |
| `WizardFooter` | Onder elke stap: Terug links (ghost), de volgende stap rechts (primair, `size="lg"`), op een telefoon gestapeld met de primaire knop bovenaan. `nextType="submit"` in een formulier, anders `onNext`; `nextLoading` toont "Versturen…"; `note` voor de regel eronder | Losse `flex justify-between`-rijen met eigen knoppen |
| `FormField` | Label (met `*` bij verplicht, optioneel wordt nooit gemarkeerd), icoon vooraan via `leading`, hulptekst, foutmelding die de hulptekst vervangt; zet `id`, `aria-invalid` en `aria-describedby` op het veld | `Label` + `Input` + losse rode `<p>` |
| `OptionCard` in een `OptionGroup` | "Kies één"-vragen als kaartjes (`role="radio"` in een `radiogroup`) en met `selection="multiple"` "kies meerdere" (`role="checkbox"`): titel, omschrijving, icoon, `align="center"` voor korte opties, 1–4 kolommen. Laat het `label` weg als een kop erboven de vraag al stelt en geef dan `name` | Eigen `<button>`-kaarten met `border-primary bg-primary/5`, `RadioGroup` met gestylede `Label`s |
| `SuccessScreen` | Na versturen: wat er is gebeurd, wat er nu gebeurt (`intro`), referentie, één primaire en één secundaire vervolgstap | Eigen bevestigingsschermen, aftellingen en automatische doorverwijzingen |
| `SubmitNote` | De regel onder een verstuurknop: vrijblijvend, de responstijd uit `src/content/promises.ts`, de voorwaarden | Eigen privacy- en voorwaardenregels per formulier |
| `EmptyState` / `LoadingState` | Lege lijst met icoon, tekst en actie; laadstatus met spinner en `aria-live` | Losse "Geen …"-teksten, eigen spinners |
| `FloatingStack` | De zwevende knoppen rechtsonder (chat, programma): staat boven een vaste balk (`useFloatingBar`) en wijkt voor de footer en voor een `WizardFooter` in beeld (`useFloatingClearance`); `z-40` | Eigen `fixed bottom-4 right-4`-blokken |
| `ResponsiveSheetContent` | Sheet die op een telefoon van onderen komt (ronde bovenhoeken, max. 85% hoog) en op een groter scherm van rechts | `SheetContent side="right"` in de funnel; het navigatiemenu blijft van rechts komen |
| `PageHero` | Hero van elke marketingpagina: foto met een verloop uit `ocean-deep`, eyebrow, h1 en intro (`SectionHeader onDark`), één primaire actie en één `inverseOutline`-knop; zonder foto een rustige donkere band (Contact, Veelgestelde vragen, 404). `cta.to` mag ook een anker (`#boeken`) of `mailto:` zijn | Eigen hero's met Ken Burns, golven en gradient-overlays, gecentreerde vette koppen, twee gelijkwaardige knoppen |
| `FactList` | De eilandfeiten als definitielijst in een kaart naast de intro (overtocht, vervoer, groepsgrootte, voorstel); met `title`, `summary` en een icoon per feit is het de kaart "In het kort" van een activiteitpagina | USP-iconen in een rij, losse feitengrids, `KeyFacts` op landingspagina's |
| `MediaCard` | Kaart met foto, eyebrow ("3 dagen · Avontuur"), Fraunces-kop en tekst, als link; optioneel een pill op de foto (`badge`, "Nieuw"), een regel voor prijs of doelgroep (`footer`) en een eigen linktekst (`linkLabel`). Voor programma's en activiteiten uit de database en de cateringformats; zonder foto een zachte plaatshouder | Statische fototegels in code, `Card` met eigen hover, `ProgramCard` (weg) |
| `CatalogCard` | Kaart uit een catalogus met prijs en knoppen: foto en titel linken naar de detailpagina, pills op de foto (categorie, "Direct boekbaar"), onderin de prijs, één primaire knop, optioneel een tweede (`outline`) en een kleine tekstlink. Voor de bouwstenen en direct boekbare activiteiten uit de boekmodule | De eigen bouwsteenkaart en `BookableOnlyCard` met `Badge`, `Card` en drie knopstijlen |
| `LinkCard` | Kleine linkkaart zonder foto: titel, één regel tekst, pijl en optioneel pills (duur, geschiktheid) en een icoon in een accentcirkel (`icon`). Voor `RelatedLinks`, `SeeAlsoActivities`, de thema's op Activiteiten op Vlieland, de resultaten van `ActivityFilter` en de routes op de homepage | Eigen linktegels, `Card` in een `Link`, de routekaarten met foto |
| `PersonQuote` | Eén klantcitaat in Fraunces met naam en organisatie, op een `sand`-sectie | Citatencarrousels, `Quote`-iconen, sterren bij een handmatig citaat |
| `RouteChooser` | De donkere slotsectie "Klaar om te beginnen?" met de drie routes: zelf samenstellen (primaire actie), op maat, voorbeelden. `title` en `intro` per pagina; een pagina met een ander publiek geeft eigen `routes` mee (Samenwerken: contact, bouwstenen, voorbeelden; Catering: cateringaanvraag, maatwerk, contact; Logies: logies aanvragen, programma, op maat). Met `id` is het ook het anker voor een knop hogerop de pagina (Catering: `#aanvraag`) | De vijf CTA-banden en `FinalCTA`-varianten, "Neem contact op"-banden, het aanvraagblok met vier icoonkaarten |
| `ActivityPage` (`components/landing`) | De tweede sjabloonvariant, voor één boekbare activiteit (Wadexcursie, Zeehondentocht): zelfde opbouw als `LandingPage` maar met de kaart "In het kort", een boekblok (`DirectBookingPanel` zodra de bouwsteen aan de boekmodule hangt, anders het aanvraagformulier) en TouristTrip-structured data; geen `RouteChooser`, de actie is boeken. Inhoud in `src/content/landings/<slug>.ts` met `kind: "activity"`; de feiten (duur, prijs, groepsgrootte) worden bewaakt tegen `src/content/activityContent.ts` | Eigen activiteitpagina's met `KeyFacts`, losse accordions en drie linkblokken |
| `BodySection`, `FeatureGrid`, `Checklist`, `Paragraphs` (`components/landing/sections`) en `sectionCounter` | De sectiesoorten van de inhoudsbestanden, ook los te gebruiken op een verhaal- of cataloguspagina (Samenwerken en Catering bouwen hun secties als `LandingSection`-objecten; Voor wie gebruikt `FeatureGrid` en `Checklist`). Een `split` heeft optioneel een knop (`cta`, `secondary`) en de foto links (`imagePosition`). `sectionCounter()` geeft elke sectie een nummer en wisselt de toon (`muted`, `default`); roep hem aan in de volgorde van de pagina, vóór de JSX | Eigen kaartrasters, vinkjeslijsten en handmatige sectienummers |
| `ProcessSteps` (`components/werkwijze`) | Genummerde stappen als kaarten met icoon; standaard de zes van de werkwijze, met eigen `steps`, `title` en `intro` ook elders (Logies: vier stappen van wens naar boeking) | Eigen stappenrijen met genummerde cirkels |
| `ReferenceCaseView`, `ReferenceTimeline`, `ReferenceCard` (`components/referenties`) | De inhoud van een referentiepagina (`PageHero` met de eerste foto van het programma, tekst met `FactList` "In het kort", de tijdlijn per dag uit de momentopname, `PersonQuote`), gedeeld door de publieke pagina en de akkoordpagina voor de klant, zodat die precies ziet wat online komt; de kaart in het overzicht is een `MediaCard` | Eigen tijdlijnen en kaarten voor referenties |
| `LandingPage` (`components/landing`) | Het ene sjabloon voor de landingspagina's, gevoed door `src/content/landings/<slug>.ts` (geregistreerd in `index.ts` en `paths.ts`): kruimelpad, `PageHero`, intro met `FactList`, genummerde secties (`prose`, `features`, `gallery`, `split`), voorbeeldprogramma's uit de database, `PersonQuote`, Google-reviews, `RouteChooser`, `FaqSection`, één `RelatedLinks` | Een pagina-component per landingspagina; een nieuwe landingspagina is een nieuw inhoudsbestand |

`FaqSection`, `LandingBreadcrumb`, `ReviewsBlock` (eigen beoordelingen en Google-reviews) en `RelatedLinks`
staan sinds fase 3 op `Section`, `Container` en `SectionHeader`; een aparte
`Faq` en `Breadcrumb` zijn niet meer nodig. Antwoorden in `FaqSection` mogen
links bevatten als `[tekst](/pad)`; de structured data krijgt de platte tekst.
Sinds fase 4 deel 1 staan ook de verhaalpagina's (Werkwijze, Over ons, Voor
wie, Samenwerken, Contact, Evenementen, Veelgestelde vragen, Eilandpartners,
404) op deze componenten, en sinds deel 2 de cataloguspagina's: Catering,
Logies, Bouwstenen, Voorbeeldprogramma's (overzicht en detail), Activiteiten
op Vlieland en de activiteitdetailpagina's uit de database. Sinds deel 3 ook
de homepage: de redactionele secties (hero, bouwstenen, catering,
voorbeelden, het verhaal, begin hier) houden hun grote Fraunces-koppen en
cursieve accenten, maar eyebrow en sectienummer komen uit `SectionHeader`
(`size="xl"`), de routekeuze is één `MediaCard` plus `LinkCard`s, de live
agenda en de klantquotes staan op `MediaCard`, `Pill` en de zandsectie. De
live agenda heeft bewust geen nummer: die is soms leeg. De Google-score
komt overal uit `useGoogleReviewsCache` en de sterren uit `RatingStars`
(zonsondergang, niet geel).

## Regels voor interactie

- Eén primaire knop per scherm; de tweede actie is `secondary`, `outline`,
  `ghost` of `link`. Op een donkere band: primair plus `inverseOutline`.
- Knoppen op mobiel volle breedte in wizards; aanraakdoelen minimaal
  44×44px.
- Verzendknop heet "Aanvraag versturen", laadtekst "Versturen…".
  "Vrijblijvend" en de responstijd staan in één regel onder de knop.
- Aanspreekvorm "u" op alle publieke pagina's en in de funnel.
- Status: goed = success, aandacht = warning, geblokkeerd = destructive,
  uitleg = info. Schaarste ("bijna vol") is warning.
- Prijs altijd via `formatBlockPrice`, met dezelfde notitie op elke plek.
- Beweging: entree 700ms alleen in de hero; staatwissel 300ms; nooit
  oneindig behalve een spinner. `MotionConfig reducedMotion="user"` in
  `App.tsx` en de `prefers-reduced-motion`-regel in `index.css` zetten alles
  uit voor wie dat wil.
- Eén toastsysteem (sonner via `useToast`). Eén meldingscomponent in de
  pagina (`Notice`).
- Elke funnelpagina begint met een `FunnelHead`; een wizard heeft daaronder
  een `StepperBar`. Elk aanvraagformulier eindigt met een `WizardFooter`
  (Terug links, "Volgende: …" rechts, op de laatste stap "Aanvraag
  versturen" met de `SubmitNote` eronder; op een telefoon gestapeld met de
  primaire knop bovenaan) en na versturen een `SuccessScreen` in de pagina,
  zonder aftelling of automatische doorverwijzing. Bij een stapwissel
  scrollt de pagina naar de stappenbalk (`useScrollOnStepChange`).
  Koppen in de funnel: `SectionHeader` met `size="md"` en
  `weight="medium"`, en "en" in plaats van "&" (de Fraunces-ampersand oogt
  als een vreemd teken).
- De zwevende laag: alles wat zweeft staat in `FloatingStack` (`z-40`).
  Een vaste balk onderaan meldt zijn hoogte met `useFloatingBar`
  (`--floating-offset` op `<html>`, `z-30`), zodat de knoppen erboven
  staan; een `WizardFooter` in beeld laat ze wijken
  (`useFloatingClearance`); de footer ook. Funnelinhoud eindigt met
  `pb-floating`, zodat de laatste knop er nooit onder komt. Sheets en
  dialogen zitten op `z-50`, daarboven alleen de cookiebalk.
- Aanraakdoelen: op een aanraakscherm (`coarse:`, `pointer: coarse`) is
  elke knop minimaal 44px hoog en een icoonknop 44×44; kalenderdagen ook.
  Op desktop blijft de dichtheid zoals hij is. Sheets in de funnel komen
  op een telefoon van onderen (`ResponsiveSheetContent`).
- Landingspagina's: de inhoud staat in `src/content/landings/<slug>.ts`,
  nooit in een pagina-component. Links in lopende tekst schrijf je als
  `[tekst](/pad)` (`renderRichText`). Aanspreekvorm "u"; de test
  `src/content/landings/__tests__/registry.test.ts` bewaakt dat, en dat elk
  pad in `paths.ts` staat en elke link naar een bestaande route gaat. De
  secties krijgen automatisch een nummer en wisselen van toon (`muted`,
  `default`); wat erna komt ligt vast: voorbeeldprogramma's, citaat,
  reviews, `RouteChooser`, FAQ, één linkblok.
  Een verhaalpagina zonder inhoudsbestand (Over ons, Contact) bouwt met
  dezelfde onderdelen: `PageHero`, secties met `sectionCounter`, dan
  `RouteChooser`, `FaqSection`, `RelatedLinks`. Geen eigen CTA-banden,
  golven, blur-bollen of Ken Burns meer.
  Een activiteitpagina (`kind: "activity"`) volgt dezelfde regels; haar
  vaste staart is boekblok, FAQ, reviews, één linkblok.
- Cataloguspagina's (Bouwstenen, Voorbeeldprogramma's): `PageHero` zonder
  foto (de kaarten brengen de foto's), direct daaronder één genummerde
  sectie met het zoekveld en de filterknoppen (`Button` `sm`: `default`
  voor de actieve, `outline` voor de rest, met `aria-pressed`), dan het
  raster van kaarten (`CatalogCard` met knoppen, `MediaCard` als de kaart
  één link is); `LoadingState` tijdens het laden en `EmptyState` met
  "Filters wissen" als niets past; daarna `RouteChooser`, FAQ en één
  linkblok. Een detailpagina uit de database (voorbeeldprogramma,
  bouwsteen) heeft een kruimelpad, `PageHero` met de eigen foto (zonder
  foto de donkere band), een intro met `FactList` "In het kort" ernaast,
  genummerde secties, het boekblok (`#boeken`) of de tijdlijn, verwante
  kaarten, en sluit af met `RouteChooser` (programma) of `SeeAlsoActivities`
  (bouwsteen) en één linkblok. Prijzen altijd via `formatBlockPrice`. Elke duur, prijs
  en groepsgrootte in zo'n bestand moet letterlijk in
  `src/content/activityContent.ts` staan (`scripts/validate-activity-facts.ts`
  draait voor elke build); schrijf een getijvenster dus als "een uur vóór
  tot een uur ná laagwater", anders leest de bewaker het als een duur.
- Referentiepagina's (`/referenties`, `/referenties/<slug>`,
  `components/referenties`): het overzicht is een cataloguspagina met
  `MediaCard`s (`ReferenceCard`); de detailpagina volgt de detailpagina uit
  de database met `ReferenceCaseView` (`PageHero` met de eerste foto van het
  programma, tekst met `FactList` "In het kort", `ReferenceTimeline` per
  dag, `PersonQuote`), verwante kaarten en `RouteChooser` "Zoiets ook?". De
  akkoordpagina voor de klant (`/referentie-akkoord/<token>`) toont dezelfde
  `ReferenceCaseView` tussen een `Notice` en het akkoordformulier.

## Zo controleer je een wijziging

1. Open `/ontwerp` op de preview: staan de knoppen, pills en koppen nog in
   één lijn?
2. `bunx tsx scripts/check-design-debt.ts`: geen bestand boven zijn
   baseline, het totaal niet gestegen? Met `--list` zie je elke vindplaats.
3. Klik de pagina's door die je hebt geraakt, op desktop en op een telefoon.
4. Kijk naar de job "Visuele regressie" in CI: wijkt een pagina af, dan
   staan verwacht, werkelijk en het verschil in het artefact
   `visuele-regressie`. Bedoeld? Start de workflow "Visuele referenties
   vernieuwen" op de branch; die maakt de referenties opnieuw en commit
   ze (zie `tests/e2e/visual/README.md`).

## Borging (fase 5)

Vier poorten in CI houden het systeem heel; ze staan in
`.github/workflows/ci.yml`.

| Poort | Wat | Waar de lat staat |
|---|---|---|
| Typecheck | `tsc -p tsconfig.app.json`, nul fouten | hard |
| Lint en strict-mode | aantal problemen mag niet stijgen | `LINT_MAX`, `STRICT_MAX` in `.github/quality-baselines.env` |
| Ontwerpschuld | `scripts/check-design-debt.ts`: losse paletkleuren, `text-white`, knop-overrides, `rounded-xl`+, Tailwind-schaduwen, `hsl(var(--…))`, eigen eyebrows | per bestand hard via `.github/design-debt-baseline.json` (een bestand mag nooit boven zijn stand komen; een nieuw of schoon bestand blijft op nul), plus het totaal `DESIGN_DEBT_MAX` |
| Visuele regressie | `tests/e2e/visual`: dertien paginasoorten op desktop (1440) en telefoon (390), vergeleken met `__snapshots__` (maximaal 1% van de pixels anders), plus geen horizontale overloop, geen paginafouten en de lettertypes geladen | referenties in de repo, gemaakt door de workflow "Visuele referenties vernieuwen" met dezelfde Chromium als CI |

De visuele test is deterministisch: de klok staat vast op 21 september
2026, Supabase-antwoorden komen uit `tests/e2e/visual/fixtures/*.har`,
foto's zijn een effen vlak, `prefers-reduced-motion` staat aan en de
lettertypes komen van de site zelf (`public/fonts`, sinds fase 5 niet
meer van Google Fonts). Hij toetst dus opmaak, typografie en kleur, niet
de inhoud van de database.

Na een opruimronde leg je de nieuwe stand vast met
`bunx tsx scripts/check-design-debt.ts --write-baseline` en verlaag je
`DESIGN_DEBT_MAX`; na een bedoelde visuele wijziging laat je de
referenties opnieuw maken door de workflow "Visuele referenties
vernieuwen" (`tests/e2e/visual/README.md`). Het admin-, partner- en
logiesportaal vallen buiten de ontwerpschuldtelling en de visuele test;
ze erven de tokens en kunnen later per scherm worden bijgetrokken.

## Checklist voor een nieuwe pagina

1. **Landingspagina?** Dan geen component: een inhoudsbestand in
   `src/content/landings/`, geregistreerd in `index.ts` en `paths.ts`.
   Activiteit: `kind: "activity"`, met de feiten uit
   `src/content/activityContent.ts`.
2. **Andere pagina:** `Navigation`, eventueel `LandingBreadcrumb`, dan
   `<main id="main-content">` met een `PageHero` (foto voor marketing, de
   donkere band voor catalogus, contact en fouten), één primaire actie in
   de actiekleur en hoogstens één `inverseOutline` ernaast.
3. Intro met `SectionHeader` en `Paragraphs`, met `FactList` ernaast als
   er feiten zijn. Daarna secties op `Section` en `Container`, genummerd
   met `sectionCounter()` (aanroepen in paginavolgorde, vóór de JSX), met
   `BodySection`, `FeatureGrid`, `Checklist`, `ProcessSteps` of de kaarten
   (`MediaCard` als de hele kaart één link is, `CatalogCard` met prijs en
   knoppen, `LinkCard` zonder foto).
4. Vaste staart: `RouteChooser` (of het boekblok op een activiteitpagina),
   `FaqSection` met `schemaId` en `pageUrl`, één `RelatedLinks`. Geen
   eigen CTA-band, golven, bollen, korrel of Ken Burns.
5. Alleen tokens: geen `bg-amber-50`, `text-white`, `rounded-2xl`,
   `shadow-lg` of eigen eyebrow-klassen; prijzen via `formatBlockPrice`;
   status via `Pill` en `Notice`; laden en leeg via `LoadingState` en
   `EmptyState`. Knoppen zonder `className` voor kleur, hoogte of radius.
6. Aanspreekvorm "u", "en" in plaats van "&" in koppen, links in lopende
   tekst als `[tekst](/pad)`.
7. Helmet met titel, beschrijving, canonical en og-tags; structured data
   waar die past (Service, FAQ via `FaqSection`, BreadcrumbList).
8. Voeg de pagina toe aan `tests/e2e/visual/paginas.spec.ts` als het een
   nieuwe paginasoort is, en neem de fixtures op.
9. Controleer: typecheck, `check-design-debt.ts`, `/ontwerp`, de pagina op
   desktop en telefoon, en CI groen.
