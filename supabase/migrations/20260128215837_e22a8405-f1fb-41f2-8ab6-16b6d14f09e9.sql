-- Add proposed time and date columns to program_request_items
-- These allow partners to propose alternative times/dates when confirming or suggesting alternatives

ALTER TABLE public.program_request_items
ADD COLUMN IF NOT EXISTS proposed_time text,
ADD COLUMN IF NOT EXISTS proposed_date date;

-- Add comment for documentation
COMMENT ON COLUMN public.program_request_items.proposed_time IS 'Partner proposed alternative time (e.g., "10:00" or "ochtend")';
COMMENT ON COLUMN public.program_request_items.proposed_date IS 'Partner proposed alternative date';