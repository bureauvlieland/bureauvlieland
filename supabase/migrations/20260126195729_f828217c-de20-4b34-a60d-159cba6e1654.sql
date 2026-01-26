-- Add duration column to program_request_items to store activity duration
ALTER TABLE public.program_request_items 
ADD COLUMN IF NOT EXISTS duration TEXT;