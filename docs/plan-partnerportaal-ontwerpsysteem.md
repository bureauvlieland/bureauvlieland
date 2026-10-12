# Plan: het ontwerpsysteem in het partnerportaal

Status: onderzoek en voorstel, 11 oktober 2026; besluiten genomen door
Erwin op 11 oktober 2026 (alle aanbevelingen, zie "Besluiten"). Fase 0
gebouwd op 11 oktober, fase 1 en 2 op 12 oktober (zie de voortgang per
fase). Vraag van Erwin: na het klantportaal
(`plan-klantportaal-ontwerpsysteem.md`, afgerond 10 oktober) het
partnerportaal op het ontwerpsysteem brengen. De bouw volgt per fase, elke
fase als eigen PR met preview.

De norm is `docs/design-systeem.md` (tokens, componenten in
`src/components/system`, de vier poorten in CI). De mal is het
klantportaal: `PortalHead`, `Pill`, `Notice`, `EmptyState`,
`LoadingState`, `FormField`, `ResponsiveSheetContent`, `SuccessScreen`,
de dagbalk en de onderdeelkaart, en één woordenlijst per onderwerp in
`src/lib`. Het partnerportaal valt nu buiten de ontwerpschuldtelling en
de visuele test (`scripts/check-design-debt.ts` sluit
`src/components/partner-portal` en `src/pages/Partner*.tsx` uit); dit
plan haalt het erbinnen.

## Samenvatting

Het partnerportaal is groot (15 pagina's, 42 componenten, 18.900 regels)
en functioneel rijk: de werkbank als takenlijst per fase, projecten in
tijdsvakken, logiesoffertes met extra's en staffels, facturatie met
registratie en verzamelfacturen, planning, aanbod, profiel. Dat blijft.
Wat niet klopt, is de taal eromheen: het portaal is in stappen gegroeid
en elke stap bracht een eigen kop, eigen kleuren, eigen statuswoorden en
een eigen aanspreekvorm mee.

Met de regels van CI staat het portaal op 383 vindplaatsen ontwerpschuld,
bijna allemaal losse paletkleuren (346) en eigen eyebrows (33); radius,
schaduw en knop-overrides zijn er nauwelijks. Geen enkele pagina gebruikt
`PortalHead`, `Notice`, `FormField`, `ResponsiveSheetContent`,
`LoadingState` of `SuccessScreen`; `Pill` en `EmptyState` elk één keer.
Er lopen zeven woordenlijsten naast elkaar voor vier onderwerpen, en voor
één veld (de status van een logiesofferte) drie. De aanspreekvorm is
ongeveer 240 keer u en 50 keer je, vaak op hetzelfde scherm. Vijf
pagina's hebben geen paginatitel, de breedte verschilt per pagina, en
het ophalen van de portaaldata staat vier keer in de code.

Het voorstel: dezelfde zes regels als voor het klantportaal, met drie
verschillen die eigen zijn aan dit portaal. De zijbalk blijft (vijftien
routes passen niet in een tabbalk), de actiekleur blijft blauw (het
portaal is geen publiek oppervlak), en de reactie van de partner op een
onderdeel wordt één flow in plaats van twee. Daarbovenop: één
datalaag (`usePartnerPortal`) in plaats van vier kopieën, zodat een
vaste referentiepagina `/ontwerp/partnerportaal` mogelijk wordt, net als
bij het klantportaal, en de visuele test het portaal kan opnemen.

Zes fases, samen ongeveer 11 bouwdagen. Dat is meer dan de 7 dagen uit de
bijlage van het klantportaalplan: de drie grootste sheets (onderdeel,
logiesofferte, aanbod) zijn elk meer dan 1.000 regels en dragen samen
een derde van de schuld; die kun je niet "even" op `FormField` zetten.

## Hoe ik dit heb onderzocht

Alleen uit de code; een partnerlogin heb ik niet en de previews vragen
een admin-login met `?impersonate=`. Gelezen: de 15 pagina's en 42
componenten, `PartnerLayout`, de woordenlijsten in `src/lib`
(`itemStatus.ts`, `projectStatus.ts`, `partnerCommissionInvoices.ts`,
`partnerAgreements.ts`), `get-partner-dashboard` en de 26 edge functions
met "partner" in de naam. Geteld met de regels van
`scripts/check-design-debt.ts` (een kopie met het partnerportaal erbij)
en met losse greps op labels, dialogen, laadtoestanden en
aanspreekvorm. De bijlage van het klantportaalplan (1 oktober) was het
startpunt; de cijfers hieronder zijn opnieuw gemeten op 11 oktober en
wijken daar nauwelijks van af.

## Waar het nu staat

- **Schil.** `PartnerLayout` is de shadcn-zijbalk (inklapbaar tot
  iconen) met drie groepen: Werk (Werkbank, Projecten, Planning,
  Activiteiten, Logies, Kamersoorten, Logies-extra's, gefilterd op
  partnertype), Administratie (Facturatie) en Account (Mijn profiel,
  Instellingen, Handleidingen, Afspraken). Bovenin de partnernaam met
  een voortgangsbalk "Profielsterkte" (percentage in emerald, amber of
  rose) en de tip "vul profiel verder aan voor meer boekingen →". Op een
  telefoon een eigen kopbalk met menuknop; de zijbalk wordt pas onder
  768px een lade, de kopbalk verdwijnt pas vanaf 1024px, dus tussen 768
  en 1023px staan ze allebei in beeld. De menuknop heet "Toggle Sidebar".
- **Pagina's.** Elke pagina bouwt een eigen kop (`text-2xl font-bold`,
  Planning `text-xl font-semibold`), een eigen padding (meestal `p-6`,
  Afspraken geen) en een eigen breedte (geen maximum, 3xl, 4xl, 6xl,
  7xl). Vijf pagina's hebben geen `Helmet`; de andere heten "… | Partner
  Portal | Bureau Vlieland". Werkbank en Projecten zijn één route met
  `?tab`, met twee menu-items die ernaartoe wijzen.
- **Data.** De portaaldata komt uit `get-partner-dashboard?token=`. Die
  `fetch` staat vier keer in de code (Werkbank, Project, Facturatie
  tweemaal) plus in `usePartnerDashboard`, die alleen Planning gebruikt.
  De sessiecontrole met impersonatie staat ook vier keer.
- **Actiekleur.** `/partner/*` is `data-surface="portal"`: blauw. Het
  klantportaal is `public`: oranje.
- **Ontwerpschuld.** 383 vindplaatsen in 27 van de 58 bestanden: 346
  losse paletkleuren, 33 eyebrows, 2 `text-white`, 1 schaduw, 1
  `hsl(var(--…))`; 0 radius, 0 knop-overrides. Koplopers:
  `PartnerItemSheet` 94, `PartnerProjectItemRow` 39,
  `PartnerAccommodationRequestCard` 35, `PartnerAccommodationQuoteSheet`
  30, `PartnerPlanningCalendar` 26, `PartnerBlockSheet` 22,
  `PartnerFinance` 18, `PartnerGuides` 18. Daarbovenop 119 `dark:`-
  varianten die het script niet telt maar die met de kleuren meegaan.
  Tien pagina's zijn al schoon.

## Bevindingen partnerportaal

### 1. Opbouw en navigatie

- Geen gedeelde kop. Vijftien pagina's, vijftien koppen, met Engelse
  hoofdletters ("Logies Aanvragen", "Facturatie Overzicht", "Mijn
  Aanbod", "Mijn Profiel", "Nieuwe Extra") en een ampersand ("Werkbank
  &amp; Projecten", "Kenmerken & USP's").
- Dubbele navigatie: Werkbank en Projecten zijn één route met `?tab`;
  "Terug" vanaf een project gaat altijd naar de werkbank, zonder tab,
  zoekterm of archief. Logies staat op twee plekken (als rij in werkbank
  en projecten, en als kaart onder "Logies"), met een andere woordenlijst
  op elke plek.
- Breedte en padding per pagina verschillen; Afspraken plakt tegen de
  rand. Werkbank heeft een vaste rechterkolom van 300px met de
  jaarcijfers (`PartnerYtdModule`).
- De zijbalk is goed: groepen per partnertype, zichtbare impersonatie
  ("Admin weergave"), uitloggen onderaan. Alleen de profielsterkte
  (percentage met drie paletkleuren en een pijl-tip) is systeemvreemd.
- Dode link: "Ga naar facturen" in `MissingPdfBanner` wijst naar
  `/partner/financieel`; de route heet `/partner/facturatie`. De tabs
  daar lezen de URL niet, dus `#gefactureerd` doet ook niets.

### 2. De projectpagina en de onderdelen

- Onderdelen staan in aanmaakvolgorde zonder dagindeling: dag 3 kan
  boven dag 1 staan. Elke rij toont een eigen datum; de sheet toont de
  datum twee keer. De klant ziet hetzelfde programma sinds fase 2 als
  tijdlijn met dagbalk.
- Twee reactieflows: de rij (`PartnerProjectItemRow`) bevestigt direct
  met "Bevestigen" of "Akkoord met <tijd>" en heeft een eigen
  tegenvoorstel-formulier, de sheet (`PartnerItemSheet`, 1.266 regels)
  heeft bevestigen, tegenvoorstel met prijs en tijd, en niet beschikbaar.
  Twee plekken voor hetzelfde besluit, elk met eigen validatie
  (`priceError`, `timeError` in beide) en eigen teksten.
- De sheet is de grootste bron van schuld (94 vindplaatsen, 34
  `dark:`-varianten, 14 eyebrows): gekleurde kaders per toestand
  (amber voor "Gewijzigd (vN)", blauw voor de klanttijd, groen voor
  bevestigd), labels in `uppercase tracking-wide`, losse `Label`+`Input`.
- De infokaart van een project heeft vier kolommen met eigen eyebrows;
  bij een concept een amber kader, bij annulering een rood kader, beide
  met de hand gekleurd.
- De chat staat als plakkende kolom rechts (`lg:sticky`) en valt op een
  smal scherm onder de onderdelen.

### 3. Statussen, kleuren en woorden

Zeven woordenlijsten voor vier onderwerpen:

| Onderwerp | Waar | Woorden | Kleur |
|---|---|---|---|
| Onderdeel | `itemStatus.ts` `partnerLabel` via `ItemDisplayStatusBadge` | "Reactie gevraagd", "Voorstel verstuurd", "Klant akkoord, bevestig in planning", "Uitgevoerd" … | tonen uit `pillVariants`; de enige goede |
| Onderdeel (werkbank) | `PartnerWerkbankList` buckets | Beoordelen, Wijzigingen, Inplannen, Factureren | `text-amber-700`, `text-orange-700`, `text-blue-700`, `text-emerald-700` |
| Onderdeel (planning) | `PartnerPlanningCalendar` | In afwachting, Bevestigd, Akkoord klant, Uitgevoerd … | `bg-*-100`, compact als ⏳ ✓ ✓✓ |
| Project | `projectStatus.ts` (admin-lijst) in `PartnerProjectsTable` | Concept, Offerte verstuurd, Akkoord ontvangen, AV getekend, Facturatie | `bg-blue-100`, `bg-amber-100`, `bg-purple-100` … |
| Logiesofferte (kaart) | `PartnerAccommodationRequestCard` | Te beantwoorden, Offerte verstuurd, Geaccepteerd, Niet gekozen, Verlopen, Afgewezen | Badge-varianten, "Verlopen" destructief terwijl verlengen kan |
| Logiesofferte (project) | inline in `PartnerProject` | Nieuw — actie vereist, Verstuurd naar klant, Gekozen door klant, Door u afgewezen | tekst |
| Logiesofferte (tabs) | `PartnerAccommodation` | Actie nodig, In behandeling, Verlopen, Akkoord, Afgerond | tellers in `rounded-full` |
| Commissiefactuur | `partnerCommissionInvoices.ts` | Open, Te laat (n dagen), Betaald, Gecrediteerd, Creditnota | `Pill`-tonen; de tweede goede |
| Afspraak | `partnerAgreements.ts` | Akkoord, Eerdere versie akkoord, Wacht op akkoord | Badge default/secondary/destructive |
| Aanbod | `PartnerBlocks` | Wacht op goedkeuring, Goedgekeurd, Gepubliceerd | `bg-amber-100`, `bg-blue-100`, `bg-green-600` |

Daarnaast 42 `Badge`s in 18 bestanden (28 met eigen klassen), 41
gekleurde meldingsvlakken, KPI's met iconen in gekleurde cirkels
(Facturatie: groen, blauw, amber), en "AV getekend" als jargon voor de
partner. Er is geen `partnerTone` naast `partnerLabel`; de tooltips in
`itemStatus.ts` zijn bewust in de jij-vorm.

### 4. Formulieren, dialogen en meldingen

- 11 `Dialog`s, 6 `Sheet`s, 3 `AlertDialog`s. Geen enkele op
  `ResponsiveSheetContent`: breedtes `md`, `lg`, `xl`, `2xl`; drie sheets
  zonder volle breedte op een telefoon; geen vaste voet, dus de knoppen
  staan onder 1.000 regels formulier.
- 160 losse `Label`+`Input`-paren (BlockSheet 26, QuoteSheet 23,
  Settings 16, AddQuoteExtra 14); `FormField` nul keer. Validatie op
  vier manieren: inline bij het veld (factuurdialogen, login, de
  onderdeelsheet), alleen een toast ("Naam verplicht", "Vul alle velden
  in", "Staffels onjuist"), een uitgeschakelde knop zonder uitleg, en zod
  bij login.
- Twee toastsystemen naast elkaar (`useToast` en sonner), ongeveer 78
  destructieve toasts, 17 met als titel alleen "Fout"; "Failed" kan in
  een toast belanden.
- Geen bevestigingsschermen behalve "Wachtwoord gewijzigd!". Een
  ingediende offerte, een geregistreerde factuur of een gesloten project
  krijgt alleen een toast, en de sheet sluit.
- Instellingen heeft vijf opslaanknoppen die hetzelfde formulier
  opslaan. "Facturatie registreren" en "Factuur registreren" bestaan
  naast elkaar; een logiesfactuur kan geen pdf krijgen terwijl de banner
  "pdf ontbreekt" blijft tellen.
- Laden: 31 `Skeleton`s en 38 `Loader2`'s, `LoadingState` nul keer.
  Leeg: ongeveer 25 eigen "Geen …"-kaarten, `EmptyState` één keer. Vier
  eigen foutschermen met de kop "Fout".
- Bedragen: `€{x.toLocaleString("nl-NL", …)}` op vijftien plekken in
  Facturatie alleen, naast `formatEuro` uit `mapBooking.ts`; "€12.50"
  en "€12,50" komen allebei voor.

### 5. Mobiel

- Eén responsieve weergave, dat is goed. Maar de projectentabel heeft
  acht kolommen met vaste breedtes en scrolt horizontaal; er is geen
  kaartweergave. Het zoekveld is 240px vast.
- De sheets komen van rechts, ook op een telefoon, zonder vaste voet;
  de drie grootste zijn langer dan een scherm.
- Tussen 768 en 1023px zijbalk én kopbalk; menuknop van 28px.
- De verwijderknop van foto's verschijnt alleen bij hover.
- Alleen de planning heeft een echte mobiele variant (lijst onder `md`).

### 6. Toon en copy

- Ongeveer 240 keer u en 50 keer je. Handleidingen, de offertesheet en
  het profiel zijn u; login, facturatie, de onderdeelsheet, de
  projectpagina en de chat zijn je. "Je account is niet gekoppeld" staat
  boven "Overzicht van uw projecten".
- 49 regels met een gedachtestreepje, twintig daarvan in de
  handleidingen; "Concept — nog niet vrijgegeven", "Geen factuur —
  sluiten", "Actie vereist — n facturen zonder PDF".
- Engels: "Partner Portal" (alle paginatitels, de login), "Export CSV",
  "Dashboard", "USP's", "Ref", "Items", "Time-out", "Toggle Sidebar".
  "Emailadres" naast "e-mailadres". Zeven uitroeptekens ("Welkom
  Admin!", "Wachtwoord gewijzigd!").
- Aanbod, activiteiten, bouwstenen en blokken door elkaar voor hetzelfde
  ding.

### 7. Wat goed is en blijft

- De werkbank als takenlijst per fase, met per rij een hint wat er van
  de partner wordt verwacht, en filters in de URL.
- Projecten in tijdsvakken (Datum verstreken, Deze week, Deze maand,
  Later) met markering van verstreken datums; het archief.
- De zijbalk per partnertype met zichtbare impersonatie; uitleg in de
  flow bij concept en annulering.
- `ItemDisplayStatusBadge` op `itemStatus.ts`: één bron voor de status
  van een onderdeel, met `partnerLabel` en tooltip. Dit is de mal voor
  de andere woordenlijsten.
- `partnerInvoiceStatus` met `Pill`-tonen en `PartnerCommissionInvoiceList`
  (10 oktober): al op het systeem.
- De offertesheet met kamersoorten, extra's en staffels is functioneel
  compleet; de inhoud blijft, de vorm verandert.

## Richting: zes regels, drie eigen aan dit portaal

De zes regels van het klantportaal gelden onverkort: één kop
(`PortalHead`), de volgende stap op één plek (één `Notice`, één primaire
knop), status in woorden van de lezer op vier tonen, tijd als
ruggengraat, één weergave die meebuigt, formulieren op `FormField`.
Daarbovenop:

1. **De zijbalk blijft.** Vijftien routes in drie groepen passen niet
   in een `PortalTabs`; de zijbalk is voor een partner die dagelijks
   inlogt ook sneller. Hij gaat op de tokens, de kopbalk op een
   telefoon wordt de vaste `PortalHead`-regel met menuknop, en de
   dubbele weergave tussen 768 en 1023px verdwijnt (één breekpunt,
   `lg`).
2. **Blauw blijft de actiekleur.** `data-surface="portal"` is bewust
   (besluit 1 van het ontwerpsysteemplan): het portaal is geen publiek
   oppervlak, en oranje zou de partner laten denken dat hij op de site
   is. Alle andere tokens zijn gelijk aan de site.
3. **Eén reactie per onderdeel.** De rij toont de status en één knop
   "Reageren" (of "Bevestigen" als dat de enige zinnige reactie is); de
   sheet is de enige plek waar de partner bevestigt, een andere tijd of
   prijs voorstelt of niet beschikbaar meldt. Eén validatie, één
   uitkomst.

En één technische regel die het mogelijk maakt: **één datalaag.**
`usePartnerPortal()` doet de sessiecontrole, de impersonatie en de
`fetch` van `get-partner-dashboard` één keer, met `refetch`; de pagina's
worden weergaven die data krijgen. Dat haalt vier kopieën weg en maakt
een vaste referentiepagina met verzonnen data mogelijk, zodat jij (en de
visuele test) het portaal kunnen zien zonder partnerlogin.

## Voorstel partnerportaal

### Per scherm

- **Schil.** Zijbalk op de tokens (`sidebar-*` zijn al tokens; de
  profielsterkte wordt een `Pill` "Profiel 60%" met toon `warning` onder
  80 en `success` daarboven, zonder pijl-tip). Elke pagina begint met
  `PortalHead` (icoon, titel, één zin, hoogstens één `Pill`, `actions`
  rechts) op één breedte (`Container size="wide"`, `p-4 md:p-6`).
  Helmet op elke pagina: "<Scherm> | Partnerportaal | Bureau Vlieland".
  Werkbank en Projecten worden twee routes (`/partner/werkbank`,
  `/partner/projecten`; `/partner/dashboard` blijft als doorverwijzing);
  "Terug" onthoudt tab, zoekterm en archief.
- **Werkbank.** De vier groepen (Beoordelen, Wijzigingen, Inplannen,
  Factureren) blijven, als secties met een `Pill`-teller op de tonen
  `warning` (u bent aan zet), `info` (wacht op een ander), `success`.
  Bovenaan één `Notice` met de belangrijkste volgende stap ("3 aanvragen
  wachten op uw reactie"), de banners (pdf ontbreekt, profiel, afspraken)
  worden `Notice`s. De jaarcijfers verhuizen naar Facturatie; de
  werkbank is een takenlijst, geen dashboard.
- **Projecten.** De tabel blijft vanaf `md` (op de tokens, verstreken
  datums als `Pill` `danger`); onder `md` een kaartlijst met dezelfde
  velden (`LinkCard`-achtig: klant, datum, status, volgende stap). De
  projectstatus krijgt een partnerwoordenlijst (zie hieronder) in plaats
  van de adminlijst met "AV getekend".
- **Projectpagina.** Dezelfde dagindeling als de klant: `DayBar` en
  dagkoppen ("Donderdag 5 november · dag 1 van 2 · 2 onderdelen van u"),
  onderdelen op een `PartnerItemCard` met dezelfde opbouw als
  `ProgramItemCard` (tijd met het soort tijd, titel, personen en plek,
  één status-`Pill` uit `partnerLabel`/`partnerTone`, één knop
  "Reageren", details onder een uitklapper). De infokaart wordt een
  `FactList` (klant, datum, personen, referentie) naast de intro; concept
  en annulering worden een `Notice`. De chat blijft rechts op desktop en
  wordt op een telefoon een knop in `FloatingStack` die een sheet opent.
- **Onderdeelsheet.** `ResponsiveSheetContent` met vaste voet; bovenin
  de feiten (één keer), dan één `Notice` met wat de klant vraagt
  (gewenste tijd, wijziging sinds vorige versie), dan drie keuzes als
  `OptionCard`s (Bevestigen, Andere tijd of prijs, Niet beschikbaar) die
  de bijbehorende `FormField`s tonen; één primaire knop. Een
  tegenvoorstel stuurt altijd de tijd uit het formulier mee.
- **Logies.** Eén woordenlijst voor de offerte, op kaart, projectpagina
  en tabs (zie hieronder). De aanvraagkaart op `Pill` en `Notice`;
  "Verlopen" wordt `warning` met de knop "Verlengen" als dat kan. De
  offertesheet (1.264 regels) op `ResponsiveSheetContent` met
  `FormField`, een vaste voet en secties (Kamers, Extra's, Prijs,
  Toelichting voor de klant); na indienen een `SuccessScreen` in de sheet
  ("Uw offerte is bij Bureau Vlieland; de klant ziet hem zodra …").
- **Facturatie.** De drie KPI-kaarten met gekleurde cirkels worden één
  `FactList` "In het kort" (gefactureerd, nog te factureren, commissie
  open) plus de maandgrafiek; de tabs lezen de URL (`?tab=`), zodat
  "Ga naar facturen" werkt. Eén factuurdialoog voor onderdelen en logies
  (nu `InvoiceRegistrationDialog` en `AccommodationInvoiceDialog`), met
  pdf-upload voor allebei; "Registreren" is het ene woord. Bedragen via
  één formatter (`formatEuro`).
- **Aanbod, kamersoorten, extra's.** `PortalHead`, `EmptyState` met
  actie, de drie statussen als `Pill`. `PartnerBlockSheet` (1.109 regels)
  houdt zijn vier tabs maar op `ResponsiveSheetContent` met `FormField`
  en een vaste voet; de kamersoort- en extra-sheets idem.
- **Planning.** De kalender op de vier tonen uit `partnerTone`, zonder
  emoji; de mobiele lijst blijft.
- **Account.** Profiel en Instellingen worden elk één formulier met één
  opslaanknop in een vaste voet (`WizardFooter`-achtig, zonder Terug);
  Afspraken op `Notice` en `Pill`; Handleidingen op `SectionHeader` en
  `Paragraphs` met de copy opgeschoond. Login, wachtwoord vergeten en
  reset op `FormField` met `SuccessScreen`; "Partner Portal" wordt
  "Partnerportaal".

### Woordenlijsten partner (voorstel)

Vier tonen, dezelfde betekenis als bij de klant: `info` wacht op een
ander (klant, Bureau Vlieland), `warning` u bent aan zet, `success`
geregeld, `danger` kan niet.

**Onderdeel** (`itemStatus.ts`, `partnerTone` naast `partnerLabel`):

| `ItemDisplayStatus` | `partnerLabel` (bestaand) | `partnerTone` (nieuw) |
|---|---|---|
| wacht_op_partner | Reactie gevraagd | warning |
| wacht_op_klant | Voorstel verstuurd | info |
| prijs_gewijzigd | Nieuwe prijs, wacht op klant | info |
| klant_akkoord_wacht_partner | Klant akkoord, reactie gevraagd | warning |
| tegenvoorstel_klant | Tegenvoorstel van klant, reageer | warning |
| klant_akkoord_bureau | Door Bureau Vlieland geregeld | info |
| geaccepteerd | Klant akkoord, bevestig in planning | warning |
| uitgevoerd | Uitgevoerd | success |
| geannuleerd | Geannuleerd | danger |
| niet_beschikbaar | Niet beschikbaar gemeld | danger |
| self_arranged | Klant regelt zelf | neutral |
| afgesloten_automatisch | Afgesloten (automatisch) | neutral |

De bestaande `partnerLabel`s blijven; alleen de toon komt erbij en de
tooltips gaan naar de u-vorm. Eén woord verdient een blik:
`geaccepteerd` heet bij de klant "Bevestigd" en bij de partner "Klant
akkoord, bevestig in planning"; of de partner na het akkoord van de
klant nog iets moet doen (inplannen) bepaalt of dit `warning` of
`success` is.

**Project** (nieuw, `partnerProjectStatus.ts`, afgeleid uit de
onderdelen van deze partner): "Wacht op uw reactie" (warning), "Wacht op
de klant" (info), "Bevestigd" (success), "Uitgevoerd, nog te factureren"
(warning), "Gefactureerd" (success), "Geannuleerd" (danger), "Concept"
(info). Vervangt de adminlijst met "AV getekend" in de projectentabel.

**Logiesofferte** (nieuw, `accommodationQuoteStatus.ts`, voor kaart,
projectpagina en tabs): "Offerte gevraagd" (warning), "Verstuurd, wacht
op de klant" (info), "Gekozen door de klant" (success), "Niet gekozen"
(neutral), "Verlopen, te verlengen" (warning), "Door u afgewezen"
(neutral), "Geannuleerd" (danger). De tabs heten dan Offerte gevraagd,
Wacht op de klant, Verlopen, Gekozen, Afgerond.

**Werkbank** (bestaand, alleen tonen): Beoordelen warning, Wijzigingen
warning, Inplannen warning, Factureren warning; de teller `info` als
nul.

**Commissiefactuur** en **afspraak**: bestaande lijsten, afspraak op
`Pill` in plaats van `Badge`.

## Fasen

Inschattingen zijn bouwdagen, exclusief jouw beoordeling. Elke fase is
een eigen PR met preview. De previews praten met de productiedatabase;
je beoordeelt met een admin-login en `?impersonate=<partner>`, of met
de referentiepagina `/ontwerp/partnerportaal` die vanaf fase 1 bestaat.

**Fase 0: directe fouten (1 dag).** Zonder ontwerpkeuze: de dode link
`/partner/financieel` en de tabs van Facturatie die de URL niet lezen;
de menuknop "Toggle Sidebar" wordt "Menu" (in `ui/sidebar.tsx`, raakt
ook admin); zijbalk en kopbalk op één breekpunt; Afspraken krijgt
dezelfde padding; `Helmet` op de vijf pagina's zonder, en "Partner
Portal" wordt "Partnerportaal" in alle titels; de logiesfactuur krijgt
pdf-upload zodat de banner "pdf ontbreekt" eerlijk telt; "Failed" en "Fout" als toasttitel worden
Nederlandse zinnen; bedragen op één formatter.

*Gebouwd op 11 oktober, eigen PR.* "Ga naar facturen" wijst naar
`/partner/facturatie?tab=invoiced` (met `impersonate` als die er is) en
de tabs van Facturatie staan in de URL. De menuknop heet "Menu" en de
rail "Zijbalk in- of uitklappen" (`ui/sidebar.tsx`, dus ook in admin);
de kopbalk van het partnerportaal verdwijnt vanaf `md`, waar de zijbalk
zelf in beeld komt. Afspraken heeft dezelfde padding als de rest. Elke
pagina heeft een `Helmet` en heet "… | Partnerportaal | Bureau Vlieland";
de login en de oude token-landing zeggen "Partnerportaal". De
logiesfactuur krijgt "PDF toevoegen" en "PDF ontbreekt" in Facturatie,
net als een onderdeel; omdat de trigger
`protect_partner_accommodation_quote_fields` het pad bij een
partner-update terugzet, koppelt de nieuwe edge function
`attach-accommodation-invoice-pdf` het (partnertoken, eigen map, factuur
geregistreerd, bestand bestaat; negen Deno-tests). De uploaddialoog
bedient beide soorten (`UploadPdfTarget`). Zeventien toasts met als
titel "Fout" zeggen nu wat er niet lukte ("Offerte niet ingediend",
"Gegevens niet opgeslagen"), en de drie "Failed"-terugvallen zijn
Nederlands. Bedragen gaan door `formatEuro` in `src/lib/formatEuro.ts`
("€ 1.234,56"; `formatEuroRounded` voor de jaarcijfers), op 46 plekken
in 14 bestanden; de csv-export en de invoervelden houden hun eigen
notatie. Bewust niet in fase 0: de bucket-namen en de kaartopmaak van
Facturatie (fase 3).

**Fase 1: fundament (2 dagen).** `usePartnerPortal()` als enige
datalaag (sessie, impersonatie, `get-partner-dashboard`, `refetch`), de
vier kopieën weg; `PartnerLayout` op de tokens met één breekpunt en de
profielsterkte als `Pill`; `PortalHead` op elke pagina, één breedte en
padding; Werkbank en Projecten als twee routes; de woordenlijsten
(`partnerTone`, `partnerProjectStatus.ts`,
`accommodationQuoteStatus.ts`) met tests, nog zonder alle schermen om
te zetten. De referentiepagina `/ontwerp/partnerportaal` (alleen buiten
productie) met een verzonnen partner in `src/content/demoPartnerportaal.ts`
(een activiteitenpartner met logies, twee projecten, één open
tegenvoorstel, één offerte gevraagd, één factuur zonder pdf) en
`?scherm=werkbank|projecten|project|logies|facturatie`. Het
partnerportaal komt in de ontwerpschuldtelling met een baseline per
bestand (de huidige stand), zodat de schuld vanaf hier alleen daalt.

*Gebouwd op 12 oktober, eigen PR.* `PartnerLayout` zoekt de partner één
keer op en zet hem in `PartnerPortalContext`; `usePartnerPortal()`
(`src/hooks/usePartnerPortal.ts`) haalt `get-partner-dashboard` via
react-query op, één keer per token en gedeeld door alle pagina's, met
`refetch` na een actie; `usePartnerCommissionInvoices()` doet hetzelfde
voor de commissiefacturen. De vier kopieën in Werkbank, Project,
Facturatie en Planning zijn weg, net als `usePartnerDashboard`; Logies,
Handleidingen en Afspraken lezen de partner uit de context. De schil is
gesplitst in `PartnerShell` (zijbalk, kopbalk, inhoud) en `PartnerLayout`
(login eromheen); de profielsterkte is een `Pill`, de zijbalk staat op de
tokens. Elke pagina begint met `PartnerPage`
(`src/components/partner-portal/PartnerPage.tsx`): de titel in de tab,
`Container` op één breedte (`wide`, of `content`/`prose` voor
formulieren) met één padding, `PortalHead` met icoon, titel, één zin en
hoogstens één status, en `LoadingState` en een `Notice` voor laden en
fouten in plaats van de eigen "Fout"-schermen. Werkbank en Projecten zijn
twee routes (`/partner/werkbank`, `/partner/projecten`;
`/partner/dashboard` stuurt door met behoud van `impersonate`); de rijen
geven mee waar u vandaan kwam, zodat "Terug" met tab, zoekterm en
archief terugkomt. De jaarcijfers staan bij Facturatie naast de
maandgrafiek. De woordenlijsten staan klaar met 13 tests: `partnerTone`
naast `partnerLabel` in `itemStatus.ts`, `partnerProjectStatus.ts`
(`derivePartnerProjectStatus`, `derivePartnerAccommodationProjectStatus`)
en `accommodationQuoteStatus.ts` (`partnerQuoteStatus`,
`partnerQuoteTab`, `PARTNER_QUOTE_TABS`); de schermen gaan er in fase 2
en 3 op. De referentiepagina `/ontwerp/partnerportaal` (alleen buiten
productie) toont de verzonnen partner uit `src/content/demoPartnerportaal.ts`
(Wadloopcentrum Vlieland, activiteiten en logies, twee projecten, een
tegenvoorstel, een offerte gevraagd, een factuur zonder pdf, één open
commissiefactuur) met `?scherm=werkbank|projecten|project|logies|facturatie`;
`logies` is daar het logiesproject, want de logiespagina en het aanbod
lezen hun eigen tabellen en komen in fase 3 en 4 op de referentie. Het
partnerportaal telt mee in de ontwerpschuld: baseline per bestand (26
bestanden, 380 vindplaatsen) en `DESIGN_DEBT_MAX=380`; vanaf hier mag een
partnerbestand alleen omlaag.

**Fase 2: werkbank, projecten en de projectpagina (3 dagen).** De
werkbank op `Notice`, `Pill` en `EmptyState`; de projectentabel op de
tokens met de partnerwoordenlijst en een kaartlijst onder `md`; de
projectpagina met `DayBar`, dagkoppen, `FactList` en `PartnerItemCard`;
`PartnerItemSheet` opnieuw opgebouwd op `ResponsiveSheetContent`,
`OptionCard` en `FormField` als de enige reactieflow; de chat in
`FloatingStack` op een telefoon. Hiermee verdwijnt ruim een derde van
de schuld (`PartnerItemSheet`, `PartnerProjectItemRow`,
`PartnerProjectsTable`, `PartnerWerkbankList`).

*Gebouwd op 12 oktober, zelfde PR als fase 1.* De werkbank begint met één
`Notice` met de belangrijkste volgende stap ("2 aanvragen wachten op uw
reactie", `werkbankHeadline` in `src/lib/partnerWerkbank.ts`, waar ook
de rijen vandaan komen); de vier groepen hebben een `Pill`-teller, de
hints zijn zonder gedachtestreepjes, leeg is een `EmptyState`. De drie
banners (pdf ontbreekt, profiel, afspraken) zijn `Notice`s. De
projectentabel toont de partnerwoordenlijst (`partnerStatus` op de rij,
uit `partnerProjectStatus.ts`) als `Pill`, een verstreken datum als
`Pill` `danger`, en wordt onder `md` een kaartlijst met dezelfde velden;
de koppen heten Referentie, Personen, Soort, Onderdelen en Te doen. De
projectpagina heeft de dagindeling van de klant: `DayBar` en dagkoppen
("donderdag 5 november · dag 1 van 2 · 2 onderdelen van u") bij een
meerdaags programma, de feiten als `FactList` naast de tijdlijn met de
klant, de gastenlijst en de chat eronder, concept en annulering als
`Notice`. De nieuwe `PartnerItemCard` heeft dezelfde opbouw als de kaart
van de klant (tijd met het soort tijd: gewenst, uw voorstel, bevestigd,
klant wil; titel; één `Pill` uit `partnerLabel` en `partnerTone`;
personen, duur en plek; de prijs) en één knop "Reageren" die de sheet
opent; alleen "Markeer uitgevoerd" en "Akkoord met de nieuwe prijs" zijn
één klik op de kaart. `PartnerProjectItemRow` is weg. `PartnerItemSheet`
is opnieuw opgebouwd op `ResponsiveSheetContent` (van onderen op een
telefoon): kop met titel en één `Pill`, dan wat er speelt als `Notice`
(tegenvoorstel van de klant, nieuwe prijs van het bureau met akkoord of
eigen prijs, uw voorstel, afgewezen, wacht op de klant, instructie),
de feiten één keer als `FactList`, de klant met gastenlijst en
documenten, de omschrijving en de kaart ingeklapt onder "Over dit
onderdeel", de factuur, en de reactie als drie `OptionCard`s
(bevestigen, andere tijd of prijs, niet beschikbaar) met `FormField`s;
onderaan een vaste voet met één primaire knop. De chat staat op een
telefoon onder de onderdelen in plaats van in `FloatingStack`, omdat de
algemene chatknop die stapel al gebruikt. Ontwerpschuld van 380 naar
225; `DESIGN_DEBT_MAX=225`.

**Fase 3: logies en facturatie (3 dagen).** De logiespagina en de
aanvraagkaart op één woordenlijst, `Pill` en `Notice`; de offertesheet
op `ResponsiveSheetContent` met `FormField`, secties, vaste voet en
`SuccessScreen`; de projectpagina in logiesmodus op dezelfde kop en
kaart. Facturatie met `FactList`, de maandgrafiek op de tokens, tabs in
de URL, één factuurdialoog voor onderdelen en logies, de verzamelfactuur
op `FormField`; de jaarcijfers van de werkbank hierheen.

**Fase 4: aanbod, planning en account (2 dagen).** `PartnerBlockSheet`,
de kamersoort- en extra-sheets op `ResponsiveSheetContent` en
`FormField`; de aanbodpagina's op `PortalHead`, `Pill` en `EmptyState`;
de planning op de tonen zonder emoji; Profiel en Instellingen als één
formulier met één opslaanknop; Afspraken op `Notice` en `Pill`; login
en wachtwoordflows op `FormField` en `SuccessScreen`; de handleidingen
op `SectionHeader` en `Paragraphs`. Copy in dezelfde ronde: de u-vorm
overal (ook de tooltips in `itemStatus.ts`), gedachtestreepjes en
uitroeptekens weg, "Export CSV" wordt "Exporteren (csv)", "aanbod" als
het ene woord voor wat de partner aanbiedt en "activiteit" voor wat de
klant boekt, één toastsysteem.

**Fase 5: borging (1 dag).** De baseline per bestand voor het
partnerportaal leeg, `DESIGN_DEBT_MAX` blijft nul; de visuele test
neemt werkbank, projecten, project, logies en facturatie op via
`/ontwerp/partnerportaal`, desktop en telefoon; een paragraaf
"Partnerportaal" in `docs/design-systeem.md` (zijbalk, `PortalHead`,
`PartnerItemCard`, de woordenlijsten); de bijlage in het
klantportaalplan verwijst hierheen.

Samen ongeveer 12 bouwdagen; met de overlap tussen fase 0 en 1 in de
praktijk 11. Fase 2 is de kern en verdient een eigen beoordeling met een
echte partner (impersonatie) op desktop en telefoon.

## Besluiten gevraagd

1. **Zijbalk blijft** (aanbevolen), in plaats van `PortalTabs` zoals in
   het klantportaal?
2. **Actiekleur blauw blijft** voor het partnerportaal (aanbevolen;
   oranje zou het portaal op de site laten lijken)?
3. **Eén reactieflow** via de sheet, met in de rij alleen de status en
   één knop (aanbevolen), of de snelle "Bevestigen" in de rij houden
   naast de sheet?
4. **Projectpagina met dagindeling** zoals de klant (aanbevolen), of de
   huidige platte lijst op de tokens?
5. **Werkbank en Projecten als twee routes** (aanbevolen); de
   jaarcijfers verhuizen naar Facturatie?
6. **Aanspreekvorm u** overal, ook in de tooltips die nu bewust jij
   zijn (aanbevolen, gelijk aan het klantportaal en de site)?
7. **Instellingen en Profiel elk één opslaanknop** (aanbevolen), of de
   vijf kaarten met eigen knop houden?
8. **Een verzonnen partner in de code** voor previews en de visuele
   test (`demoPartnerportaal.ts`, aanbevolen, zoals bij het
   klantportaal), of een testpartner in de productiedatabase?
9. **Eén factuurdialoog** voor onderdelen en logies, met pdf voor
   allebei (aanbevolen)?
10. **Toastsysteem:** `useToast` (de site en het klantportaal) of
    sonner (de helft van het partnerportaal)? Aanbevolen `useToast`,
    omdat de rest van de code daarop staat.

## Besluiten (genomen door Erwin, 11 oktober 2026)

Alle tien aanbevelingen zijn overgenomen:

1. De zijbalk blijft; geen `PortalTabs`.
2. Blauw blijft de actiekleur van het partnerportaal.
3. Eén reactieflow via de sheet; de rij toont de status en één knop.
4. De projectpagina krijgt de dagindeling van de klant.
5. Werkbank en Projecten worden twee routes; de jaarcijfers gaan naar
   Facturatie.
6. De u-vorm overal, ook in de tooltips.
7. Instellingen en Profiel krijgen elk één opslaanknop.
8. Een verzonnen partner in de code (`demoPartnerportaal.ts`) voor
   previews en de visuele test; geen testpartner in productie.
9. Eén factuurdialoog voor onderdelen en logies, met pdf voor allebei.
10. `useToast` als het ene toastsysteem.

## Meetpunten

- Ontwerpschuld in het partnerportaal: van 383 naar 0, met het portaal
  in de telling vanaf fase 1.
- Doorlooptijd van het versturen naar de partner
  (`send-items-to-partners`) tot de eerste reactie (de eerste
  statuswijziging per onderdeel in `program_request_history`), vóór en
  na fase 2.
- Aandeel geregistreerde partnerfacturen met pdf, vóór en na fase 3.
- Mails aan hallo@ en chatberichten uit het partnerportaal over het
  portaal zelf, vóór en na fase 4.

## Wat dit plan bewust niet doet

- Geen nieuwe functies: geen directe boeking vanuit het portaal, geen
  nieuwe rollen, geen wijziging in `get-partner-dashboard` of de mails,
  behalve waar een statuswoord in een mail hetzelfde moet zijn als in
  het portaal.
- De adminkant blijft buiten dit plan; `AdminPartnerDetail` gebruikt
  `MapOfferOverview` en erft de nieuwe vorm vanzelf.
- Het logiesportaal (`src/components/accommodation-portal`) en de
  publieke partnerpagina's (`/partners`, `/partner-voorwaarden`) blijven
  buiten dit plan.
- Geen herontwerp van de planning (de kalender krijgt alleen de tonen)
  of van de chat.

## Bijlage: tellingen

Gemeten 11 oktober 2026 op main (`6af84f7c`), alleen uit de code.

- 15 pagina's (`src/pages/Partner*.tsx` zonder `Partners.tsx` en
  `PartnerTerms.tsx`), 42 componenten in `src/components/partner-portal`,
  18.946 regels samen. Grootste: `PartnerItemSheet` 1.266,
  `PartnerAccommodationQuoteSheet` 1.264, `PartnerBlockSheet` 1.109,
  `PartnerFinance` 962, `PartnerProject` 892, `PartnerGuides` 887.
- Ontwerpschuld met de regels van CI: 383 in 27 bestanden (346
  paletkleuren, 33 eyebrows, 2 `text-white`, 1 schaduw, 1 `hsl(var)`);
  daarnaast 119 `dark:`-varianten en 20 paletkleuren buiten de
  hoofdlijst (rose, purple, sky, indigo).
- 42 `Badge`s in 18 bestanden, 1 `Pill`; 41 gekleurde meldingsvlakken;
  5 `Alert`s.
- 11 `Dialog`s, 6 `Sheet`s, 3 `AlertDialog`s; `ResponsiveSheetContent`,
  `FormField`, `LoadingState`, `SuccessScreen`, `Notice`, `PortalHead`:
  0; `EmptyState`: 1.
- 160 losse `Label`s; ongeveer 78 destructieve toasts in twee systemen
  (`useToast` 74 bestanden in de hele code, sonner 98).
- 31 `Skeleton`s, 38 `Loader2`'s, ongeveer 25 eigen "Geen …"-kaarten,
  4 eigen foutschermen.
- Ongeveer 240 keer u/uw en 50 keer je/jij/jouw; 49 regels met een
  gedachtestreepje; 7 uitroeptekens; 6 ampersands in koppen.
- De `fetch` van `get-partner-dashboard` staat 4 keer in pagina's plus 1
  keer in `usePartnerDashboard` (alleen Planning); de sessie- en
  impersonatiecontrole 4 keer plus `useCurrentPartner`.
- Tests: 15 Vitest-bestanden voor de partnerbibliotheek
  (`itemStatus`, `projectStatus`, `partnerCommissionInvoices`,
  `partnerAgreements`, `getPartnerProjectsOverview`, …) en 7
  Deno-tests; geen componenttests, geen visuele opname.
