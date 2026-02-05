-- Add accommodation description field to partners table
ALTER TABLE public.partners
ADD COLUMN accommodation_description TEXT;

-- Add a comment explaining the field
COMMENT ON COLUMN public.partners.accommodation_description IS 'Default accommodation description used when submitting quotes';