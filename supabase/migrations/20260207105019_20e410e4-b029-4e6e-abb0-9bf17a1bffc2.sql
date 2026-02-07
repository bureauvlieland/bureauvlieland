
-- Nieuwe status kolom
ALTER TABLE building_blocks ADD COLUMN status text NOT NULL DEFAULT 'concept';

-- Bestaande data migreren
UPDATE building_blocks SET status = 'published' WHERE is_published = true AND is_active = true;
UPDATE building_blocks SET status = 'active' WHERE is_published = false AND is_active = true;
UPDATE building_blocks SET status = 'concept' WHERE is_active = false;

-- RLS policy aanpassen
DROP POLICY "Published blocks are publicly readable" ON building_blocks;
CREATE POLICY "Published blocks are publicly readable" ON building_blocks
  FOR SELECT USING (status = 'published');
