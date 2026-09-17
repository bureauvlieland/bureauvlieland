-- Zes gepubliceerde voorbeeldprogramma's bevatten de bouwsteen "vrije-tijd",
-- die niet gepubliceerd was. Voor de klant was dat onderdeel onzichtbaar,
-- maar het kwam wél in het programma terecht en liet het versturen weigeren.
-- Besluit Erwin (16 september 2026): gewoon publiceren, het is een echt
-- onderdeel van het programma.
UPDATE public.building_blocks
SET status = 'published',
    is_published = true,
    is_active = true,
    updated_at = now()
WHERE id = 'vrije-tijd'
  AND status IS DISTINCT FROM 'published';
