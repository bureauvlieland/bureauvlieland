ALTER TABLE accommodation_quotes DROP CONSTRAINT accommodation_quotes_status_check;
ALTER TABLE accommodation_quotes ADD CONSTRAINT accommodation_quotes_status_check 
  CHECK (status = ANY (ARRAY['pending','submitted','selected','rejected','expired','declined','withdrawn']));