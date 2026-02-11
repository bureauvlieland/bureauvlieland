
ALTER TABLE public.building_blocks
  ADD COLUMN location_lat NUMERIC NULL,
  ADD COLUMN location_lng NUMERIC NULL,
  ADD COLUMN location_address TEXT NULL;
