-- Stap 1: Nieuwe categorieën toevoegen aan het ENUM type
ALTER TYPE building_block_category ADD VALUE IF NOT EXISTS 'outdoor';
ALTER TYPE building_block_category ADD VALUE IF NOT EXISTS 'excursies';
ALTER TYPE building_block_category ADD VALUE IF NOT EXISTS 'entertainment';
ALTER TYPE building_block_category ADD VALUE IF NOT EXISTS 'locaties';