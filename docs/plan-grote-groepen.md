# Plan: de website voor grote groepen (50 tot 150 personen)

Status: geparkeerd op 22 september 2026 (besluit Erwin): eerst een seizoen
draaien met de optimalisaties van september, dan dit plan opnieuw bekijken
(voorjaar 2027). Drie dingen zijn wel meteen opgepakt, zodat het seizoen
antwoorden oplevert: de meting per groepsgrootte in admin (Projecten), de
drie cases als referentiepagina (Kreeft, Lexence, Stedelijk Gymnasium; de
klant keurt zelf goed) en Search Console (de site is al geverifieerd; het
lezen van de cijfers is aan Erwin, zie "Meten").

Aanvulling van Erwin (22 september) die de tweede voordeur raakt: "zelf
regelen bij de eilandpartners" werkt niet zonder zijn ogen. Elk programma
vraagt controle bij partners en klanten, of de klant het nu in de wizard
samenstelt of Erwin het op maat maakt. Het enige dat echt zonder hem kan,
is direct boeken via MAP. Bij het opnieuw bekijken van het plan wordt de
route voor kleinere groepen dus smaller (alleen MAP-boekingen, met een
breder MAP-aanbod als voorwaarde) en de vraag of de wizard helemaal dicht
mag komt erbij; vraag 4 en 8 hieronder veranderen mee.

Oorspronkelijke status: voorstel, 22 september 2026, op basis van de
strategische briefing van Erwin van dezelfde dag; uitvoeren per fase, elk
in een eigen pull request, pas na akkoord en antwoord op de vragen onder
"Besluiten gevraagd".

Schrijfregel uit de briefing, hier al toegepast: geen gedachtestreepjes,
gewone interpunctie. Aanspreekvorm op de site blijft "u".

## Samenvatting

- De site is nu een zelfbedieningsplatform voor groepen vanaf 8 personen:
  de wizard is de hoofdroute op vrijwel elke pagina, twaalf landingspagina's
  mikken op generieke termen, direct boeken en losse catering staan naast
  elkaar. Dat past bij het doel van de afgelopen maanden (volume,
  zelfbediening als onderscheid, zie `docs/concurrentie-positionering.md`),
  niet bij de briefing (drie tot vijf grote groepen per jaar, zo min
  mogelijk tijd per aanvraag, onafhankelijkheid als kern).
- De cijfers bevestigen dat: van 96 aanvragen in 2026 zijn er 14 van 50
  personen of meer; 61 kwamen via de wizard; 58 zijn geannuleerd; er is nog
  geen enkele directe boeking; logies zat bij 18 procent van de aanvragen.
- Voorstel: één filter vooraan (50 of meer: aanvraag met voorstel; kleiner:
  zelf regelen bij de eilandpartners), de kernzin "niet van een hotel" in de
  hero, een hub voor grote groepen, de overnachtingspagina met de echte
  verdeling over hotel, groepsaccommodatie en camping, vier
  doelgroeppagina's nieuw of herschreven, drie echte cases als
  referentiepagina's, één aanvraagformulier voor grote groepen, en de
  wizard naar de tweede rij.
- Vijf bouwfasen, 7 tot 11 bouwdagen, plus feiten van Erwin (cases,
  capaciteit van de logies) die nergens op de site of in het systeem staan.

## Waar het plan op steunt

### Cijfers uit productie (22 september 2026)

Aanvragen (`program_requests`, 2026): 96 in totaal.

| Groepsgrootte | Aantal | Aandeel |
|---|---|---|
| tot 20 personen | 59 | 61 procent |
| 20 tot 49 | 23 | 24 procent |
| 50 tot 99 | 9 | 9 procent |
| 100 of meer | 5 | 5 procent |

- Herkomst: 61 zelfbediening (wizard, losse aanvraag, losse logiesaanvraag),
  13 maatwerk zakelijk, 12 offerte, 5 sales-inbox, 3 alleen catering,
  2 maatwerk privé.
- Status: 58 geannuleerd, 27 actief, 11 verwijderd.
- Duur: 50 eendaags, 31 tweedaags, 11 driedaags, 4 langer.
- De 14 aanvragen van 50 of meer: Stedelijk Gymnasium Haarlem (166 en 153,
  twee werkweken), Lexence (130), Bouwbedrijf Kreeft (115), Kuiper Bouw
  (52), een familie (64), twee zonder organisatienaam (80 en 50), en zes
  geannuleerde (110, 80, 60 en drie keer dezelfde van 55). Acht lopen. Dat
  is de doelgroep van de briefing, en hij is er dus al: vier van de acht
  actieve grote projecten zijn precies het mkb, de advocaten en de school
  die de briefing noemt.
- Zomertrechter (`docs/plan-frontend-usability.md`): 33 aanvragen tussen
  9 juni en 9 september, 19 geannuleerd (58 procent), 3 getekend; het
  aantal zakte sterk na het stopzetten van Google Ads.
- Logies: 23 logiesaanvragen ooit (11 onder de 20 gasten, 9 tussen 20 en
  49, 3 van 50 of meer); voorkeur 13 keer hotel, 8 keer geen voorkeur.
- Aanbod: 51 gepubliceerde bouwstenen; bij 15 staat een maximum, bij 3 is
  dat 50 of meer, bij 1 is het 100 of meer (strandyoga). De 12
  voorbeeldprogramma's zijn geschreven voor teams van 8 tot 80.
- Partners: 47 actief, waarvan 14 logies (11 hotels, 1 groepsaccommodatie,
  1 camping); 13 van de 14 logiesprofielen zijn leeg en geen enkele partner
  heeft capaciteitsvelden (bedden, kamers, seizoen).
- Direct boeken (kaartmodule): 0 boekingen.
- Beoordelingen: 4, allemaal de oude citaten; de beoordelingspagina is drie
  dagen oud.

### Zoekresultaten (22 september, via de zoekmachine van deze omgeving; indicatief)

- "bedrijfsuitje Vlieland": VVV Vlieland, Sailing Dutchman, bureauvlieland.nl
  (twee keer, waaronder een oude URL die doorstuurt), WadEvents, Edgeplore,
  Island Events, Ienvent, 1001activiteiten. Wij staan erbij, tussen zeven
  anderen; de term is precies zo generiek als de briefing zegt.
- "groepsaccommodatie Vlieland 100 personen": overzichten van
  groepsverblijven (De Nulck 37 personen, Torenzicht 33, Stortemelk
  tenthuisjes van 20), platforms voor groepsaccommodaties. Geen enkel
  resultaat biedt 100 personen. Dat gat is van ons te maken: op Vlieland
  slaapt een groep van 100 verdeeld, en dat verdelen is wat wij doen.
- "Vlieland overnachten grote groep 80 personen hotel": VVV, wadden.nl,
  boekingsplatforms; niets specifieks. Zelfde gat.
- "familieweekend Vlieland": WestCord heeft een eigen pagina
  "Familieweekend op Vlieland" (arrangement vanaf 10 personen);
  verder groepsaccommodaties.
- Island Events: "groepen van 10 tot 400 personen", eigen hotels
  (Strandhotel Seeduyn 150 kamers, Hotel De Wadden 22 kamers), pagina's
  bedrijfsuitje, personeelsuitje, vergaderen, zakelijk; actie: bel of mail.
  Concurrenten noemen wij op de site nergens; deze regels dienen alleen
  het plan.

### De site nu, in het kort

De volledige inventaris (52 publieke routes, navigatie, voettekst,
linkclusters, alle telefoonvermeldingen, alle groepsgroottes in de
teksten) is op 22 september gemaakt; hieronder wat ertoe doet.

- Homepage: hero "Het eiland als bestemming. Wij als gids ernaartoe." met
  "lokale specialist" en "één factuur", zonder groepsgrootte; daaronder
  "Zes manieren om bij ons aan te kloppen" (wizard als "meest gekozen",
  direct boeken, op maat, voorbeelden, catering, logies), de live agenda
  van direct boekbare activiteiten, klantquotes, "Honderden mogelijkheden,
  één eiland", catering, voorbeeldprogramma's, het manifest van Erwin, en
  een slotblok "Vijf minuten om uw programma samen te stellen" met als
  tweede knop "Liever bellen? 0562 700 208".
- Navigatie: "Wat we organiseren" (activiteiten, direct boeken,
  overnachten, catering, evenementen), "Inspiratie", "Voor wie" (zeven
  zakelijke en drie privé-landingspagina's), "Over ons"; knop "Start uw
  aanvraag" naar de zes routes.
- Twaalf landingspagina's op één sjabloon, allemaal met dezelfde
  eilandfeiten ("Groepen: van 8 tot 200 personen") en dezelfde knoppen
  ("Stel uw programma samen", "Liever maatwerk?"). Vier mikken expliciet op
  kleine teams (teamuitje: "kleine en middelgrote teams"; ideeën: "voor
  teams tot 12 personen"; heisessie: MT's en directies; incentive).
- Zeven verschillende grenzen in de teksten: vanaf 8, 8 tot 200, 10 tot
  150, tot circa 30 voor de wizard, 20 tot 200, 80 en meer, meer dan 400.
- Aanvraagstromen: wizard, losse aanvraag, programma op maat, offerte
  (maakt geen rij in de database, alleen mail), logies, catering, direct
  boeken. Aantal personen staat overal standaard op 20, mag 1 tot 500, en
  geen enkele stroom doet iets met dat aantal, behalve de ondergrens van 30
  voor de privévaart en de plaatsenlimiet bij direct boeken. Overnachting
  wordt in de wizard en bij op maat alleen gevraagd bij meerdaags.
- Bewijs: Kreeft komt nergens voor; Lexence alleen als bestandsnaam van
  cateringfoto's; het Stedelijk Gymnasium alleen in een prompt voor
  factuurherkenning. De homepage rekent met "200+ programma's", "20+
  partners" en "8+ jaar".
- "Voor wie" noemt vier groepen (bedrijven en teams van 10 tot 150,
  management en directie, organisaties en instellingen met scholen als
  voorbeeld, evenementenbureaus en trainers). "Samenwerken" richt zich op
  bureaus en trainers (white-label). Verenigingen staan alleen als kopje op
  de groepsweekendpagina; reünies, kampweekenden, nascholingen,
  bestuursweekenden en verenigingscongressen hebben geen pagina.
- De referentiemachine (fase 3 van het beoordelingenplan, 22 september)
  maakt van een programma een pagina met dagindeling, feiten, foto's en
  citaat, met akkoord van de klant. Er staat nog geen referentie online.

## Beoordeling tegen de briefing

### Wat al klopt

1. Eén partij, één factuur, een eilander met naam en gezicht, "u",
   één belofte (binnen 5 werkdagen een voorstel) uit één bron.
2. Het landingssjabloon: een nieuwe doelgroeppagina is een inhoudsbestand,
   geen nieuwe component. Precies wat dit plan nodig heeft.
3. De referentiemachine: het instrument voor Kreeft, Lexence en het
   Gymnasium, met de toestemming van de klant ingebouwd.
4. Logies in de praktijk: 14 logiespartners, offertes bij meerdere
   accommodaties, de klant kiest. De onafhankelijkheid bestaat; ze wordt
   alleen nergens zo genoemd.
5. Attributie per instappagina en de trechter in admin: meten kan.
6. Concurrenten worden nergens genoemd.
7. Sporen van de grote groep zijn er al: "hotelovername", "meerdere logies
   combineren", "tot circa 150 deelnemers", "bij grote groepen splitsen wij
   op in deelactiviteiten", en in de wizard "maximaal 40 personen per
   groep; wij regelen extra begeleiding of een tweede groep".

### Wat ontbreekt

1. De kernzin. "Wij zijn niet van een hotel" staat nergens. De
   logiespagina beschrijft een vergelijkingsdienst ("wij vragen offertes op,
   u vergelijkt"), niet "wij kiezen de plek die bij uw groep past".
2. De groepsgrootte als eerste wat een bezoeker ziet. De hero noemt geen
   aantal; de rest van de site zeven verschillende.
3. Een filter. Een groep van 120 en een gezin van 6 krijgen dezelfde wizard,
   hetzelfde formulier en dezelfde belofte.
4. Doelgroep 2, 3 en 4 uit de briefing: verenigingen en clubs, reünies en
   grote familieweekenden, meerdaagse inhoudelijke bijeenkomsten. Geen
   pagina, dus geen zoekintentie.
5. Bewijs met namen en aantallen. Drie sterke cases bestaan in het
   systeem, geen ervan op de site.
6. Capaciteitskennis. Welke combinaties van hotel, groepsaccommodatie en
   camping 80, 120 of 150 mensen kunnen herbergen, in welk seizoen, staat
   nergens en zit ook niet in het datamodel. Zonder die kennis is
   "wij kiezen de plek die past" een belofte zonder onderbouwing.
7. Pagina's voor de vragen vóór de hotelkeuze: "Vlieland met 100
   personen", "overnachten grote groep Vlieland", "personeelsuitje 100
   man".
8. Parallel plannen als expertise: één regel in de FAQ en een label in de
   wizard.

### Wat er niet meer bij past

1. De wizard als hoofdroute (hero, zwevende knop op mobiel, het keuzeblok
   onderaan zo'n 25 pagina's, het slotblok "Vijf minuten om uw programma
   samen te stellen"). Hij levert kleine groepen (61 van 96 aanvragen) met
   58 procent annulering, en voor 100 personen is een prijs per stuk van
   bouwstenen met een maximum van 40 of 50 geen voorstel. De briefing wil
   juist weinig tijd per aanvraag.
2. "Zes manieren om bij ons aan te kloppen": zes ingangen zonder de ene
   vraag die ertoe doet.
3. Het zelfbedieningsargument ("geen offerte-aanvraag nodig om te zien wat
   mogelijk is"): het antwoord op de concurrentieanalyse van 10 september.
   Voor grote groepen is het voorstel het product. De regel verhuist naar
   de route voor kleinere groepen.
4. Twaalf landingspagina's op generieke termen, allemaal met "van 8 tot
   200 personen": ze werven voor iedereen, dus voor niemand in het
   bijzonder. Vier ervan mikken op kleine teams.
5. Doelgroepen die de briefing niet noemt: bureaus en trainers
   ("Samenwerken"), scholen als voorbeeld bij organisaties, het privéjubileum
   (huwelijk, pensioen), catering "vanaf 8 personen" als losse dienst.
6. Superlatieven en vage cijfers: "onvergetelijk", "mooiste Waddeneiland",
   "Honderden mogelijkheden" (het zijn er 51), "High-end koken op locatie.
   Op Vlieland uniek.", "200+ programma's", "20+ partners" (het zijn er 47).
7. De telefoon als tweede knop op de homepage en "bel ons" op de
   cateringpagina.
8. Direct boeken en de live agenda op de homepage: bij nul boekingen en een
   directeur van een bouwbedrijf als bezoeker is dat de verkeerde etalage.
   Ze horen bij de route voor kleinere groepen.
9. De voorbeeldprogramma's: geschreven voor 8 tot 80. Voor 100 personen zijn
   het geen voorbeelden.

### Kritisch naar onze eigen geschiedenis

- September ging op aan de wizard (ontwerpsysteem fase 0 tot 2), de
  landingspagina's als sjabloon, direct boeken, beoordelingen en
  referentiepagina's. Het meeste blijft nuttig (sjabloon, referentiemachine,
  meting, het ontwerpsysteem zelf). Maar de wizard en direct boeken zijn
  gebouwd voor een volume dat de briefing niet wil. Advies: niet slopen, wel
  degraderen tot de route voor kleinere groepen, en er geen bouwtijd meer in
  steken. Ook geen Google Ads meer op generieke termen.
- De concurrentieanalyse van 10 september zette in op zelfbediening en op
  "bedrijfsuitje Vlieland" als term waar wij het van de hotelketen konden
  winnen. De briefing draait dat om: de generieke term is van het hotel, en
  onze troef is dat wij er niet van zijn. Dat is een keuze, geen fout, maar
  we moeten hem hardop maken; roadmappunt 8 (concurrentiepositie) vervalt in
  zijn huidige vorm.
- Het beoordelingenplan mikt op aantallen (40 procent van de nazorgmails
  ingevuld, Google-reviews per maand). Voor drie tot vijf grote groepen per
  jaar zijn drie cases met naam en aantal meer waard dan dertig sterren.
  Het meetpunt blijft staan; de hoofd-KPI wordt het aantal aanvragen van 50
  personen of meer per kwartaal, en wat daarvan doorgaat.
- Het verdienmodel leunt op de logiescommissie, en logies zat bij 18
  procent van de aanvragen. In de aanvraag voor grote groepen wordt
  overnachting een vaste vraag ("hoeveel nachten"), niet een vinkje dat
  alleen bij meerdaags verschijnt.
- De briefing zit zelf ook een spanning: doelgroep 4 (heidagen,
  bestuursweekenden) is zelden 50 personen of meer. Als 50 de harde
  ondergrens is, vallen die pagina's af of richten ze zich op nascholingen
  en congressen. Vraag 2 hieronder.

## Voorstel

### Principes

1. Twee voordeuren, één filter. Grote groep (50 of meer): een aanvraag die
   uitmondt in een voorstel. Kleiner: zelf regelen bij de eilandpartners
   (activiteiten, direct boeken, de wizard). De vraag "hoeveel personen"
   staat op de homepage, in het menu en op elke doelgroeppagina, en de
   kleine groep verlaat het ecosysteem niet: hij landt bij de eilandpartners
   die via ons boekbaar zijn.
2. De kernzin in de hero, letterlijk uit de briefing: "Bureau Vlieland is
   niet van een hotel. Wij organiseren groepen van 50 tot 150 personen op
   Vlieland en kiezen de plek die bij uw groep past, niet de plek die ons
   bed moet vullen. Eén aanspreekpunt, één factuur, eilanders die alle
   partners kennen."
3. Overnachting is de kern van het voorstel, geen optie: elke aanvraag
   vraagt ernaar, elke doelgroeppagina heeft een blok "slapen met uw groep".
4. Verkoop het eiland en het samenzijn, niet een lijst activiteiten. Voor
   grote groepen is parallel plannen de expertise; dat leggen we één keer
   goed uit, met een voorbeeld van een dag voor 120 mensen in drie groepen.
5. Bewijs met drie cases met aantallen. Geen verzonnen citaten; de vier
   bestaande citaten blijven, want die zijn echt.
6. Vindbaar op vragen vóór de hotelkeuze: groepsgrootte plus Vlieland,
   overnachting plus Vlieland, soort groep plus Vlieland.
7. Toon: kort, zelfverzekerd, eilands, "u", zonder superlatieven, met
   aantallen, dagen, wat geregeld wordt, één factuur. Geen telefoonnummer
   als primaire actie; het nummer blijft in de voettekst en op contact.

### Sitemap

Nieuw of herschreven. Wat niet genoemd wordt, blijft zoals het is.

| Pad | Wat | Doel | Zoekintentie | Kernboodschap |
|---|---|---|---|---|
| `/` | herschrijven | Filteren en de kernzin brengen | merknaam, "Bureau Vlieland" | Niet van een hotel; 50 tot 150 personen; één factuur. Grote groep: aanvraag. Kleinere groep: regel het zelf bij onze partners |
| `/grote-groepen-vlieland` | nieuw (hub) | De pagina voor iedereen die met veel mensen naar Vlieland wil en nog geen hotel heeft | "Vlieland grote groep", "Vlieland 100 personen", "groepsuitje Vlieland 80 personen", "Waddeneiland grote groep" | Wat kan met 50, 80, 120 en 150: de boot, de bedden, drie groepen tegelijk; zo werkt het; de drie cases; de aanvraag |
| `/logies-vlieland` | herschrijven (zelfde URL) | De onafhankelijkheid waarmaken | "groepsaccommodatie Vlieland 100 personen", "hotel Vlieland groep", "overnachten Vlieland 80 personen", "slapen Vlieland grote groep" | Wij zijn niet van een hotel. Zo verdelen wij een groep over hotel, groepsaccommodatie en camping, met de echte aantallen per seizoen |
| `/personeelsuitje-vlieland` | nieuw (doelgroep 1) | De directeur van het mkb die zijn mensen wil belonen | "personeelsuitje Vlieland", "personeelsuitje 100 personen", "bedrijfsuitje 100 man Waddeneiland", "personeelsreis eiland" | Eén of twee dagen voor 50 tot 150 medewerkers, hotel of verdeeld, eten en avond geregeld, één factuur. Case Kreeft |
| `/bedrijfsuitje-vlieland` | herschrijven (zelfde URL, staat al in de resultaten) | De generieke zoeker filteren | "bedrijfsuitje Vlieland" | Met 50 tot 150 collega's naar Vlieland. Kleiner team: activiteiten en direct boeken bij onze partners |
| `/meerdaags-bedrijfsuitje-vlieland` | herschrijven, incentive erin | Meerdaags met overnachting | "meerdaags bedrijfsuitje Vlieland", "bedrijfsuitje met overnachting Waddeneiland", "incentive Vlieland" | Twee of drie dagen, overnachting gekozen voor uw groep, avondprogramma, één factuur. Case Lexence |
| `/verenigingsweekend-vlieland` | nieuw (doelgroep 2) | Verenigingen, clubs, studentenverenigingen, kampweekenden, clubjubilea | "verenigingsweekend Vlieland", "kampweekend Vlieland", "sportclub weekend Waddeneiland", "studentenvereniging weekend eiland", "jubileum vereniging Vlieland" | Het hele ledenbestand een weekend bij elkaar, verdeeld over groepsaccommodatie en camping, eten en avond geregeld |
| `/familieweekend-vlieland` | herschrijven (doelgroep 3) | Reünies en grote familieweekenden | "familiereünie Vlieland", "familieweekend grote groep Vlieland", "reünie Waddeneiland" | Drie generaties, 50 of meer, verdeeld over huizen en hotel; kleinere families: vakantiehuizen via de eilandpartners |
| `/zakelijk-evenement-vlieland` | herschrijven (doelgroep 4), heisessie erin | Meerdaagse inhoudelijke bijeenkomsten | "congres Vlieland", "nascholing Waddeneiland", "bestuursweekend Vlieland", "heidagen Vlieland organisatie" | Zaal, slapen, eten en een middag eiland voor 50 tot 150 deelnemers, alles op loopafstand |
| `/jubileum-vlieland` | herschrijven | Bedrijfs- en verenigingsjubilea | "bedrijfsjubileum vieren eiland", "jubileum Vlieland" | Het jubileum van uw bedrijf of vereniging met alle mensen op het eiland; privéfeesten: contact |
| `/referenties` en drie pagina's | bestaande machine, drie cases | Bewijs | "Bureau Vlieland ervaringen", merknaam | Kreeft (115), Lexence (130), Stedelijk Gymnasium (jaarlijkse werkweek, circa 160) met programma, aantallen en wat wij deden |
| `/aanvraag-grote-groep` | nieuw formulier | De ene aanvraag voor 50 of meer | (geen zoekintentie; landingsdoel van alle knoppen) | Vertel ons groep, periode, nachten en aanleiding; binnen 5 werkdagen een voorstel |
| `/voor-wie` | herschrijven | De vier doelgroepen en wat wij niet doen | "voor wie" | Mkb, verenigingen, families, inhoudelijke bijeenkomsten; onder de 50: zelf regelen; scholen welkom als het past |
| `/onze-werkwijze` | herschrijven | Het proces voor een grote groep | "werkwijze" | Aanvraag, voorstel binnen 5 werkdagen, keuze van het verblijf, parallel plannen, één factuur achteraf |
| `/partners` | intro herschrijven | De onafhankelijkheid tastbaar maken | "partners Vlieland" | Wij zijn niet van een hotel: dit zijn de 14 logiespartners en 33 aanbieders waaruit wij kiezen |
| `/activiteiten-vlieland`, `/bouwstenen`, `/activiteiten-boeken`, `/programma-samenstellen`, `/snel-aanvragen`, `/catering`, `/catering-aanvragen`, `/voorbeeldprogrammas`, `/evenementen` | blijven; één vaste kopregel erbij | De route voor kleinere groepen en dagbezoek | de bestaande termen (activiteiten Vlieland, zeehondentocht, wadlopen) | Voor groepen tot 50 personen: regel het zelf bij onze eilandpartners. Grote groep? Dan deze kant op |
| `/teamuitje-vlieland`, `/bedrijfsuitje-ideeen-vlieland`, `/incentive-reis-vlieland`, `/heisessie-vlieland`, `/groepsweekend-vlieland`, `/programma-op-maat`, `/offerte` | doorsturen (301) | Minder pagina's die voor iedereen werven | | teamuitje en ideeën naar bedrijfsuitje, incentive naar meerdaags, heisessie naar zakelijk evenement, groepsweekend naar verenigingsweekend, op maat en offerte naar de aanvraag grote groep |
| `/samenwerken` | uit het menu, blijft in de voettekst | | | vraag 3 |

### De homepage

Van boven naar beneden, in plaats van de huidige negen secties:

1. Hero: de kernzin, één primaire knop "Aanvraag voor een grote groep" en
   één tekstlink "Kleinere groep of dagje Vlieland? Regel het zelf".
   Geen cijferstrip met "200+"; wel de drie cases als regel: "Bouwbedrijf
   Kreeft, 115 personen · Lexence, 130 personen · Stedelijk Gymnasium
   Haarlem, elk jaar 160 leerlingen" (aantallen te bevestigen).
2. Hoe groot is uw groep? Twee kaarten: "50 tot 150 personen" (wat wij
   regelen, naar de hub of de aanvraag) en "Tot 50 personen" (activiteiten,
   direct boeken, zelf samenstellen). Dit is het filter.
3. Zo werkt het voor een grote groep: drie stappen. U vertelt ons groep,
   periode en aanleiding. Wij kiezen het verblijf en plannen de dagen,
   drie groepen tegelijk waar dat moet. U krijgt één voorstel en achteraf
   één factuur.
4. Slapen met uw groep: hotel, groepsaccommodatie, camping of een
   combinatie, met de zin "wij zijn niet van een hotel" en de link naar de
   overnachtingspagina.
5. Referenties: de drie cases als kaarten (referentiemachine).
6. Voor wie: vier kaarten naar de doelgroeppagina's.
7. Erwin: het manifest, ingekort tot het samenzijn en het eiland.
8. Kleinere groep of dagje Vlieland: één sectie met activiteiten, direct
   boeken en de wizard; hier mag het zelfbedieningsargument staan.
9. Slotblok zonder telefoonknop: "Aanvraag voor een grote groep" en
   "Bekijk de referenties".

Weg: "Zes manieren om bij ons aan te kloppen", de live agenda, "Honderden
mogelijkheden, één eiland", de losse cateringsectie (catering wordt een
regel in stap 3: eigen keuken, eigen chefs), de voorbeeldprogramma's, de
statistiekstrip.

### De aanvraag voor een grote groep

Eén formulier op `/aanvraag-grote-groep`, ook het doel van "Programma op
maat" en "Offerte" (die sturen door). Velden:

- Organisatie en soort groep (bedrijf, vereniging of club, familie,
  bijeenkomst of congres, anders).
- Aantal personen (minimaal 50; daaronder toont het formulier de route
  voor kleinere groepen in plaats van een verzendknop; zie vraag 1).
- Periode: maand en jaar, of exacte data als die er zijn.
- Dagen en nachten: één dag, twee dagen met één nacht, drie dagen met twee
  nachten, langer.
- Overnachting: hotel gewenst, mag ook verdeeld, alleen een dagprogramma.
- Budgetindicatie per persoon (optioneel).
- Aanleiding en wensen (vrije tekst).
- Naam, e-mail, telefoon (optioneel; wij bellen als dat helpt, u hoeft
  niet te bellen).

Onder de knop: "Vrijblijvend. Binnen 5 werkdagen ontvangt u een voorstel."
Technisch: één rij in `program_requests` met een nieuwe herkomst
`grote_groep`, de instappagina als attributie, en bij overnachting meteen
een gekoppelde logiesaanvraag (zoals de wizard dat nu doet), zodat het
project in admin als "combi" verschijnt en de logiesoffertes kunnen
starten. Bevestigingsmail op het bestaande template, met een eigen regel
voor grote groepen. De offertepagina, die nu geen rij in de database
maakt, vervalt daarmee.

De wizard krijgt in de basisstap een poort: bij 50 personen of meer
verschijnt "Voor groepen vanaf 50 personen maken wij het voorstel" met een
knop naar de aanvraag, met het aantal al ingevuld. Verder blijft de wizard
zoals hij is; er komt geen bouwtijd meer in.

### Overnachten: de pagina die de belofte waarmaakt

`/logies-vlieland` wordt "Overnachten op Vlieland met een grote groep".
Inhoud: de drie soorten (hotel, groepsaccommodatie, camping) met per soort
hoeveel mensen er realistisch slapen en in welk seizoen; drie rekenvoorbeelden
(80 personen, 120, 150) die laten zien hoe wij verdelen; hoe wij kiezen
(afstand tot elkaar, eten op één plek, avondprogramma, budget); de zin
"wij zijn niet van een hotel"; de aanvraag. De aantallen komen van Erwin
(vraag 5) en gaan ook het systeem in: per logiespartner een capaciteit
(bedden of kamers, groepsgeschikt ja of nee, seizoen), zodat admin bij
een aanvraag van 120 meteen ziet welke combinaties kunnen. Dat is een klein
datamodel en een veld in het partnerprofiel, geen herbouw.

### De doelgroeppagina's

Alle vier op het bestaande landingssjabloon, met dezelfde vaste opbouw:
hero met groepsgrootte en overnachting in de eerste zin, "wat u koopt is
samen zijn" (autovrij, klein, iedereen een paar dagen bij elkaar), een
voorbeelddag voor de groepsgrootte van die doelgroep (drie groepen
tegelijk), slapen met uw groep, eten en avond, de bijpassende case, de
aanvraag, en één regel voor de kleinere variant ("Bent u met minder dan 50?
Dan regelt u het zelf via ...").

De eilandfeiten (`ISLAND_FACTS`) veranderen mee: "Groepen: 50 tot 150
personen", "Overnachting: hotel, groepsaccommodatie, camping of een
combinatie", "Overtocht: 90 minuten varen vanaf Harlingen", "Voorstel:
binnen 5 werkdagen".

### Bewijs: de drie cases

Kreeft, Lexence en het Stedelijk Gymnasium zijn projecten in het systeem,
dus de referentiemachine kan er pagina's van maken (dagindeling, feiten,
foto's van de bouwstenen). Wat nog niet kan: een referentie maken zonder
beoordeling. Dat wordt een kleine uitbreiding in admin ("Referentie uit
een project"), waarna de akkoordmail naar de klant gaat zoals nu. Teksten:
AI-voorzet, geredigeerd door Erwin, goedgekeurd door de klant. Op de
homepage, de hub en de doelgroeppagina's staan de cases als kaart met
naam, aantal en periode. Geen citaten die er niet zijn; wel de feiten.

### Navigatie en voettekst

- "Grote groepen": de hub, overnachten, personeelsuitje, verenigingsweekend,
  familieweekend, zakelijk evenement, jubileum, referenties.
- "Zelf regelen": activiteiten op Vlieland, direct boeken, programma
  samenstellen, catering, voorbeeldprogramma's, evenementen.
- "Over ons": werkwijze, over Bureau Vlieland, partners, contact.
- Knop rechtsboven: "Aanvraag grote groep".
- Voettekst in dezelfde driedeling; "Samenwerken" en "Partner login" in de
  onderste rij; het telefoonnummer blijft bij het adres.
- `scripts/generate-sitemap.ts`: de nieuwe paden erin, de doorgestuurde
  eruit; de redirects in `public/_redirects`.

### Meten

- Hoofd-KPI: aanvragen van 50 personen of meer per kwartaal (2026 tot nu:
  14, waarvan 8 lopend), het aandeel met overnachting, en wat doorgaat.
- Gedaan (22 september): bij Projecten staat de kaart "Aanvragen per
  groepsgrootte" (onder de 20, 20 tot 49, 50 tot 99, 100 of meer; dit
  jaar, laatste 90 dagen of alles) met aanvragen, lopend, getekend,
  geannuleerd, met logies, meerdaags en de instappagina's. De instappagina
  gaat pas sinds 19 september met elke aanvraag mee; daarvoor staat hij op
  "onbekend".
- Google Search Console: de site is al geverifieerd (twee
  `google-site-verification`-tags in `index.html`, sitemap in
  `robots.txt`). Vanuit deze omgeving is er geen toegang. Erwin opent
  Search Console met het Google-account dat de site heeft toegevoegd,
  controleert onder Sitemaps of `https://bureauvlieland.nl/sitemap.xml` is
  ingediend, en exporteert bij het bekijken van het seizoen "Prestaties →
  Zoekopdrachten" en "Prestaties → Pagina's" (laatste 12 maanden) als CSV.
  Dat is de enige bron die zegt of de generieke termen iets brengen of dat
  de vragen vóór de hotelkeuze al binnenkomen.
- De trechter van de beoordelingen blijft; hij meet iets anders.

## Fasen

Elke fase een eigen pull request met preview.

**Fase 0: feiten en besluiten (Erwin, geen bouwwerk).** De antwoorden
hieronder; per logiespartner de capaciteit; per case de aantallen, de
periode, wat wij deden en of de naam op de site mag; toegang tot Search
Console.

**Fase 1: het filter en de kern (2 tot 3 dagen).** Homepage herschreven,
het aanvraagformulier voor grote groepen, de poort in de wizard, de nieuwe
navigatie en voettekst, het keuzeblok in twee varianten (grote groep,
zelf regelen), de doorsturingen van op maat en offerte, sitemap, meting.

**Fase 2: overnachten (1 tot 2 dagen).** De overnachtingspagina met de
verdeling, capaciteitsvelden bij de logiespartners in admin, de
partnerspagina op onafhankelijkheid.

**Fase 3: de doelgroeppagina's (2 tot 3 dagen).** De hub, personeelsuitje,
verenigingsweekend, en het herschrijven van bedrijfsuitje, meerdaags,
familieweekend, zakelijk evenement en jubileum; de doorsturingen van
teamuitje, ideeën, incentive, heisessie en groepsweekend; voor wie en
werkwijze.

**Fase 4: bewijs en toon (1 tot 2 dagen).** "Referentie uit een project"
in admin, de drie cases (na akkoord van de klanten), de cases op homepage,
hub en doelgroeppagina's, één tekstronde over de hele site (superlatieven,
aantallen, de telefoon als knop), de FAQ's, de visuele referenties
vernieuwd.

**Fase 5: opruimen (halve dag).** Roadmap en de concurrentieanalyse
bijwerken, de oude secties en inhoudsbestanden verwijderen, de
linkclusters herzien.

Totaal 7 tot 11 bouwdagen. Fase 1 levert het meeste op: daarna komt elke
grote groep op de goede plek binnen en verdwijnt de wizard uit het zicht
van de directeur.

## Besluiten gevraagd

1. **Ondergrens.** 50 hard, ook in het formulier (eronder geen verzendknop,
   wel de route voor kleinere groepen)? Advies: ja, zoals de briefing zegt.
   Ter overweging: Kuiper Bouw (52) en de familie van 64 zaten dicht bij de
   grens; een groep van 45 die zich toch meldt, kan altijd mailen.
2. **Doelgroep 4.** Heidagen en bestuursweekenden zijn zelden 50 of meer.
   Advies: één pagina "zakelijk evenement" voor nascholingen, congressen en
   organisatiebrede heidagen van 50 of meer, en heisessie doorsturen.
   Alternatief: heisessie houden als uitzondering onder de 50.
3. **Samenwerken (bureaus en trainers).** Uit het menu, wel in de voettekst
   en de pagina blijft bestaan? Advies: ja; bureaus brengen soms grote
   groepen, maar het is geen doelgroep van de briefing.
4. **De route voor kleinere groepen.** Wizard, losse aanvraag, direct boeken
   en de cateringaanvraag blijven als "zelf regelen", zonder bouwtijd?
   Advies: ja. De cateringaanvraag vanaf 8 personen blijft, want het is
   eigen keuken en eigen omzet.
5. **Capaciteit.** Welke combinaties zijn realistisch voor 80, 120 en 150
   personen, in welk seizoen, met welke partners? Zonder deze feiten geen
   overnachtingspagina en geen geloofwaardige kernzin.
6. **De cases.** Mogen Kreeft, Lexence en het Stedelijk Gymnasium met naam,
   aantal en periode op de site, en wat deden wij precies (Kreeft:
   programma en een deel van het eten, hotel via ons?; Lexence: de
   cateringfoto's staan al op de site; SGH: werkweek met draaiboek)? Het
   akkoord vragen wij via de referentiemachine.
7. **Contact.** Telefoon optioneel in het formulier, en wij bellen zelf als
   dat helpt? Advies: ja. De belofte blijft "binnen 5 werkdagen een
   voorstel".
8. **Doorsturingen.** Akkoord met de lijst in de sitemap (teamuitje,
   ideeën, incentive, heisessie, groepsweekend, programma op maat, offerte)?
   Elke doorsturing kost mogelijk wat ranking op de oude term; dat is de
   bedoeling.
9. **Prijsindicatie.** Eén bandbreedte per doelgroeppagina ("twee dagen met
   overnachting vanaf circa € x per persoon")? De FAQ noemt nu € 275 tot
   € 450 per persoon per etmaal. Advies: ja, met bedragen van Erwin.
10. **Google Ads** blijft uit; Search Console erbij. Akkoord?

## Wat dit plan bewust niet doet

- Geen nieuwe wizard en geen prijscalculator voor grote groepen: het
  voorstel is mensenwerk, en de site hoeft dat niet na te doen.
- Geen herbouw van admin, partnerportaal of klantportaal; alleen de
  capaciteitsvelden en "referentie uit een project".
- Geen nieuwe huisstijl: alles op het ontwerpsysteem van september.
- Geen pagina voor scholen, geen concurrent bij naam, geen vergelijkende
  claims, geen verzonnen citaten.
- Geen verwijdering van de route voor kleinere groepen: die blijft, als
  onderdeel van het ecosysteem, maar zonder de etalage.
