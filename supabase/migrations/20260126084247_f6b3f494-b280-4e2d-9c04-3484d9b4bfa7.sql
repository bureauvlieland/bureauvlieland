-- Add columns for automatic todo tracking
ALTER TABLE admin_todos ADD COLUMN IF NOT EXISTS auto_type text;
ALTER TABLE admin_todos ADD COLUMN IF NOT EXISTS auto_entity_id text;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_admin_todos_auto_type ON admin_todos(auto_type) WHERE auto_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_todos_auto_entity_id ON admin_todos(auto_entity_id) WHERE auto_entity_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN admin_todos.auto_type IS 'Type of automatic todo: partner_reminder, commission_pending, terms_reminder, invoicing_ready';
COMMENT ON COLUMN admin_todos.auto_entity_id IS 'ID of the entity that triggered this auto todo (item_id or request_id)';