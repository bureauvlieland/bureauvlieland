-- Drop existing status check constraint and add "declined" as valid status
ALTER TABLE public.accommodation_quotes DROP CONSTRAINT IF EXISTS accommodation_quotes_status_check;

ALTER TABLE public.accommodation_quotes ADD CONSTRAINT accommodation_quotes_status_check 
  CHECK (status IN ('pending', 'submitted', 'selected', 'rejected', 'expired', 'declined'));