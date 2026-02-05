-- Add program_description field to program_requests table
ALTER TABLE program_requests
ADD COLUMN program_description TEXT;