## Doel
`/voorbeeldprogrammas` schaalbaar en sneller maken nu er 8 templates op één pagina staan (en er nog meer bijkomen). De pagina is nu eindeloos lang: alle tijdlijnen worden direct geladen via `useTemplateWithItems` (1 query per template), wat traag oplaadt en visueel overweldigend is.

## Verbeteringen

### 1. Architectuur: detailpagina per programma
- Nieuwe route `/voorbeeldprogrammas/:slug` met `VoorbeeldprogrammaDetail.tsx` die één template + tijdlijn rendert.
- Overzichtspagina toont alleen kaarten + linkt door (geen inline timelines meer).
- Resultaat: 1 query op overzicht (`usePublishedTemplates`) i.p.v. 1 + N. Snellere LCP, betere SEO (eigen `<title>`/canonical/JSON-LD per programma), deelbare URL's.
- Backwards compat: oude anchor-links `#template-{id}` redirecten via `useEffect` naar de detailpagina.

### 2. Overzicht: filteren & groeperen
- Filterchips bovenaan: **duur** (1 dag / 2 dagen / 3 dagen / meerdaags) en **thema** (Avontuur, Wellness, Culinair, Compleet, Chill) — afgeleid uit naam/omschrijving of een nieuwe `theme` kolom (out of scope: alleen client-side categorisatie nu).
- Sorteer-toggle: aanbevolen (sort_order) vs. korte programma's eerst.
- Lege-staat per filter.

### 3. Kaart-UX
- Subtiel "thema"-label rechtsboven (kleur per thema), naast bestaande duur-badge.
- "Vanaf €X p.p."-badge alleen tonen als gevuld (nu al, prima).
- Skeleton placeholders i.p.v. spinner tijdens loading.
- Hele card als `<Link>` (a11y + middle-click) i.p.v. div met onClick.

### 4. SEO & metadata
- `ItemList` JSON-LD op overzicht met alle programma's.
- `TouristTrip`/`Product` JSON-LD op detailpagina met `name`, `description`, `duration`, `offers.price`.
- Per detailpagina eigen `<title>` + canonical.
- Overzicht-`<title>` ingekort, meta-description scherper ("8 kant-en-klare programma's …").

### 5. Hero & CTA's
- Hero iets compacter (`h-[50vh]`, `min-h-[360px]`) — geeft sneller zicht op de kaarten.
- Twee duidelijke hero-CTA's: "Bekijk programma's" (scrollt naar grid) + secundair "Stel zelf samen".
- Bottom-CTA mag blijven; tekst iets aanscherpen.

### 6. Bestanden
- Aanpassen: `src/pages/VoorbeeldprogrammaOverzicht.tsx` (timelines weg, filters + cards-as-link)
- Nieuw: `src/pages/VoorbeeldprogrammaDetail.tsx` (timeline + CTA + SEO)
- Aanpassen: `src/App.tsx` (nieuwe route)
- Aanpassen: `src/pages/Sitemap.tsx` (detail-URLs toevoegen)
- Optioneel: `src/components/programmas/ProgramCard.tsx` extraheren uit overzicht voor herbruik.

## Niet in scope (voor nu)
- Database-velden uitbreiden (`theme`, slug-veld). We gebruiken `id` als slug en client-side categorisatie. Kunnen we toevoegen wanneer het inhoudelijke programma erbij komt.
- Wijzigingen aan `ProgramTimeline` zelf.
- Boekingsflow / configurator.
