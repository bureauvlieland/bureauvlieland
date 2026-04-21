

## Plan: terminologie, frontend afbeeldingen, nieuwe pagina's (bouwstenen + partners)

### A. Hernoem template "Katalys" → "Eilandbeleving Compleet"
- Klantnaam mag niet als templatenaam terugkomen.
- `UPDATE program_templates SET name = 'Eilandbeleving Compleet', id = ...` — id kunnen we beter laten staan om template-links niet te breken. Alleen `name` en `short_description` aanpassen.

### B. Afbeeldingen toekennen aan templates zonder afbeelding
Zeven templates missen een `image_url`. Per template een passende bestaande storage-afbeelding koppelen:

| Template | Voorgestelde afbeelding (storage) |
|---|---|
| `katalys` (Eilandbeleving Compleet) | `1770301299090-DSC_3797_0012_DSC_3786.jpg` (groep) |
| `relax-and-enjoy-vlieland` | `1770974443694-terras.2_1.jpg` (terras) |
| `chill-eilanddag` | `1770455091370-2016-02-25_17.28.50.jpg` (strand chill) |
| `actieve-eilanddag-voc` | `voc-beach-golf.jpg` |
| `culinaire-ontdekking` | `1770455958249-Oliva_4.jpeg` (Oliva) |
| `wellness-natuur` | `strandyoga-ontspanning.jpg` |
| `wellness-natuur-3d` | `strandyoga-ontspanning.jpg` (of nieuw te uploaden) |

Tegelijk de building blocks zonder image koppelen:
- `luxe-lunch` → `luncharrangement.webp` (gebruikt al voor lunch-strand — nog steeds prima)
- `vliegeren` → bestaand kite-asset uit lokale assets (`/src/assets/kite-flying.jpg`) of nieuwe upload
- `fiets-huur` → bestaande lokale `cycling-team.jpg`
- `wellness-sauna-dagentree` + `wellness-vlieland-experience` → placeholder-afbeelding + flag voor admin om later eigen foto's te uploaden
- `diner-zeezicht` → `1771141578047-diner_vlieland.jpg`
- `grillmaster-zuiver-traiteur` → `strand-bbq.jpg` (sfeerbeeld outdoor BBQ; ondanks naam goed bruikbaar)

### C. Terminologie & navigatie — voorstel

**Probleemanalyse**: "Start uw programma" is vaag en onthult niet dat het resulteert in een offerte-aanvraag. De configurator levert geen directe boeking — het is een aanvraag waar Bureau Vlieland mee aan de slag gaat.

**Voorgestelde primaire CTA-tekst** (in Nav, hero, banners):

| Locatie | Huidig | Voorgesteld |
|---|---|---|
| Nav-knop (header) | "Start uw programma" | **"Vraag uw offerte aan"** |
| Hero CTA homepage | "Start uw programma" | **"Stel programma samen & vraag offerte aan"** |
| EntryChoice "Stel zelf samen" | "Start je programma" | **"Stel uw programma samen"** |
| Bottom-CTA "Zelf samenstellen" | idem | **"Maak een offerte op maat"** |
| Page-titel `/programma-samenstellen` | "Programma Samenstellen" | **"Offerte Samenstellen"** of **"Stel uw offerte samen"** |

**Tone-check**: "u" blijft (formal tone memory). "Offerte" is zakelijk, eerlijk en zet de juiste verwachting (geen directe boeking).

**Nav-structuur — voorstel** (huidige nav heeft: Ons aanbod / Logies / Inspiratie / Over ons + CTA):

```text
[Logo]  Ons aanbod ▾   Logies   Inspiratie ▾   Partners   Over ons ▾   📞   [ Vraag offerte aan ]
                                  ├─ Voorbeeldprogramma's
                                  ├─ Bouwstenen (NIEUW)
                                  └─ Aangesloten partners (NIEUW, optioneel onder Inspiratie of als eigen item)
```

Optie A (mijn voorkeur): "Inspiratie" wordt dropdown met 3 items (Voorbeeldprogramma's / Bouwstenen / Partners).
Optie B: "Partners" als losse top-level link naast Inspiratie.

### D. Nieuwe pagina `/bouwstenen` — overzicht van alle bouwstenen (publiek)

**Mijn advies: ja, doe dit.** Redenen:
- SEO: elke bouwsteen is een potentiële landingspagina (Vlieland + activiteit-naam).
- Transparantie: klanten zien meteen wat mogelijk is voordat ze de configurator instappen.
- Cross-linking: vanuit een bouwsteen → "Voeg toe aan offerte" → opent configurator met blok voorgeselecteerd (querystring).
- Vermijdt frustratie: nu zien klanten pas in de configurator wat er bestaat.

**Inhoud van de pagina**:
- Filter op categorie (catering / vervoer / outdoor / excursies / locaties / overig).
- Filter op partner.
- Card per bouwsteen: foto, naam, korte omschrijving, vanaf-prijs, partnerlogo/-naam, "Voeg toe aan offerte".
- Hergebruik bestaande `useBuildingBlocks` hook + `getBlockImage` util.
- Route: `/bouwstenen`. Bestaat al deels (`/bouwstenen` → `Voorbeeldprogrammas` page). **Refactor**: hernoem oude file of laat hem op een andere route en bouw nieuwe pagina.

### E. Nieuwe pagina `/partners` — aangesloten partners

**Mijn advies: ja, met focus op het verhaal van het eiland-ecosysteem.** Redenen:
- Bouwt vertrouwen: laat zien wie er achter de programma's zit (Vliehors Expres, Zeehondentochten, Brouwerij Fortuna, etc.).
- Marketingvoordeel voor partners zelf → goede ruilhandel (zij linken terug).
- MAP-integratie ontsluit losse boekingen: partners met `map_tenant_slug` krijgen een "Direct boeken bij {partner}" knop die naar de MAP-tenantpagina linkt (bv. `https://boeking.mijnactiviteitenplanner.nl/activiteiten-vlieland/{slug}`).

**Inhoud**:
- Hero "Onze eilandpartners".
- Grid van partner-cards: `image_url`, naam, type (activiteiten/logies), `about_text` snippet, gekoppelde bouwstenen (count), website-link.
- MAP-badge als `map_tenant_slug` ingevuld is → CTA "Bekijk losse boekingen via MAP".
- Detail-route `/partners/:id` (optioneel in v2) met volledige `about_text`, `gallery_images`, locatie op kaart en alle bouwstenen van die partner.

### F. SEO / canoncial / metadata
- Nieuwe routes krijgen `Helmet` met titel, description, canonical.
- Bestaande "Voorbeeldprogramma's" page-tekst aanpassen: "Laat u inspireren" (formal "u").
- Sitemap.xml uitbreiden met `/bouwstenen` en `/partners` (indien aanwezig).

### G. Implementatie-volgorde
1. **Database**: hernoem template "Katalys" + image-koppelingen (templates + blocks zonder image) — via SQL migration.
2. **Terminologie**: tekstwijzigingen in `Navigation.tsx`, `MobileNav.tsx`, hero-CTA's op `Index.tsx`, `ProgrammaSamenstellen.tsx`, `EntryChoice.tsx`, `VoorbeeldprogrammaOverzicht.tsx`. Geen route-wijzigingen (URL `/programma-samenstellen` blijft voor backward compat; voeg `/offerte-samenstellen` als alias toe).
3. **Nieuwe pagina `/bouwstenen`**: nieuwe page-component + route in `App.tsx` + filter-UI; conflict met huidige `/bouwstenen` route oplossen (huidige page hernoemen naar `/diensten` of mergen).
4. **Nieuwe pagina `/partners`**: nieuwe page-component + route + dropdown in nav.
5. **Inspiratie-dropdown**: `Navigation.tsx` "Inspiratie" omzetten naar dropdown met 3 items.

### H. Niet in scope
- Nieuwe foto's uploaden (gebruik bestaande storage; admin kan later vervangen).
- Detailpagina's per bouwsteen of per partner (kan in vervolgstap).
- Echte MAP-API koppeling op de publieke partnerpagina (alleen statische deeplink op basis van `map_tenant_slug`).
- Ferry/bike automatische uitsluiting in `/bouwstenen` overzicht — wel filter "exclude managed services" toggle.

### Vragen ter bevestiging

1. **Templatenaam Katalys**: akkoord met "Eilandbeleving Compleet"? Of liever iets anders (bv. "Vlieland Volledig", "Drie Dagen Vlieland")?
2. **Inspiratie-dropdown vs. Partners als top-level**: Optie A (dropdown met 3) of Optie B (Partners los)?
3. **Bouwstenen-pagina-naam**: "Bouwstenen" of liever klantvriendelijker "Activiteiten & Diensten"?
4. **Conflict route `/bouwstenen`**: huidige `/bouwstenen` (= Voorbeeldprogrammas page) verplaatsen of vervangen?

