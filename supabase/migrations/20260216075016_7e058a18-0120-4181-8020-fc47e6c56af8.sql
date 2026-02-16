-- Add external_url column to program_request_items for self-arranged booking links
ALTER TABLE public.program_request_items
ADD COLUMN external_url text DEFAULT NULL;

-- Backfill external_url from building_blocks for existing items
UPDATE program_request_items pri
SET external_url = bb.external_url
FROM building_blocks bb
WHERE pri.block_id = bb.id
  AND bb.external_url IS NOT NULL
  AND pri.external_url IS NULL;