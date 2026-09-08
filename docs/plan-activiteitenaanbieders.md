# Plan: activiteitenaanbieders presenteren en koppelen met Mijnactiviteitenplanner

Status: besluiten genomen 8 september 2026 (zie onderaan); fase 1, 2 en 3 gebouwd
(8 september).

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

### Fase 1: tonen wat er al is (gebouwd 8 september)

- De onderdeelkaart op de klantpagina wordt een activiteitenkaart: grotere
  foto, naam, aanbieder met ligging ("op het strand bij paal 50, 12 min
  fietsen van het dorp", berekend uit coördinaten zoals bij logies), duur,
  groepsgrootte, korte tekst.
- Onder "Details": bouwsteentekst, en een blok **Over de aanbieder** met
  galerijstrip, tekst, highlights, website en kaartje, voor zover ingevuld
  (dezelfde presentatie als het logiesdetailvenster, zelfde componenten).
  Leeg profiel = blok weglaten, geen lege kaders.
- **Activiteit toevoegen** toonde al foto, prijs, duur en korte tekst per
  bouwsteen; niets aan veranderd.
- `get-customer-program` geeft per onderdeel `provider_profile` mee
  (galerij, tekst, highlights, website, adres, coördinaten); één extra query
  over de aanbieders van het programma. Presentatie in
  `src/lib/providerPresentation.ts`; de plek van het onderdeel gaat voor op
  die van de aanbieder (een excursie start niet altijd bij het bedrijf).

### Fase 2: content van aanbieders (gebouwd 8 september, daarna doorlopend)

- Het adminoverzicht heet nu **Partnerprofielen** (*Content →
  Partnerprofielen*, `/admin/partnerprofielen`) met twee tabbladen: logies
  en activiteiten. Partners met type "beide" staan in allebei. Zelfde
  herinneringsmailing, met een eigen tekst per tabblad en per partner de
  lijst van wat ontbreekt.
- Voor activiteitenaanbieders telt de score het profiel voor 40% en de
  bouwstenen voor 60% (`calculateOverallCompleteness` met `profileWeight`):
  de bouwsteen is wat de klant kiest. Geen gepubliceerde bouwstenen staat
  bovenaan in de lijst van wat ontbreekt. "Open als partner" opent bij
  activiteiten de bouwstenenpagina.
- Het bureau vult voor de meest gebruikte aanbieders de basis: 3 foto's,
  3 regels, highlights. Met toestemming.

### Fase 3: koppeling met Mijnactiviteitenplanner (gebouwd 8 september)

Zeven aanbieders hebben een MAP-omgeving; daar zit de actuele informatie.
Drie stappen, elk apart uit te rollen:

1. **Bouwsteen volgt MAP.** Cronfunctie `map-sync-blocks` (elke nacht
   04:30 UTC, job `map-sync-blocks-nightly`) neemt voor elke bouwsteen met
   `map_activity_type_id` de beschrijving, duur en foto over uit het
   MAP-activiteitstype van de partner; de naam blijft van het bureau. Prijs
   per persoon alleen als `map_sync_price` aan staat (schakelaar in de
   admin-bouwsteen, onder de MAP-koppeling); dan geldt de prijs van het
   eerstvolgende geplande moment. `map_synced_at`/`map_sync_error` tonen de
   stand; knop "Nu bijwerken uit MAP" voor één bouwsteen. Koppelen gebeurt
   in dezelfde sheet (keuzelijst MAP-activiteit); de naamvergelijking blijft
   als terugval voor direct boeken, maar synchroniseert niet.
   Pure logica in `_shared/map-sync.ts` (Deno-test).
   In het partnerportaal staat bovenaan *Mijn aanbod* het volledige
   MAP-aanbod van de partner (`MapOfferOverview`): per activiteitstype of
   het al is aangeboden bij Bureau Vlieland en met welke status, en een knop
   "Aanbieden" die een bouwsteen als voorstel aanmaakt met de koppeling
   erin. Hetzelfde overzicht staat alleen-lezen bij de partner in admin
   (Partnerdetail, onder de MAP-instellingen) met een link naar de
   bouwsteen.
2. **Beschikbaarheid tonen.** Op de programmakaart van de klant staat bij
   een gekoppelde bouwsteen de agenda van de aanbieder voor die dag:
   "Beschikbaar op deze dag: 10.00 (14 plaatsen) · 14.00 (6 plaatsen)",
   rekening houdend met de groepsgrootte; vol = melding dat wij een extra
   moment vragen; geen momenten gepland = geen regel. Live via `map-proxy`
   (`src/lib/mapAvailability.ts`, `MapAvailabilityLine`). Geen blokkade.
3. ~~Aanbiedersprofiel uit MAP~~: vervallen (besluit 4); het profiel blijft
   bij Bureau Vlieland.

### Fase 4: later, bij behoefte

Direct boeken vanuit de klantpagina voor MAP-activiteiten (nu alleen via
programma-acceptatie door het bureau), en een openbare aanbiederspagina op
bureauvlieland.nl per partner (nu alleen de lijst op /partners).

## Besluiten (8 september 2026)

1. **Activiteit voorop.** De bouwsteen blijft de kaart; de aanbieder is een
   blok onder "Details".
2. **MAP als bron voor bouwstenen:** foto, tekst, duur en maximum
   automatisch overnemen; prijs alleen per bouwsteen aan te zetten.
3. **Beschikbaarheid tonen** aan de klant als informatie, nooit als
   blokkade.
4. **Aanbiedersprofiel blijft bij Bureau Vlieland.** Geen profiel-eindpunt
   in MAP; fase 3.3 vervalt. MAP-aanbieders vullen hun profiel hier, net als
   de anderen.
5. **Volgorde:** fase 1 en 2 eerst, daarna MAP (fase 3.1 en 3.2).
