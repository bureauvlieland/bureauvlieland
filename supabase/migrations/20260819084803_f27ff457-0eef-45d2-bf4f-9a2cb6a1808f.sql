GRANT SELECT ON public.building_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_blocks TO authenticated;
GRANT ALL ON public.building_blocks TO service_role;