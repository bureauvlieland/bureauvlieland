
## Doel

Twee SEO-quick-wins uit Batch 2:
- **#9** Iedere bouwsteen krijgt zijn eigen indexeerbare pagina (`/activiteit/blokarten`, `/activiteit/paardrijden`, `/activiteit/surfles`, ...). Nu staat alles op één `/bouwstenen`-pagina in een dialog → Google ziet het niet.
- **#3** Nieuwe landingspagina `/wadlopen-vlieland` (eerste draft, daarna jouw input op USP/foto/tekst).

---

## Stap 1 — Slug-veld op building_blocks

Migratie:
- Kolom `slug text` op `public.building_blocks` (unique, nullable initieel).
- Backfill: slugify(`name`) — lowercase, spaties → `-`, diakrieten weg, non-alfanum strippen. Dubbele namen krijgen `-2`, `-3`.
- Unique index op `slug` waar niet null.
- Admin-edit-sheet krijgt een Slug-veld (auto-gevuld, handmatig overschrijfbaar) zodat jij later `blokarten-vlieland` ipv `blokarten` kan kiezen als dat beter scoort.

Geen RLS-wijziging nodig — bestaande "published is publiek leesbaar"-policy dekt het.

## Stap 2 — Detailroute `/activiteit/:slug`

Nieuwe pagina `src/pages/ActiviteitDetail.tsx`:
- Lookup op `slug` (fallback op `id` voor oude links).
- 404 als block niet `status='published'` of in `HIDDEN_IDS` (boot/fiets blijven verborgen — managed services).
- Layout: hero met `image_url`, H1 = `name`, `short_description`, lange `description`, praktische info (duur, groepsgrootte, locatie, partner), prijsblok, gerelateerde bouwstenen (zelfde categorie, 3 stuks), CTA "Voeg toe aan offerte" → bestaande cart-flow.
- **SEO per pagina (Helmet):**
  - `<title>` = `{name} op Vlieland | Bureau Vlieland` (max 60 tekens, truncate met `…` als nodig).
  - `<meta description>` = `short_description` of eerste 155 tekens van `description`.
  - `<link rel="canonical">` = `https://bureauvlieland.nl/activiteit/{slug}` (self-referencing — voorkomt cannibalisatie met `/bouwstenen`).
  - `og:title`, `og:url`, `og:image` (= `image_url`), `og:type=article`.
  - JSON-LD `@type: Product` met name, description, image, brand (partner of Bureau Vlieland), offers (price/priceCurrency=EUR, availability=InStock) wanneer `price_adult` bekend is. Op-aanvraag → geen offers.
  - JSON-LD `BreadcrumbList`: Home → Bouwstenen → {name}.
- Semantische HTML: één `<h1>`, secties met `<section>`, alt-text op afbeelding = `name`.

## Stap 3 — `/bouwstenen` linkt naar detailpagina's

- Kaartjes worden `<Link to="/activiteit/{slug}">` ipv dialog-trigger.
- Dialog blijft optioneel als "snel bekijken" knop, maar primaire klik = navigatie (crawlbare `<a href>`).
- Interne links bouwen autoriteit op: home-mosaic (`ActivitiesShowcase`), programma-templates en partnerpagina's gaan ook linken naar `/activiteit/{slug}` in plaats van naar de dialog.

## Stap 4 — Sitemap-uitbreiding

`scripts/generate-sitemap.ts` (nieuw bestand — nu hebben we alleen `public/sitemap.xml` statisch):
- Voor elk gepubliceerd, niet-verborgen block één entry: `/activiteit/{slug}`, `changefreq=monthly`, `priority=0.7`.
- `predev` + `prebuild` hook in `package.json` zodat de sitemap automatisch klopt na elke nieuwe bouwsteen.
- Bestaande statische routes blijven erin.

## Stap 5 — Wadlopen-landingspagina (draft)

`src/pages/WadlopenVlieland.tsx` op route `/wadlopen-vlieland`:
- Eigen H1 "Wadlopen op Vlieland", 600–800 woorden draft-tekst (seizoen, getijden, ervaring, samenwerking met gecertificeerde gids, wat meenemen, vanaf-prijs op aanvraag).
- Helmet: title `Wadlopen op Vlieland — met gids | Bureau Vlieland`, description gericht op keyword "wadlopen vlieland" (260 zoekopdr/mnd, nu pos 13).
- JSON-LD `TouristAttraction` + `FAQPage` (3–5 vragen: seizoen, leeftijd, niveau, prijs, annulering).
- CTA "Vraag wadlopen aan" → bestaande aanvraagflow met categorie gepreselecteerd.
- Foto: tijdelijke placeholder uit `src/assets/` (bv. `dunes-group.jpg`) — jij levert later definitieve foto.
- Tekst expliciet als "DRAFT — wacht op input Erwin" comment bovenaan zodat we weten dat het nog reviewed moet worden.

Daarna vraag ik jou:
1. USP (waarom wadlopen via Bureau Vlieland en niet rechtstreeks bij een gids?)
2. Vanaf-prijs of "op aanvraag"?
3. Welke partner-gids(en) noemen?
4. 1 eigen foto (anders houden we de placeholder).

## Stap 6 — Sitemap toevoegen aan robots.txt + memory

- `Sitemap: https://bureauvlieland.nl/sitemap.xml` regel in `public/robots.txt` (al aanwezig checken).
- Memory-entry: bouwsteen → publieke route `/activiteit/{slug}`, Product JSON-LD, sitemap auto-gegenereerd.

---

## Wat ik NIET in deze ronde doe

- Geen redirect van `/bouwstenen?block=xxx` modal-links — die bestaan niet als crawlbare URLs.
- Geen rewrite van bestaande bouwsteen-content (description/short_description). Als die te kort/dun zijn voor goede SEO meld ik dat per block in een vervolgactie zodat jij ze kan aanvullen.
- Wadlopen-tekst is een **draft** — geen publicatie op productie zonder jouw akkoord; pagina staat wel live maar krijgt `noindex` tot jij akkoord geeft.

## Resultaat

- Google kan ~40+ losse activiteitenpagina's indexeren ipv 1 verzamelpagina.
- "blokarten vlieland", "paardrijden vlieland", "surfles vlieland", "powerkiten vlieland" etc. krijgen eigen ranking-kans (long-tail, lage difficulty).
- Wadlopen-pagina = directe stoot op keyword met 260 zoekopdr/mnd, pos 13 → realistisch top-5 binnen 4–8 weken.
- Sitemap blijft automatisch in sync.

Akkoord? Dan bouw ik dit en kom ik daarna terug met de 4 wadlopen-vragen.
