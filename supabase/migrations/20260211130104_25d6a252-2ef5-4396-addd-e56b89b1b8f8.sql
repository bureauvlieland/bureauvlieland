
-- Migrate per_hour and per_day blocks to total
UPDATE public.building_blocks SET price_type = 'total' WHERE price_type = 'per_hour';
UPDATE public.building_blocks SET price_type = 'total' WHERE price_type = 'per_day';

-- Drop default before type swap
ALTER TABLE public.building_blocks ALTER COLUMN price_type DROP DEFAULT;

-- Remove deprecated enum values
ALTER TYPE public.building_block_price_type RENAME TO building_block_price_type_old;
CREATE TYPE public.building_block_price_type AS ENUM ('per_person', 'total', 'on_request');

ALTER TABLE public.building_blocks 
  ALTER COLUMN price_type TYPE public.building_block_price_type 
  USING price_type::text::public.building_block_price_type;

ALTER TABLE public.building_blocks 
  ALTER COLUMN price_type SET DEFAULT 'per_person'::public.building_block_price_type;

DROP TYPE public.building_block_price_type_old;
