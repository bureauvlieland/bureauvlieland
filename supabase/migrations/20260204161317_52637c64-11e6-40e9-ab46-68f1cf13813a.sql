-- Add onboarding tracking columns to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS invited_at timestamptz,
ADD COLUMN IF NOT EXISTS password_set_at timestamptz,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN public.partners.invited_at IS 'Timestamp when partner invitation email was sent';
COMMENT ON COLUMN public.partners.password_set_at IS 'Timestamp when partner set their password (activated account)';
COMMENT ON COLUMN public.partners.last_login_at IS 'Timestamp of partner last login';