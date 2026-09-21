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
| `MediaCard` | Kaart met foto, eyebrow ("3 dagen"), Fraunces-kop en tekst, als link; voor echte programma's en activiteiten uit de database; zonder foto een zachte plaatshouder | Statische fototegels in code, `Card` met eigen hover |
| `PersonQuote` | Eén klantcitaat in Fraunces met naam en organisatie, op een `sand`-sectie | Citatencarrousels, `Quote`-iconen, sterren bij een handmatig citaat |
| `RouteChooser` | De donkere slotsectie "Klaar om te beginnen?" met de drie routes: zelf samenstellen (primaire actie), op maat, voorbeelden. `title` en `intro` per pagina; een pagina met een ander publiek geeft eigen `routes` mee (Samenwerken: contact, bouwstenen, voorbeelden) | De vijf CTA-banden en `FinalCTA`-varianten, "Neem contact op"-banden |
| `ActivityPage` (`components/landing`) | De tweede sjabloonvariant, voor één boekbare activiteit (Wadexcursie, Zeehondentocht): zelfde opbouw als `LandingPage` maar met de kaart "In het kort", een boekblok (`DirectBookingPanel` zodra de bouwsteen aan de boekmodule hangt, anders het aanvraagformulier) en TouristTrip-structured data; geen `RouteChooser`, de actie is boeken. Inhoud in `src/content/landings/<slug>.ts` met `kind: "activity"`; de feiten (duur, prijs, groepsgrootte) worden bewaakt tegen `src/content/activityContent.ts` | Eigen activiteitpagina's met `KeyFacts`, losse accordions en drie linkblokken |
| `BodySection`, `FeatureGrid`, `Checklist`, `Paragraphs` (`components/landing/sections`) en `sectionCounter` | De sectiesoorten van de inhoudsbestanden, ook los te gebruiken op een verhaalpagina (Samenwerken bouwt zijn secties als `LandingSection`-objecten; Voor wie gebruikt `FeatureGrid` en `Checklist`). `sectionCounter()` geeft elke sectie een nummer en wisselt de toon (`muted`, `default`) | Eigen kaartrasters, vinkjeslijsten en handmatige sectienummers |
| `LandingPage` (`components/landing`) | Het ene sjabloon voor de landingspagina's, gevoed door `src/content/landings/<slug>.ts` (geregistreerd in `index.ts` en `paths.ts`): kruimelpad, `PageHero`, intro met `FactList`, genummerde secties (`prose`, `features`, `gallery`, `split`), voorbeeldprogramma's uit de database, `PersonQuote`, Google-reviews, `RouteChooser`, `FaqSection`, één `RelatedLinks` | Een pagina-component per landingspagina; een nieuwe landingspagina is een nieuw inhoudsbestand |

`FaqSection`, `LandingBreadcrumb`, `GoogleReviewsBlock` en `RelatedLinks`
staan sinds fase 3 op `Section`, `Container` en `SectionHeader`; een aparte
`Faq` en `Breadcrumb` zijn niet meer nodig. Antwoorden in `FaqSection` mogen
links bevatten als `[tekst](/pad)`; de structured data krijgt de platte tekst.
Sinds fase 4 deel 1 staan ook de verhaalpagina's (Werkwijze, Over ons, Voor
wie, Samenwerken, Contact, Evenementen, Veelgestelde vragen, Eilandpartners,
404) op deze componenten. Nog te doen: de cataloguspagina's (Catering, Logies,
Bouwstenen, Voorbeeldprogramma's, Activiteiten) en de homepage.

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
  vaste staart is boekblok, FAQ, reviews, één linkblok. Elke duur, prijs
  en groepsgrootte in zo'n bestand moet letterlijk in
  `src/content/activityContent.ts` staan (`scripts/validate-activity-facts.ts`
  draait voor elke build); schrijf een getijvenster dus als "een uur vóór
  tot een uur ná laagwater", anders leest de bewaker het als een duur.

## Zo controleer je een wijziging

1. Open `/ontwerp` op de preview: staan de knoppen, pills en koppen nog in
   één lijn?
2. `bunx tsx scripts/check-design-debt.ts`: is het getal niet gestegen?
3. Klik de pagina's door die je hebt geraakt, op desktop en op een telefoon.
