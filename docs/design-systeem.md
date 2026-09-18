# Ontwerpsysteem: de levende referentie

Status: fase 1 (fundament) gebouwd op 18 september 2026. Dit document is de
regel; `docs/plan-design-systeem.md` is het onderzoek en het plan erachter.
Alle componenten staan naast elkaar op `/ontwerp` (alleen op previews en
lokaal, niet in productie).

## Vijf principes

1. **Het eiland als bestemming, redactioneel.** Fraunces licht (300) en groot
   voor koppen op marketingpagina's, cursief als accent, ruimte, foto's die
   het werk doen. In de funnel dezelfde familie, maar rustiger (500, kleiner).
2. **Eén pad, één actie.** Eén primaire knop per scherm, altijd in de
   actiekleur. Nooit twee even zware knoppen naast elkaar.
3. **Lokaal en persoonlijk, met echte feiten.** Foto's, mensen en
   eilandfeiten in plaats van iconen in cirkels en generieke USP's.
4. **Zelfbediening met vertrouwen.** Prijs, beschikbaarheid en status overal
   in dezelfde vorm en kleur; "vrijblijvend" en de responstijd
   (`src/content/promises.ts`) op één vaste plek naast de knop.
5. **Rust.** Decoratie alleen met functie. Beweging alleen als het iets
   betekent, en nooit voor wie `prefers-reduced-motion` aan heeft.

## Tokens (`src/index.css`, `tailwind.config.ts`)

| Token | Klasse | Gebruik |
|---|---|---|
| `--primary` (oceaanblauw) | `bg-primary`, `text-primary` | Merk: koppen, links, iconen, blauwe banden |
| `--ocean-deep` | `bg-ocean-deep` | Donkere secties |
| `--action` | `bg-action`, `text-action-foreground`, `hover:bg-action-hover` | Dé primaire knop. Publiek zonsondergang-oranje, in admin en partnerportaal blauw (`[data-surface="portal"]`, gezet door `SurfaceTheme`) |
| `--sunset` | `text-sunset` | Alleen de cursieve regel in de hero-kop en de "Meest gekozen"-markering. Niet voor knoppen, niet voor eyebrows |
| `--sand` | `bg-sand`, `text-sand` | Warme tussensecties, eyebrow en intro op donker |
| `--accent-soft` | `bg-accent-soft` | Secundaire knop, zachte vlakken |
| `--muted` | `bg-muted`, `text-muted-foreground` | Lichte vlakken, hover, bijschriften |
| `--info` / `--success` / `--warning` / `--destructive` | `bg-*`, `bg-*-soft`, `text-*-ink` | Status: uitleg / goed / aandacht / geblokkeerd. Zacht vlak plus inkt voor pills en meldingen, vol vlak voor iconen en puntjes |
| `--radius` = 0.5rem | `rounded-sm` 4px, `rounded-lg` 8px, `rounded-full` | Knoppen, velden en chips 4px; kaarten en overlays 8px; rond alleen voor avatars, puntjes en tags. `rounded-xl/2xl/3xl` zijn ook 8px (overgang) |
| `--shadow-soft/medium/dramatic` | `shadow-soft`, `shadow-medium`, `shadow-dramatic` | Kaart, zwevend element, hero-foto. `shadow-sm/md/lg/xl/2xl` wijzen naar dezelfde drie (overgang) |
| `--duration-fast/base/slow` | `duration-fast`, `duration-base`, `duration-slow` | 150ms hover, 300ms staatwissel, 700ms entree |
| typeschaal | `text-display-xl`, `text-display-lg`, `text-display-md`, `text-eyebrow` | Hero-kop, sectiekop, kaarttitel, eyebrow |

Verboden buiten `src/components/ui` en `src/components/system`: losse
paletkleuren (`bg-amber-50`, `text-green-600`, …), `text-white`/`bg-white`
(gebruik `primary-foreground`), `hsl(var(--…))` met de hand, eigen
eyebrow-stijlen, kleur- of hoogte-overrides op `<Button>`. Het script
`scripts/check-design-debt.ts` telt deze en CI bewaakt het plafond
`DESIGN_DEBT_MAX` in `.github/quality-baselines.env`: het getal mag alleen
omlaag. `bunx tsx scripts/check-design-debt.ts --list` toont elke vindplaats.

## Componenten (`src/components/system`, `src/components/ui`)

| Component | Waarvoor | Niet meer gebruiken |
|---|---|---|
| `Button` (`ui/button.tsx`) | `default` = primaire actie; `secondary` licht; `outline`/`ghost`/`link` ondergeschikt; `inverse`/`inverseOutline` op donker; `brand` (merkblauw) alleen voor zwevende hulpknoppen zoals de chat; `destructive`. Sizes `sm` 36, `default` 40, `lg` 48, `xl` 56px | `className` met `bg-*`, `h-*`, `rounded-*`, `text-lg`; `heroPrimary`/`heroOutline` (oude namen, werken nog) |
| `Container` | Breedte: `prose` 48rem, `content` 64rem, `wide` 80rem, `full` 1400px | Losse `max-w-*` en `container mx-auto px-4` |
| `Section` | Toon (`default`, `muted`, `sand`, `dark`, `card`) en ruimte (`compact`, `default`, `spacious`) | Losse `py-*` en `bg-*` op secties |
| `SectionHeader` | Eyebrow (met nummer), kop (`h1`/`h2`/`h3`), intro; `onDark` voor donkere secties; `align="center"` | Eigen eyebrow-stijlen, vette Fraunces-koppen |
| `Pill` | Status- en infolabel met toon `neutral`/`info`/`success`/`warning`/`danger`/`purple`/`brand` | `MicroPill` (oude naam, werkt nog), losse `Badge`-kleuren, gekleurde `<p>` |
| `Notice` | Melding in de pagina met toon `info`/`success`/`warning`/`danger` | Gekleurde `div`s met eigen rand en achtergrond |
| `SurfaceTheme` | Zet `data-surface` op `public` of `portal` per route | – |

Nog te bouwen (fase 2 en 3): `Stepper`, `WizardFooter`, `FormField` en
veldcomponenten, `OptionCard`, `SuccessScreen`, `EmptyState`,
`LoadingState`, `FloatingLayer`, `PageHero`, `RouteChooser`, `MediaCard`,
`FactList`, `PersonQuote`, `Faq`, `Breadcrumb`.

## Regels voor interactie

- Eén primaire knop per scherm; de tweede actie is `secondary`, `outline`,
  `ghost` of `link`. Op een donkere band: primair plus `inverseOutline`.
- Knoppen op mobiel volle breedte in wizards; aanraakdoelen minimaal
  44×44px.
- Verzendknop heet "Aanvraag versturen", laadtekst "Versturen…".
  "Vrijblijvend" en de responstijd staan in één regel onder de knop.
- Aanspreekvorm "u" op alle publieke pagina's en in de funnel.
- Status: goed = success, aandacht = warning, geblokkeerd = destructive,
  uitleg = info. Schaarste ("bijna vol") is warning.
- Prijs altijd via `formatBlockPrice`, met dezelfde notitie op elke plek.
- Beweging: entree 700ms alleen in de hero; staatwissel 300ms; nooit
  oneindig behalve een spinner. `MotionConfig reducedMotion="user"` in
  `App.tsx` en de `prefers-reduced-motion`-regel in `index.css` zetten alles
  uit voor wie dat wil.
- Eén toastsysteem (sonner via `useToast`). Eén meldingscomponent in de
  pagina (`Notice`).

## Zo controleer je een wijziging

1. Open `/ontwerp` op de preview: staan de knoppen, pills en koppen nog in
   één lijn?
2. `bunx tsx scripts/check-design-debt.ts`: is het getal niet gestegen?
3. Klik de pagina's door die je hebt geraakt, op desktop en op een telefoon.
