

# Disclaimers op de offerte-PDF

## Wat verandert

Drie tekstuele aanpassingen in de offerte-preview die duidelijk communiceren dat activiteitenprijzen indicatief zijn, terwijl logies al gebaseerd is op een actuele aanbieding.

### 1. Nieuw disclaimer-blok (boven de totalen)
Een informatief blok met de tekst:

> **Indicatief voorstel**
> De genoemde prijzen voor activiteiten zijn gebaseerd op onze actuele tarieven en zijn indicatief. Na uw akkoord nemen wij contact op met de betrokken partners om beschikbaarheid en definitieve prijzen te bevestigen. U kunt de voortgang hiervan volgen in uw persoonlijke klantomgeving.

Wanneer er een logies-offerte aan het voorstel is gekoppeld, wordt een extra zin toegevoegd:

> De prijzen voor logies zijn gebaseerd op een actuele aanbieding van de accommodatiepartner en zijn reeds bevestigd.

### 2. Geldigheidsblok aanscherpen
De tekst in het gele validiteitsblok wordt:

> Dit voorstel is geldig tot [datum]. Na uw akkoord ontvangt u toegang tot uw klantomgeving waar u de bevestigingen van partners kunt volgen.

### 3. Footer aanpassen
De footertekst wordt: "Prijzen voor activiteiten zijn indicatief en onder voorbehoud van beschikbaarheid."

## Technische details

**Bestand:** `src/pages/admin/AdminQuotePreview.tsx`

1. Nieuw `div`-blok invoegen net boven de Validity-sectie (rond regel 859). De tekst is conditioneel: als `accommodationQuote` niet `null` is, wordt de extra zin over logies getoond.

2. Geldigheidsblok (regels 860-869): tekst vervangen.

3. Footer (regel 879): tekst wijzigen.

