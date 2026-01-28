-- Koppeling van program naar accommodation
ALTER TABLE program_requests 
ADD COLUMN linked_accommodation_id uuid REFERENCES accommodation_requests(id);

-- Index voor snelle lookups
CREATE INDEX idx_program_requests_linked_accommodation 
ON program_requests(linked_accommodation_id);