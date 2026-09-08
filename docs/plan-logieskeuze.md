# Plan: logieskeuze door de klant

Status: voorstel, 8 september 2026. Grafisch voorstel: https://claude.ai/code/artifact/9db83ed8-2b94-49f0-8fb5-4937dadbc43f
(desktopkaart, detailvenster, mobiel). Niets hiervan is gebouwd; eerst akkoord.

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
2. **Interne notities van de partner lekten naar de klant.** Het veld heet in
   het partnerportaal "Interne notities (alleen voor u)" en stond op drie
   plekken in de klantweergave. Verwijderen uit de klantdata.
3. **De offertebijlage** (PDF van de partner) wordt in de hoofdroute niet
   getoond, hoewel de link wordt aangemaakt.
4. **Thumbnail** van de partner is altijd leeg (`image_url` zit niet in de
   opgehaalde velden).
5. **Bijlage-upload** werkt maar op één van de twee partnerroutes
   (`/partner/logies` wel, `/partner/logies/:id` niet).

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

### Fase 2: het datamodel completer (~2 dagen)

- `room_configuration` krijgt `room_type_id` (plus een snapshot van naam,
  foto's, faciliteiten, bedden, m² op het moment van offreren), zodat de
  klant per kamer de foto's en faciliteiten ziet.
- `accommodation_quotes.images`: eigen foto's bij een specifieke aanbieding
  (optioneel; standaard de galerij van het bedrijf).
- `partners.facilities` (accommodatieniveau, zelfde lijst als de aanvraag
  gebruikt, zodat "voldoet aan uw wensen" berekend kan worden),
  `check_in_time`, `check_out_time`. Afstand tot de boot en het dorp wordt
  berekend uit de coördinaten (geen invoer).
- Geocoderen vanuit het partnerprofiel (bestaat al voor bouwstenen).
- `accommodation_quotes.visible_to_customer`: besluit nodig, zie hieronder.

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

1. **Curatie.** Nu staat een offerte direct in het klantportaal zodra de
   partner hem indient; "Doorsturen" in admin stuurt alleen een mail. Wil je
   dat het bureau eerst kiest welke offertes de klant ziet (vlag), of blijft
   alles direct zichtbaar?
2. **Kamertype verplicht** bij het offreren, zodat foto's en faciliteiten
   altijd meekomen? Of optioneel met vrije tekst als terugval?
3. **Content**: wie vult de profielen: partners zelf, het bureau, of Google
   Places als startpunt?
4. **Interne notities**: definitief intern (advies) of hernoemen tot
   "toelichting voor de klant"?

## Volgorde

Fixes uit de bevindingenlijst (2 t/m 5) meteen. Daarna fase 1 en fase 3
tegelijk starten: fase 1 is bouwen, fase 3 is organiseren. Fase 2 zodra de
eerste partners kamertypes met foto's hebben. Fase 4 pas bij behoefte.
