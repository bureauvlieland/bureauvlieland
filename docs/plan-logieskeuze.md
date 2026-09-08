# Plan: logieskeuze door de klant

Status: besluiten genomen 8 september 2026; fase 1 en fase 2 gebouwd (8 september), fase 3 en 4 nog niet. Grafisch voorstel: https://claude.ai/code/artifact/9db83ed8-2b94-49f0-8fb5-4937dadbc43f
(desktopkaart, detailvenster, mobiel).

## Waarom

Op de klantpagina kiest de klant nu uit een lijst met alleen de naam van de
accommodatie, de prijs en de verzorging. Alles wat een klant wil weten
(hoe ziet het eruit, waar ligt het, wat voor kamers, wat is er in de buurt)
staat er niet, terwijl het grootste deel van die informatie al in het systeem
zit en pas ná de keuze getoond wordt. De klant kiest dus blind en ziet het
hotel pas als hij getekend heeft.

## Wat er nu is (gemeten op 8 september)

- 14 actieve logiespartners. Dertien hebben **geen** foto's, beschrijving,
  highlights of ligging ingevuld. Eén (Zeezicht) heeft het compleet: 8 foto's,
  tekst, 5 highlights, ligging. Alle 14 hebben coördinaten (handmatig
  ingetikt). Eén partner (Torenzicht) heeft 4 kamertypes, zonder foto's.
- 105 logiesoffertes ooit, 23 aanvragen, 8 gekozen. In de praktijk krijgt een
  aanvraag **één** offerte; vergelijken tussen hotels komt zelden voor.
  Het herontwerp is dus vooral: het ene aanbod goed presenteren.
- Het datamodel heeft al: foto's per bedrijf (`gallery_images`), tekst
  (`about_text`, `accommodation_description`), highlights, adres en
  coördinaten, en per kamertype foto's, faciliteiten, bedden en m².
  Componenten bestaan al: fotogalerij met lightbox, Leaflet-kaart (zonder
  API-kosten), programmakaart met meerdere pins.
- Wat ontbreekt in het datamodel: foto's per offerte, de koppeling van een
  offerteregel naar het kamertype (de partner kiest wel een kamertype, maar
  alleen de naam wordt bewaard), faciliteiten op accommodatieniveau,
  check-in/uit-tijden, afstand tot boot en dorp, gestructureerde
  annuleringsvoorwaarden, een "zichtbaar voor klant"-vlag.

## Bevindingen die los van het herontwerp gefixt moeten worden

1. **Kiezen werkte niet** op /mijn-programma: de dialoog leverde handtekening
   en akkoord, maar ze werden niet doorgegeven; de server weigerde. Gefixt op
   8 september (pull request "Praktische info").
2. **"Interne notities" stonden bij de klant.** Besluit: het veld heet nu
   "Toelichting voor de klant" in partnerportaal en admin. Gedaan.
3. **De offertebijlage** wordt nu getoond op de kaart en in het detailvenster.
   Gedaan.
4. **Thumbnail**: de kaart gebruikt de galerij van de accommodatie. Gedaan.
5. **Bijlage-upload** op `/partner/logies/:id` werkt nu ook en zet
   `forwarded_at` terug, gelijk aan `/partner/logies`. Gedaan.
6. **Coördinaten**: één partner had een breedtegraad zonder decimaalpunt;
   hersteld met een controle in de database (migratie 20260908120000).

## Voorstel in fases

### Fase 1: tonen wat er al is (geen databasewijziging, ~2 dagen)

De keuzekaart wordt een accommodatiekaart: foto's bovenaan, naam, highlights,
ligging ("1 minuut van de boot"), kamerverdeling, verzorging, inbegrepen,
extra's met dag en tijd, prijs, geldigheid, en drie knoppen (details,
vraag stellen, kiezen). Een detailvenster met de volledige galerij, tekst,
kaart, kamers, voorwaarden en contact. Bovenaan een balk met de wensen van de
klant (data, gasten, kamers, verzorging, ligging, faciliteiten) zodat hij
kan zien of het aanbod erop past. Partners zonder content krijgen een nette
lege staat ("Nog geen foto's van deze accommodatie"), geen kapotte kaart.
Alles hiervoor wordt al opgehaald door `get-customer-program`.

### Fase 2: het datamodel completer (gebouwd 8 september)

- `room_configuration` krijgt `room_type_id` plus een momentopname van naam,
  beschrijving, foto's, faciliteiten, bedden en m² zodra de partner een
  kamertype kiest in de offerte-sheet (`roomSnapshotFromType`). De klant
  ziet per kamer de foto's en faciliteiten op de kaart en in het
  detailvenster. Handmatig ingevulde kamers blijven mogelijk, zonder details.
- `accommodation_quotes.images`: eigen foto's bij een specifieke aanbieding,
  te uploaden in de offerte-sheet (max 6). Leeg = galerij van het bedrijf.
- `partners.facilities` (zelfde lijst als `facilities_required` op de
  aanvraag), `check_in_time`, `check_out_time`; in te vullen op
  /partner/profiel (alleen bij logiespartners). De kaart toont per gewenste
  faciliteit een vinkje of een kruisje; niets ingevuld = niets tonen.
- Afstand tot de boot en het dorp wordt berekend uit de coördinaten
  (`describeDistances`, hemelsbreed × 1,3; tot 20 minuten lopen, daarboven
  fietsen). Geen invoer nodig.
- "Zet op de kaart" op /partner/profiel zoekt de coördinaten op bij het adres
  uit de instellingen (functie `geocode-address`) en toont een kaartvoorbeeld;
  foutieve coördinaten worden direct gemeld.

Migratie: `20260908140000_logieskeuze-fase-2.sql`.

### Fase 3: content van partners (doorlopend, start direct)

Dertien van de veertien partners hebben niets ingevuld; zonder content is
het ontwerp een lege huls. Drie sporen tegelijk:

1. **Profielvolledigheid** in het partnerportaal (score met wat ontbreekt)
   en een overzicht in admin, plus een mailing aan alle logiespartners.
2. **Bureau vult zelf** de basis voor de belangrijkste partners: 4 foto's,
   3 regels tekst, highlights, ligging. Met toestemming van de partner.
3. **Optioneel: import uit Google Places** (sleutel is er al): foto's,
   beoordeling, adres per partner, met bronvermelding. Snelste weg naar
   gevulde kaarten; wel afhankelijk van Googles voorwaarden.

### Fase 4: vergelijken en meenemen (~1 dag, alleen als er echt meerdere
offertes per aanvraag komen)

Kaart met alle offertes als pins, prijs per persoon naast elkaar, en een
PDF "uw logiesoffertes" om intern te delen.

## Besluiten die ik van jou nodig heb

1. **Curatie.** Besloten 8 september: offertes blijven direct zichtbaar
   zodra de partner ze indient; geen vlag. "Doorsturen" in admin blijft
   alleen de mail aan de klant.
2. **Kamertype**: besloten 8 september: niet verplicht, wel gewenst. De
   offerte-sheet zet het kamertype voorop en laat vrije tekst als terugval.
3. **Content**: besloten 8 september: de partner vult zijn profiel; Google
   Places mag als startpunt dienen (import met bronvermelding, partner
   controleert en vult aan).
4. **Interne notities**: besloten 8 september: het veld wordt "Toelichting
   voor de klant" (partnerportaal en klantweergave); de afwijsreden blijft
   het via dit veld gebruiken.

## Volgorde

Fase 1 en 2 zijn gebouwd. Nu fase 3: volledigheidsscore en adminoverzicht,
zodat zichtbaar is welke partners nog foto's, tekst, faciliteiten en
kamertypes missen, en een mailing aan de logiespartners. Fase 4 pas bij
behoefte.
