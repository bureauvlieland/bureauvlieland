## Doel

Voorbeeldprogramma's wervender en inhoudelijk completer maken, plus toevoeging van een nieuw exclusief eendaags programma met privé-overtocht via de Regina Andrea (Waddenrecreatiebedrijf Neptunus).

## 1. Sfeervolle storytelling per programma

Per gepubliceerd template uitgebreidere, wervende content opbouwen. We voegen géén nieuwe DB-kolommen toe — we benutten de bestaande velden (`description`, `short_description`, `target_group`) maximaal en vullen aanvullende narratieve secties via een nieuwe statische copy-laag in de frontend.

**Nieuwe frontend-content per template** (in `src/lib/programTemplateCopy.ts`):
- `hook` — pakkende openingszin (1 regel)
- `story` — sfeerbeschrijving (2–3 alinea's, formele 'u'-toon)
- `highlights` — 4–6 bullet-highlights ("Wat maakt dit programma bijzonder")
- `forWhom` — concreet doelgroepprofiel + groepsgrootte-advies
- `vibe` — 3 sfeerwoorden / tags voor visuele chips
- `practical` — praktische info (vertrektijden, fysieke inspanning, weersafhankelijkheid)

Deze copy wordt gerenderd op `VoorbeeldprogrammaDetail.tsx` in nieuwe secties tussen hero en timeline:
- Hero: `hook` als ondertitel
- Sectie "Wat maakt dit bijzonder" (highlights, icon-grid)
- Sectie "Voor wie" (forWhom)
- Sectie "Sfeer" (vibe-chips)
- Sectie "Praktische info" (praktisch + weekendregel waar van toepassing)

Op `ProgramCard` (overzicht): `hook` als subtitel boven `short_description` voor sterkere wervende eerste indruk.

**Inhoudelijke verrijking bestaande templates** — copy verzorgt het wervende verhaal; we passen géén timeline-items aan in deze ronde. Verrijking van blokken zelf is een latere stap.

## 2. Weekendregel voor 2-daagse programma's

Op detailpagina's van templates met `duration_days === 2` voegen we onder "Praktische info" een blok toe:

> **Doordeweekse aankomst aanbevolen** — Voor tweedaagse programma's adviseren wij een doordeweekse aankomst (ma–do). In het weekend hanteren onze logiespartners doorgaans een minimum verblijf van twee nachten, waardoor een tweedaags arrangement op vrijdag of zaterdag vaak niet mogelijk is. Onze reisspecialist denkt graag met u mee over alternatieve data.

Geen badge op de overzichtskaart (per keuze gebruiker).

## 3. Nieuw programma: "Exclusieve Eilanddag — Privévaart Regina Andrea"

### 3a. Nieuwe partner-bouwstenen (building_blocks, status `published`, provider_id `waddenrecreatiebedrijf-neptunus`)

| id | name | category | price_type | sort | rol |
|----|------|----------|------------|------|-----|
| `regina-andrea-prive-heen` | Privévaart Regina Andrea — Harlingen → Vlieland | vervoer | per_person | pinned dag 1 start | vervangt Doeksen heen |
| `regina-andrea-prive-terug` | Privévaart Regina Andrea — Vlieland → Harlingen (incl. warm buffet) | vervoer | per_person | pinned dag 1 eind | vervangt Doeksen terug, incl. diner aan boord |
| `regina-andrea-koffie-ontvangst` | Ontvangst met koffie & lekkers aan boord | catering | per_person | aanvullend (optioneel onderdeel van overtocht-heen) |

Prijzen blijven "op aanvraag" (`price_display_override`) — Neptunus geeft offerte op basis van groep. Zo respecteren we het partner-quote-traject. Inclusief havengeld + toeristenbelasting en fiets op Vlieland zit in de heen-overtocht (vermeld in description).

### 3b. Nieuw template `prive-eilanddag-regina-andrea`

- `duration_days`: 1
- `name`: "Exclusieve Eilanddag — Privévaart Regina Andrea"
- `short_description`: "Uw eigen schip, eigen tempo: privévaart, fiets, strand en warm buffet aan boord."
- `target_group`: "Bedrijfsuitjes, familiefeesten en groepen die exclusiviteit zoeken"
- `is_published`: true

**Timeline (1 dag):**
1. 09:00 — Privévaart Regina Andrea heen (incl. koffie & lekkers, fiets aan boord)
2. 11:30 — Fietstocht met begeleiding
3. 12:30 — Lunch op locatie
4. 14:30 — Strandspektakel _of_ vrije tijd (we kiezen één: vrije tijd, want privévaart-doelgroep wil flexibiliteit)
5. 16:30 — Privévaart Regina Andrea terug — warm buffet aan boord

Storytelling-copy beschrijft het USP: eigen schip, flexibele vertrektijden, alles inclusief, ideaal vanaf ~30 personen.

## 4. Optimalisaties overzichtspagina

- `ProgramCard` toont `hook` (uit copy-laag) als prominente ondertitel.
- "Nieuw"-badge op `prive-eilanddag-regina-andrea` (op basis van een `featured` flag in de copy-laag, niet in DB — dichter bij UI).

## Bestanden

**Nieuw:**
- `src/lib/programTemplateCopy.ts` — copy-map keyed op template-id
- `src/components/programmas/ProgramHighlights.tsx`
- `src/components/programmas/ProgramForWhom.tsx`
- `src/components/programmas/ProgramPractical.tsx` (incl. conditionele 2-daagse weekendregel)

**Wijzigen:**
- `src/pages/VoorbeeldprogrammaDetail.tsx` — nieuwe secties + hook in hero
- `src/components/programmas/ProgramCard.tsx` — hook als subtitel + featured-badge

**Database (insert):**
- 3 nieuwe rijen `building_blocks` (Regina Andrea heen / terug / koffie)
- 1 nieuwe rij `program_templates`
- 5 nieuwe rijen `program_template_items`

## Niet in scope (latere ronde)

- Inhoudelijk uitbreiden van bestaande timelines met extra blokken.
- Nieuwe afbeeldingen genereren voor het Regina Andrea-programma (we starten met een passende bestaande haven/boot-afbeelding; vervangen kan in een vervolg).
