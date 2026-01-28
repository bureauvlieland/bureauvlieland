-- Add attachment and external link fields to accommodation_quotes
ALTER TABLE accommodation_quotes 
ADD COLUMN quote_attachment_path text,
ADD COLUMN quote_attachment_filename text,
ADD COLUMN quote_external_url text;

-- Add comment for clarity
COMMENT ON COLUMN accommodation_quotes.quote_attachment_path IS 'Path to uploaded quote document in storage';
COMMENT ON COLUMN accommodation_quotes.quote_attachment_filename IS 'Original filename of the uploaded quote document';
COMMENT ON COLUMN accommodation_quotes.quote_external_url IS 'External URL to partner quote or booking system';