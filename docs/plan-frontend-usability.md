# Plan: frontend usability en conversie

Status: deel 1 (bouwstenen/activiteiten-boeken) doorgevoerd 9 september; deel 2
is een voorstel voor de roadmap, besluiten nog nodig (zie onderaan).

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

### Wat nog een besluit van jou vraagt

- **De ene echte gemiste koppeling** (Wadloopexcursie → MAP-activiteit
  "Wadexcursie de Lepelaar") kan ik niet zelf in de database zetten — dat is
  bewust geblokkeerd voor directe database-schrijfacties buiten de applicatie
  om. Het kost jou een minuut: ga naar **Admin → Partners → Stichting Natuur
  Educatie Centrum Vlieland** (of laat de partner het zelf doen via *Mijn
  aanbod*), zoek bij de MAP-activiteiten "Wadexcursie de Lepelaar" en klik
  "Koppel aan bestaande" → Wadloopexcursie. Zelfde knop die al bestond voor
  dit doel.
- De rondleiding bij Brouwerij Fortuna: wil je dat de partner zelf beoordeelt
  of "Rondleiding en proeverij" in MAP dezelfde tour is als de bouwsteen, en
  zo ja zelf koppelt?
- Grotere stap, alleen relevant zodra meer partners hun aanbod via MAP online
  boekbaar maken (staat al open op de roadmap: "MAP: de 7 MAP-aanbieders hun
  activiteiten laten aanbieden"): zodra dat aantal een stuk groter is dan 2,
  wordt het de moeite waard om de resultaten van `/activiteiten-boeken` inline op
  de bouwsteen-kaart te tonen (tijdstip kiezen zonder pagina-wissel) in plaats
  van door te linken. Nu zou dat overengineering zijn voor twee activiteiten.

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
Dat kán normale seizoenspatroon zijn (Vlieland is een zomerbestemming;
juni-boekingen gaan mogelijk over een programma later dat seizoen, en de
site trekt na de zomer minder verkeer) — maar dat kan ik van hieruit niet
bevestigen. Ik heb geen toegang tot GA4/bezoekersaantallen, alleen tot wat er
in de eigen database aan aanvragen binnenkomt. Zie besluit hieronder: dit is
een openstaande vraag, geen conclusie.

**Logies-handoff** (funnel-audit Track C1, nog open): van de 33 aanvragen
sinds 9 juni zijn er 6 gekoppeld aan een logiesaanvraag (18%) plus 7 losse
logiesaanvragen — een verbetering ten opzichte van de ~9% uit de juni-audit
(de prominentere banner uit Track A3 lijkt te helpen), maar nog steeds ver
onder wat je zou verwachten als "één partij, één factuur" goed aansloeg.

**Duplicate-submits**: de sessionStorage-guard uit Track B4 helpt, maar sinds
9 juni hebben opnieuw vier klanten dezelfde aanvraag 2 tot 3 keer binnen
enkele minuten ingediend. Ik heb dit niet verder gediagnosticeerd (mogelijk
device- of tab-overstijgend, of via de "terug"-knop, wat de huidige
sessionStorage-guard niet afvangt) — dat hoort thuis in fase 1 hieronder als
een gerichte uitzoekklus, niet als aanname.

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

**Fase 1 — CTA-hiërarchie en formulieren (klein, direct te starten)**
- Bouwstenen-kaart: gedaan (deel 1).
- Zelfde soort keuze herzien bij Snel-aanvragen vs. Programma-samenstellen:
  één duidelijke vraag ("wilt u dit ene onderdeel snel regelen, of een heel
  programma samenstellen?") in plaats van twee knoppen naast elkaar.
- Inline validatie op Offerte en Programma-samenstellen; op termijn één
  gedeeld validatiepatroon voor nieuwe formulieren.
- Uitzoeken waarom duplicate-submits na de guard nog voorkomen (4 gevallen
  sinds juni) en de guard daarop aanscherpen.

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

### Besluiten die ik nodig heb

- Akkoord om fase 1 als eerste sprint te plannen (CTA-herziening
  Snel-aanvragen/Programma-samenstellen, inline validatie, duplicate-submit
  uitzoeken)?
- De juni→september-terugval in aanvragen: heb je zelf zicht op de
  bezoekersaantallen over dezelfde periode (GA4), of is dat ook voor jou
  onbekend? Zonder die vergelijking kan ik niet zeggen of dit seizoen is of
  een echt lek.
- Kun je GA4-toegang delen (dashboard-uitnodiging, of een periodieke export)
  zodat fase 3 en Track C2 uit de audit meetbaar worden?
- Fase 2 (logies in de wizard) raakt een kernflow — akkoord om dat als aparte
  planningsronde te doen zodra fase 1 loopt, net als bij de eerdere
  logieskeuze- en activiteitenaanbieders-trajecten?
