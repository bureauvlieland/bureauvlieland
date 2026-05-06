## Doel

De detailpagina van een voorbeeldprogramma (bijv. `/voorbeeldprogrammas/culinaire-ontdekking`) krijgt een meer editoriale, sfeervolle uitstraling. Beter ritme tussen secties, rijker kleurgebruik uit het bestaande design system (ocean, sand, sunset) en sterkere positionering van de waardepropositie.

## Huidige knelpunten

- Hero is relatief laag (44vh) en de meta-pills (duur/groep/prijs) staan er onderaan ingeperst.
- Beschrijving, highlights, praktische info en tijdlijn staan allemaal op vergelijkbare witte/lichtgrijze achtergronden — weinig ritme.
- "Voor wie" en "Praktische info" liggen visueel op één niveau; "voor wie" verdient meer gewicht (positionering).
- Geen duidelijke samenvattings-/feiten-strook; bezoekers moeten lezen om de essentie te vinden.
- Sand- en sunset-tokens in `index.css` worden nauwelijks gebruikt.

## Aanpak (alleen frontend / presentatie)

### 1. Hero rijker en luchtiger
- Hoogte naar `min-h-[60vh]` met meer ademruimte; gradient van `--ocean-deep` (bodem) naar transparant + subtiele vignet links.
- Titel groter (`text-5xl md:text-7xl`), display-font, met een dunne sunset-accentlijn boven de titel ("Voorbeeldprogramma · {duration} dagen").
- Hook in serif/italic, max-w-2xl, lichter gewicht.
- Meta-pills omgezet naar één horizontale "fact strip" onderaan de hero met iconen op donkere semitransparante balk (backdrop-blur), netjes uitgelijnd.

### 2. Intro / positionering-sectie ("Het verhaal")
- Direct onder de hero: tweekoloms layout op desktop:
  - Links: kleine kicker "Het verhaal" + `template.description` als rustige body-tekst.
  - Rechts: een sticky "kaart" met de essentie — duur, doelgroep, indicatieve prijs, sfeerwoorden (vibes als chips), en een primaire CTA "Gebruik dit programma". Achtergrond `bg-card` met `shadow-medium`, subtiele sand-rand.
- Hierdoor staat de propositie + CTA al boven de vouw na scroll.

### 3. Highlights als editorial grid
- Achtergrond met subtiele `--gradient-sand` (zacht zandverloop) zodat deze sectie visueel ademt.
- Highlights renderen als kaart-grid (2–3 koloms) i.p.v. losse bullets: elk item krijgt een klein checkmark-icoon in primary-cirkel + korte tekst op witte kaart met `shadow-soft`.
- Storytelling-alinea's (`copy.story`) als rustig leesblok eronder, gecentreerd, max-w-prose, serif-italic intro-cap optioneel.

### 4. Voor wie — gepromoveerd tot eigen sectie
- Aparte sectie met `bg-[hsl(var(--ocean-deep))]` of `bg-primary` en lichte tekst — donker contrastblok midden op de pagina dat de positionering ("voor welk type groep") visueel laat landen.
- Groot citaat-achtig statement (`copy.forWhom`) + de vibe-chips in licht-op-donker variant.

### 5. Praktische info opnieuw vormgeven
- Op `bg-muted/30` (huidige baseline), maar met een nette kaart (border + radius) i.p.v. losse bullets.
- Het "doordeweekse aankomst"-blok behoudt zijn eigen accentkaart, maar krijgt het sand-token als achtergrond en een sunset-accentstreep links voor warmte (i.p.v. primary blauw op blauw).

### 6. Tijdlijn-sectie
- Visueel rustiger: lichte sectiekop "Programma per dag" met dunne kicker, achtergrond `bg-background`.
- CTA-blok onderaan tijdlijn vervangen door een full-width "call-out" kaart met `--gradient-hero` achtergrond, witte tekst, primaire knop in sunset-kleur (`bg-[hsl(var(--sunset))] text-sunset-foreground`) — dit wordt het visuele ankerpunt richting conversie.

### 7. "Andere programma's"
- Sectiekop met kicker "Verder kijken" + subtitel.
- Achtergrond `bg-sand/40` (zacht) zodat afsluiting warm aanvoelt vóór de footer.

### 8. Kleurritme over de pagina (van boven naar onder)
```text
Hero            → ocean-deep / hero gradient
Verhaal+CTA     → background (wit)
Highlights      → sand gradient
Voor wie        → primary / ocean-deep (donker contrast)
Praktisch       → muted (licht)
Tijdlijn        → background
CTA-blok        → hero gradient + sunset accent
Andere prog's   → sand zacht
```
Dit geeft een editoriaal "ademend" ritme licht↔donker↔warm.

## Bestanden die wijzigen

- `src/pages/VoorbeeldprogrammaDetail.tsx` — herindeling secties, hero, intro+sticky-card, donker "voor wie"-blok, CTA-callout, related-sectie.
- `src/components/programmas/ProgramHighlights.tsx` — naar kaart-grid + sand-achtergrond, story-blok los.
- `src/components/programmas/ProgramPractical.tsx` — alleen praktisch (niet meer "voor wie"); kaart-styling, sunset-accent op weekend-tip.
- Geen wijzigingen aan data, hooks, edge functions of `programTemplateCopy.ts`.

## Buiten scope

- Geen wijzigingen aan businesslogica, routes, database of teksten in `programTemplateCopy.ts`.
- Geen aanpassingen aan `ProgramCard` of overzichtspagina.
- Geen nieuwe design tokens; we gebruiken alleen bestaande HSL-tokens uit `index.css`.
