

# Plan: Dynamische Voorbeeldprogramma's pagina

## Wat wordt gebouwd

Een nieuwe pagina `/voorbeeldprogrammas` die alle gepubliceerde programma-templates dynamisch uit de database ophaalt en presenteert met een visuele tijdlijn, foto's, verhalende beschrijvingen en een directe CTA naar de configurator. Wanneer je in de admin templates toevoegt, wijzigt of verwijdert, wordt dit automatisch doorgevoerd op de website.

## Pagina-structuur

### Hero-sectie
- Pakkende titel "Kant-en-klare Programma's" met Ken Burns-achtergrondbeeld
- Subtekst die uitnodigt om een programma te kiezen of zelf samen te stellen
- CTA-knop naar `/programma-samenstellen`

### Template-overzichtskaarten
- Dynamisch grid van alle gepubliceerde templates (via `usePublishedTemplates()`)
- Per kaart: naam, korte beschrijving, duur-badge, doelgroep-badge, indicatieve prijs, thumbnail
- Klik scrollt naar de bijbehorende tijdlijnsectie

### Tijdlijnsecties per template
- Per gepubliceerd template een sectie met verhalende introductie (uit `description`)
- Verticale tijdlijn per dag, met items uit `program_template_items` + gekoppelde `building_blocks` data
- Per item: tijdstip, naam, korte beschrijving, foto (via `getBlockImage()`), duur-badge
- Desktop: afwisselend links/rechts. Mobiel: lineair
- Onderaan elke tijdlijn: CTA-knop "Gebruik dit programma" die navigeert naar `/programma-samenstellen?template={id}`

### Afsluitende CTA
- Sectie voor bezoekers die geen passend template zien: "Stel zelf samen" link naar configurator

## Dynamisch gedrag

Alle data wordt opgehaald via de bestaande React Query hooks:
- `usePublishedTemplates()` voor het overzicht (alleen `is_published = true`)
- `useTemplateWithItems(id)` per template voor de volledige tijdlijn met bouwsteendata

Omdat React Query standaard cached en refetcht, worden admin-wijzigingen automatisch zichtbaar bij het herladen van de pagina. Geen hardcoded content -- alles komt uit de database.

## Technisch

### Nieuwe bestanden
- **`src/pages/VoorbeeldprogrammaOverzicht.tsx`** -- Nieuwe pagina met hero, overzichtskaarten en per-template tijdlijnsecties
- **`src/components/programmas/ProgramTimeline.tsx`** -- Herbruikbare tijdlijn-component die een template met items rendert als visuele verticale tijdlijn

### Aanpassingen bestaande bestanden
- **`src/App.tsx`** -- Route `/voorbeeldprogrammas` toevoegen met import van nieuwe pagina
- **`src/components/Navigation.tsx`** -- Navigatie-item "Voorbeeldprogramma's" toevoegen (onder de huidige "Bouwstenen" link of als vervanging)

### Data-flow
1. Pagina laadt --> `usePublishedTemplates()` haalt alle gepubliceerde templates op
2. Per template wordt `useTemplateWithItems(id)` aangeroepen voor de items + building block data
3. Items worden gegroepeerd op `day_index` en gesorteerd op `preferred_time` (fallback `sort_order`)
4. Per item wordt `getBlockImage(block)` gebruikt voor de afbeelding

### Bestaande hergebruikte code
- `usePublishedTemplates()` en `useTemplateWithItems()` uit `src/hooks/useProgramTemplates.ts`
- `getBlockImage()` uit `src/lib/buildingBlockUtils.ts`
- `useKenBurns()` hook voor hero-animatie
- Helmet voor SEO meta-tags

### SEO
- React Helmet met titel, beschrijving en canonical URL
- Breadcrumb-navigatie consistent met andere pagina's

