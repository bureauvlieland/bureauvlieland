ALTER TABLE public.building_blocks
  ADD COLUMN IF NOT EXISTS map_activity_type_id integer;

CREATE UNIQUE INDEX IF NOT EXISTS building_blocks_provider_map_type_uniq
  ON public.building_blocks (provider_id, map_activity_type_id)
  WHERE map_activity_type_id IS NOT NULL;