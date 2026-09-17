-- Zes gepubliceerde voorbeeldprogramma's bevatten de bouwsteen "vrije-tijd",
-- die niet gepubliceerd was. Voor de klant was dat onderdeel onzichtbaar,
-- maar het kwam wél in het programma terecht en liet het versturen weigeren.
-- Besluit Erwin (16 september 2026): gewoon publiceren, het is een echt
-- onderdeel van het programma.
--
-- De trigger trg_prevent_partner_publish_building_blocks laat alleen admins
-- en de service-rol publicatievelden wijzigen. Een migratie draait zonder
-- auth-context (auth.uid() is null) en werd daardoor geweigerd bij de
-- deploy van 17 september. Daarom staat de trigger tijdens deze ene update
-- uit; daarna meteen weer aan.
ALTER TABLE public.building_blocks DISABLE TRIGGER trg_prevent_partner_publish_building_blocks;

UPDATE public.building_blocks
SET status = 'published',
    is_published = true,
    is_active = true,
    updated_at = now()
WHERE id = 'vrije-tijd'
  AND status IS DISTINCT FROM 'published';

ALTER TABLE public.building_blocks ENABLE TRIGGER trg_prevent_partner_publish_building_blocks;
