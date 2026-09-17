-- 1. Pizza & Borrel bij Café Boven krijgt de foto van Café Boven zelf
--    (aangeleverd door Erwin, 17 september 2026; staat al in de bucket
--    building-block-images van het nieuwe project).
UPDATE public.building_blocks
SET image_url = 'https://utshmnyrjzwtrpttxdlw.supabase.co/storage/v1/object/public/building-block-images/1789650247862-CMAK0316.JPG',
    updated_at = now()
WHERE id = 'italian-shared-dining-kopie';

-- 2. Alle opgeslagen afbeeldingsadressen wijzen nog naar het oude
--    Lovable-Cloud-project (blhspuifehausilnzwio). De bestanden zijn op
--    8 september gekopieerd naar het nieuwe project (utshmnyrjzwtrpttxdlw),
--    maar de URL's in de database niet omgezet. Zodra het oude project
--    wordt verwijderd (roadmap: "Lovable Cloud opruimen") verdwijnen dan alle
--    foto's van bouwstenen, voorbeeldprogramma's, partners, kamertypes en
--    logiesoffertes. Gemeten op 17 september: 45 van de 48 gepubliceerde
--    bouwstenen, alle 12 voorbeeldprogramma's en 24 partnerverwijzingen;
--    alle 45 bouwsteenbestanden bestaan op het nieuwe project.
--    Paden zijn gelijk, alleen de host verschilt.
UPDATE public.building_blocks
SET image_url = replace(image_url, 'https://blhspuifehausilnzwio.supabase.co/', 'https://utshmnyrjzwtrpttxdlw.supabase.co/')
WHERE image_url LIKE 'https://blhspuifehausilnzwio.supabase.co/%';

UPDATE public.program_templates
SET image_url = replace(image_url, 'https://blhspuifehausilnzwio.supabase.co/', 'https://utshmnyrjzwtrpttxdlw.supabase.co/')
WHERE image_url LIKE 'https://blhspuifehausilnzwio.supabase.co/%';

UPDATE public.partners
SET image_url = replace(image_url, 'https://blhspuifehausilnzwio.supabase.co/', 'https://utshmnyrjzwtrpttxdlw.supabase.co/')
WHERE image_url LIKE 'https://blhspuifehausilnzwio.supabase.co/%';

UPDATE public.partners
SET gallery_images = replace(gallery_images::text, 'https://blhspuifehausilnzwio.supabase.co/', 'https://utshmnyrjzwtrpttxdlw.supabase.co/')::jsonb
WHERE gallery_images::text LIKE '%https://blhspuifehausilnzwio.supabase.co/%';

UPDATE public.partner_room_types
SET images = replace(images::text, 'https://blhspuifehausilnzwio.supabase.co/', 'https://utshmnyrjzwtrpttxdlw.supabase.co/')::jsonb
WHERE images::text LIKE '%https://blhspuifehausilnzwio.supabase.co/%';

UPDATE public.accommodation_quotes
SET images = replace(images::text, 'https://blhspuifehausilnzwio.supabase.co/', 'https://utshmnyrjzwtrpttxdlw.supabase.co/')::jsonb
WHERE images::text LIKE '%https://blhspuifehausilnzwio.supabase.co/%';
