-- Beach Grill Experience gaat uit het aanbod (besluit Erwin, 17 september 2026).
-- Grillmaster bieden we ook niet meer. Beide worden gedepubliceerd, niet
-- verwijderd: oude aanvragen blijven leesbaar en het is omkeerbaar.
--
-- De trigger trg_prevent_partner_publish_building_blocks weigert
-- statuswijzigingen zonder admin-auth-context (zie docs/deployen.md).
ALTER TABLE public.building_blocks DISABLE TRIGGER trg_prevent_partner_publish_building_blocks;

UPDATE public.building_blocks
SET status = 'active',
    is_published = false,
    updated_at = now()
WHERE id IN ('strand-bbq', 'grillmaster-zuiver-traiteur')
  AND status = 'published';

ALTER TABLE public.building_blocks ENABLE TRIGGER trg_prevent_partner_publish_building_blocks;

-- Drie voorbeeldprogramma's noemden Beach Grill of het grillmaster-diner nog
-- in hun beschrijving, terwijl de onderdelen op 11 september al vervangen
-- zijn door Pizza & Borrel bij Café Boven. Tekst nu gelijk aan de inhoud.
UPDATE public.program_templates SET description =
  'Drie dagen Vlieland waarin actie en cultuur elkaar afwisselen: strandspektakel en Pizza & Borrel bij Café Boven op dag één, paardrijden en bunkermuseum met zeehondentocht op dag twee, afgesloten met Italiaanse shared dining bij Oliva, en lasergamen op dag drie voordat u terugvaart met plateservice aan boord.'
WHERE id = 'actief-cultureel-3d';

UPDATE public.program_templates SET description =
  'Twee dagen avontuur en ontspanning op Vlieland. Op dag één de Vliehors Expres over de grootste zandvlakte van Europa en Pizza & Borrel bij Café Boven, op dag twee een begeleide fietstocht en een zeehondentocht. Inclusief overtochten en overnachting.'
WHERE id = 'avontuur-ontspanning';

UPDATE public.program_templates SET description =
  'Drie dagen Vlieland in al zijn facetten. Op dag één een strandspektakel en Pizza & Borrel bij Café Boven, op dag twee een begeleide fietstocht, zeehondentocht, rondleiding bij Brouwerij Fortuna, Italiaanse shared dining bij Oliva en een exclusieve feestavond in Café Boven. Dag drie biedt vrije tijd voordat u terugvaart. Inclusief overtochten en twee overnachtingen.'
WHERE id = 'eilandbeleving-compleet';

-- Slugs: de kolom is in juni eenmalig gevuld uit de naam, maar nieuwe en
-- gedupliceerde bouwstenen kregen daarna geen slug. De pagina viel dan terug
-- op het interne ID (bijvoorbeeld /activiteit/italian-shared-dining-kopie).
-- Vanaf nu vult een trigger een lege slug uit de naam, uniek gemaakt met een
-- volgnummer. Een bestaande slug wordt nooit stilzwijgend veranderd, want
-- dat breekt gevonden pagina's; dat doet de beheerder bewust in admin.
CREATE OR REPLACE FUNCTION public.building_blocks_fill_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_n int := 1;
BEGIN
  -- Een opgegeven slug wordt genormaliseerd (kleine letters, koppeltekens).
  IF NEW.slug IS NOT NULL AND length(trim(NEW.slug)) > 0 THEN
    NEW.slug := public.slugify(NEW.slug);
  END IF;

  IF NEW.slug IS NULL OR length(NEW.slug) = 0 THEN
    v_base := public.slugify(NEW.name);
    IF v_base IS NULL OR length(v_base) = 0 THEN
      v_base := public.slugify(NEW.id);
    END IF;
    v_candidate := v_base;
    WHILE EXISTS (SELECT 1 FROM public.building_blocks b WHERE b.slug = v_candidate AND b.id <> NEW.id) LOOP
      v_n := v_n + 1;
      v_candidate := v_base || '-' || v_n;
    END LOOP;
    NEW.slug := v_candidate;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_building_blocks_fill_slug ON public.building_blocks;
CREATE TRIGGER trg_building_blocks_fill_slug
  BEFORE INSERT OR UPDATE OF slug, name ON public.building_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.building_blocks_fill_slug();

-- Pizza & Borrel krijgt een korte, leesbare slug; dit wordt de gepromote pagina.
UPDATE public.building_blocks
SET slug = 'pizza-en-borrel-cafe-boven'
WHERE id = 'italian-shared-dining-kopie'
  AND NOT EXISTS (SELECT 1 FROM public.building_blocks WHERE slug = 'pizza-en-borrel-cafe-boven');

-- Alle overige bouwstenen zonder slug: de trigger vult ze uit de naam.
UPDATE public.building_blocks
SET slug = NULL
WHERE slug IS NULL OR length(trim(slug)) = 0;
