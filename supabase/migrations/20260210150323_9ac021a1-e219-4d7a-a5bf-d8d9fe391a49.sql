
-- Add price_type column to program_request_items
ALTER TABLE public.program_request_items
ADD COLUMN price_type text;

-- Backfill existing items from building_blocks
UPDATE public.program_request_items pri
SET price_type = bb.price_type
FROM public.building_blocks bb
WHERE pri.block_id = bb.id
  AND pri.price_type IS NULL;

-- Items without block_id (bureau costs etc.) default to 'total'
UPDATE public.program_request_items
SET price_type = 'total'
WHERE block_id IS NULL AND price_type IS NULL;
