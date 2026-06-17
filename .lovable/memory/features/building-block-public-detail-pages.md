---
name: building-block-public-detail-pages
description: Per-bouwsteen indexeerbare detailpagina op /activiteit/<slug> met Product JSON-LD; sitemap auto-gegenereerd via predev/prebuild
type: feature
---

## Routes
- `/activiteit/:slug` → `src/pages/ActiviteitDetail.tsx`. Lookup op `building_blocks.slug`, fallback op `id` (legacy) met redirect.
- `/wadlopen-vlieland` → `src/pages/WadlopenVlieland.tsx` (SEO landing, momenteel `noindex` totdat Erwin tekst goedkeurt).

## Slug-veld
- Kolom `building_blocks.slug` (unique waar niet null), auto-backfilled via `public.slugify()` (gebruikt `unaccent`).
- Nieuwe blokken: slugify(name) handmatig in admin invoeren tot we hier een DB-trigger op zetten.

## Hidden blocks (niet in publieke catalog + sitemap)
`boot-enkel-heen`, `boot-enkel-terug`, `boot-retour`, `fiets-huur` (managed services). Dezelfde set in `Bouwstenen.tsx`, `ActiviteitDetail.tsx` en `scripts/generate-sitemap.ts`.

## SEO per detailpagina (Helmet)
- Title: `{name} op Vlieland | Bureau Vlieland` (truncate 60).
- Description: `short_description` of eerste 158 tekens van `description`.
- Self-canonical naar `/activiteit/{slug}` — voorkomt cannibalisatie met `/bouwstenen`.
- JSON-LD `Product` (met `offers` als `price_adult` bekend en `price_type !== 'on_request'`) + `BreadcrumbList`.

## Sitemap
`scripts/generate-sitemap.ts` draait via `predev` + `prebuild` (`bunx tsx`), schrijft `public/sitemap.xml`. Fetcht `building_blocks` via REST met de publieke anon key. Faalt soft (exit 0) zodat dev/build niet stuk gaat.
