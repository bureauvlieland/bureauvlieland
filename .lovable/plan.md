## Doel

`src/components/home/CateringHighlight.tsx` herschrijven naar de gekozen "Editorial coastal spread"-richting: een 7/5 asymmetrisch grid met fotocompositie links en grote serif-typografie rechts, plus een drijvende ocean-deep "Signature · Beach Grill experience"-kaart als overlay.

## Wijzigingen

**Alleen `src/components/home/CateringHighlight.tsx`.** Geen andere bestanden, geen design-tokens, geen routes.

### Layout (desktop, lg)

```text
┌─────────────────────────────────────┬──────────────────────┐
│  ┌───────────────┐  ┌──────┐         │  H2 (groot serif)    │
│  │               │  │ amuse│         │  High-end koken      │
│  │   chef        │  │ sq.  │         │  op locatie.         │
│  │   plating     │  └──────┘         │  Op Vlieland uniek.  │
│  │   (4/5)       │  ┌──────┐         │                      │
│  │               │  │ table│         │  P (chefs, onderlijnd│
│  └───────────────┘  │ 3/4  │         │   sunset accent)     │
│                     └──────┘         │  P (sub)             │
│           ┌──── Signature card ───┐  │                      │
│           │ ocean-deep overlay    │  │  [Bekijk catering]   │
│           │ Beach Grill           │  │  [Catering aanvragen]│
│           └───────────────────────┘  │                      │
└─────────────────────────────────────┴──────────────────────┘
```

Mobile: stack — fotocompositie boven, tekst onder. Signature-kaart blijft static binnen het beeldblok.

### Kleuren & typografie (mappen op bestaand systeem)

- Achtergrond: `bg-sand/40` (huidige cream blijft).
- Tekstkleur primair: `text-primary` (ocean-deep).
- Accent (Signature label, underline op chefnamen, hover-fill primaire knop): `sunset` token.
- Headline: bestaande `font-display`, `font-light`, `italic` voor "Op Vlieland uniek." — geen nieuwe Google Font; we hergebruiken de site-display zodat het consistent is met Hero en andere h2's.
- Body: bestaande sans (`font-sans`).

### Beelden (uit `src/assets/lexence/`)

- Groot hero-blok (4/5): `lexence-chef-plating.jpg`.
- Klein blok 1 (1/1): `lexence-amuses-row.jpg`.
- Klein blok 2 (3/4): `lexence-tablesetting.jpg`.
- Signature-overlay heeft geen foto; tekst op `bg-primary` (ocean-deep) met sunset accent en korte regel over Beach Grill.

### Inhoud (verbatim)

- Eyebrow vervalt (signature staat al in de overlay-kaart).
- H2: `High-end koken op locatie.` + lijnbreek + italic `Op Vlieland uniek.`
- Lead-paragraaf: "Onze eigen chefs **Robert Buurma** en **Roland Bakker** brengen de haute cuisine naar uw verblijf." — chefnamen krijgen sunset underline.
- Sub-paragraaf: "Voor zakelijke groepen vanaf 8 personen. Eén keuken, één aanspreekpunt, één factuur. Vrijblijvend voorstel op maat binnen 2 werkdagen." (we houden "2 werkdagen" zoals elders op de site — niet "48 uur" uit het prototype).
- Signature card: label "Signature", titel "Beach Grill experience", korte regel "Een exclusieve culinaire ervaring op het strand van Vlieland, bereid op open vuur door onze eigen chefs."
- CTA's ongewijzigd: `Bekijk catering` → `/catering`, `Catering aanvragen` → `/catering-aanvragen`.

### Interactie

- Primaire knop: ocean-deep met sunset slide-up fill op hover (zoals prototype).
- Pijl-icoon schuift bij hover 1 px naar rechts.
- Foto's: subtiele `scale-[1.01]` op hover, 700ms.
- Geen scroll-pinned animaties, geen Motion-componenten — puur CSS transitions, in lijn met de rest van de homepage.

### Verticale ritmiek

- Sectiepadding `py-20 md:py-28` blijft, zodat de sectie tussen `UpcomingActivitiesFeed` en `ActivitiesShowcase` ademt zoals nu.

## Niet in scope

- Geen nieuwe afbeeldingen genereren of uploaden.
- Geen wijzigingen aan `Index.tsx`, navigatie, of `/catering` pagina.
- Geen nieuwe lettertype-imports.
- Geen aanpassing van Tailwind config of `index.css`.
