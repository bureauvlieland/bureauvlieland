# Plan: activiteitenaanbieders presenteren en koppelen met Mijnactiviteitenplanner

Status: voorstel, 8 september 2026. Nog niets gebouwd; eerst de besluiten
onderaan.

## Waarom

Bij logies kiest de klant nu met foto's, ligging, kamers en faciliteiten
(`docs/plan-logieskeuze.md`). Bij activiteiten ziet hij op de klantpagina per
programmaonderdeel een kleine thumbnail, de naam, de aanbieder en twee regels
tekst; onder "Details" de volledige bouwsteentekst. Wie de aanbieder is, waar
het is, hoe het eruitziet en of het op zijn datum kan, staat er niet. En de
gegevens die de aanbieder in Mijnactiviteitenplanner (MAP) bijhoudt, worden
hier opnieuw ingevoerd.

## Wat er nu is (gemeten op 8 september)

- **33 actieve activiteitenaanbieders.** Twee hebben een galerij en tekst,
  geen enkele heeft highlights. Alle 33 hebben coördinaten. Zeven hebben een
  MAP-omgeving (`map_tenant_slug`).
- **48 gepubliceerde bouwstenen.** Alle 48 hebben een foto, 31 een
  beschrijving van ≥ 150 tekens, 38 coördinaten. Negen zijn van het bureau
  zelf. De bouwsteen is dus rijker dan het aanbiedersprofiel; het is ook de
  eenheid die de klant kiest.
- **185 programmaonderdelen in de laatste 90 dagen**, verdeeld over 43
  bouwstenen. 57 onderdelen hebben geen foto: dat zijn maatwerkonderdelen
  zonder bouwsteen.
- **MAP-koppeling die al bestaat:**
  - `map-proxy` leest per omgeving de activiteitstypes (naam, beschrijving,
    duur, foto, online boekbaar) en de geplande activiteiten (datum, prijs,
    plaatsen, resterende plekken).
  - In het partnerportaal kan een partner met een MAP-omgeving een
    activiteitstype "overnemen" als bouwsteen (naam, tekst, duur, prijs,
    maximum, foto). Dit is nul keer gebruikt: geen enkele bouwsteen heeft
    `map_activity_type_id`. De koppeling valt terug op naamvergelijking
    (`src/lib/directBookable.ts`).
  - `map-book` en `map-create-booking` boeken en betalen een activiteit
    rechtstreeks in de MAP-omgeving van de aanbieder; de retour-URL is per
    aanbieder instelbaar.
  - De programmakaart (`ProgramMap`) toont onderdelen met coördinaten.
- **Wat er niet is:** de klant ziet niets van het aanbiedersprofiel;
  beschikbaarheid uit MAP wordt niet getoond bij het kiezen of toevoegen; MAP
  heeft geen eindpunt voor een aanbiedersprofiel (logo, tekst, foto's,
  adres), alleen voor activiteitstypes en activiteiten; wijzigingen in MAP
  (prijs, tekst, foto) komen niet automatisch in de bouwsteen terecht.

## Voorstel in fases

### Fase 1: tonen wat er al is (geen databasewijziging, ~1,5 dag)

- De onderdeelkaart op de klantpagina wordt een activiteitenkaart: grotere
  foto, naam, aanbieder met ligging ("op het strand bij paal 50, 12 min
  fietsen van het dorp", berekend uit coördinaten zoals bij logies), duur,
  groepsgrootte, korte tekst.
- Onder "Details": bouwsteentekst, en een blok **Over de aanbieder** met
  galerijstrip, tekst, highlights, website en kaartje, voor zover ingevuld
  (dezelfde presentatie als het logiesdetailvenster, zelfde componenten).
  Leeg profiel = blok weglaten, geen lege kaders.
- Bij **Activiteit toevoegen** (klant voegt zelf iets toe): foto en korte
  tekst per bouwsteen in de keuzelijst; nu alleen naam en categorie.
- `get-customer-program` geeft per onderdeel de aanbiedersgegevens mee
  (galerij, tekst, highlights, website, coördinaten); dat is één extra join.

### Fase 2: content van aanbieders (~1 dag, daarna doorlopend)

- De volledigheidsscore geldt al voor alle partners (profiel 60%, bouwstenen
  40%). Het adminoverzicht *Logiesprofielen* wordt **Partnerprofielen** met
  twee tabbladen (logies, activiteiten), zelfde herinneringsmailing met per
  partner wat ontbreekt.
- Voor activiteitenaanbieders telt de score de bouwstenen zwaarder: die zijn
  wat de klant kiest. Een aanbieder met vier complete bouwstenen en een leeg
  profiel scoort dan redelijk; het profiel is de kers op de taart.
- Het bureau vult voor de meest gebruikte aanbieders de basis: 3 foto's,
  3 regels, highlights. Met toestemming.

### Fase 3: koppeling met Mijnactiviteitenplanner (~3 dagen, in delen)

Zeven aanbieders hebben een MAP-omgeving; daar zit de actuele informatie.
Drie stappen, elk apart uit te rollen:

1. **Bouwsteen volgt MAP.** Een bouwsteen met `map_activity_type_id` neemt
   elke nacht foto, beschrijving, duur en maximum over uit het MAP-
   activiteitstype (nieuwe cronfunctie `map-sync-blocks`). Prijs alleen als
   het bureau dat per bouwsteen aanzet: de bureauprijs kan afwijken
   (commissie, groepstarief). In admin en partnerportaal een knop "Koppel aan
   MAP-activiteit" om de 0 gekoppelde bouwstenen alsnog te koppelen; de
   naamvergelijking blijft als terugval.
2. **Beschikbaarheid tonen.** Bij het toevoegen van een activiteit en op de
   onderdeelkaart: "op 12 oktober nog 14 plaatsen om 10.00 en 14.00" uit
   `map-proxy activities` voor de programmadatum. Geen plaatsen = melding,
   geen blokkade (het bureau kan altijd bellen).
3. **Aanbiedersprofiel uit MAP.** MAP heeft geen profiel-eindpunt. Omdat
   MAP een eigen product is, kan dat erbij: `GET /api/v1/tenant/profile`
   met logo, tekst, foto's, adres, website, openingstijden. Bureau Vlieland
   leest het via `map-proxy` en gebruikt het als terugval als het eigen
   profiel leeg is (bronvermelding "via Mijnactiviteitenplanner"). Dat
   scheelt de zeven MAP-aanbieders dubbel invoeren, en het is een verkoop-
   argument voor MAP bij de andere 26. Dit is werk aan de MAP-kant; hier
   alleen het lezen.

### Fase 4: later, bij behoefte

Direct boeken vanuit de klantpagina voor MAP-activiteiten (nu alleen via
programma-acceptatie door het bureau), en een openbare aanbiederspagina op
bureauvlieland.nl per partner (nu alleen de lijst op /partners).

## Besluiten die ik van jou nodig heb

1. **Aanbieder of activiteit voorop?** Voorstel: de activiteit (bouwsteen)
   blijft de kaart; de aanbieder is een blok onder "Details". De klant kiest
   een wadloopexcursie, niet een bedrijf.
2. **MAP als bron voor bouwstenen:** foto, tekst, duur en maximum
   automatisch overnemen; prijs alleen per bouwsteen aan te zetten. Akkoord?
3. **Beschikbaarheid tonen** aan de klant (fase 3.2): ja, als informatie,
   nooit als blokkade?
4. **Profiel-eindpunt in MAP bouwen** (fase 3.3): wil je dat aan de MAP-kant
   laten maken? Dan schrijf ik de specificatie van het eindpunt uit
   (velden, formaat, authenticatie met de bestaande API-sleutel).
5. **Volgorde:** fase 1 en 2 eerst (zichtbaar resultaat voor alle 33
   aanbieders), daarna fase 3 stap voor stap. Of MAP eerst, omdat daar de
   beste content zit?
