DROP POLICY IF EXISTS "Published blocks are publicly readable" ON public.building_blocks;

CREATE POLICY "Published blocks are publicly readable"
ON public.building_blocks
FOR SELECT
USING (
  status = 'published'
  AND is_published = true
  AND is_active = true
);