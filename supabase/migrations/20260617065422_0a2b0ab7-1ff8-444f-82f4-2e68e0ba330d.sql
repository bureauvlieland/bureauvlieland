
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.building_blocks ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(
    regexp_replace(
      lower(public.unaccent(coalesce(value, ''))),
      '[^a-z0-9]+', '-', 'g'
    ),
    '-+', '-', 'g'
  ));
$$;

WITH ranked AS (
  SELECT
    id,
    public.slugify(name) AS base,
    row_number() OVER (PARTITION BY public.slugify(name) ORDER BY created_at, id) AS rn
  FROM public.building_blocks
  WHERE slug IS NULL AND name IS NOT NULL AND length(public.slugify(name)) > 0
)
UPDATE public.building_blocks bb
SET slug = CASE WHEN r.rn = 1 THEN r.base ELSE r.base || '-' || r.rn END
FROM ranked r
WHERE bb.id = r.id;

CREATE UNIQUE INDEX IF NOT EXISTS building_blocks_slug_key
  ON public.building_blocks (slug)
  WHERE slug IS NOT NULL;
