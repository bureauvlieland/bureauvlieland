-- Add status tracking fields to program_requests
ALTER TABLE program_requests 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE program_requests 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE program_requests 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add comment for clarity
COMMENT ON COLUMN program_requests.status IS 'Request status: active, cancelled, completed';