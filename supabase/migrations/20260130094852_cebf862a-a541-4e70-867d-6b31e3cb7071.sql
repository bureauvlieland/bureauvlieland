-- Drop the existing foreign key constraint
ALTER TABLE public.program_requests 
DROP CONSTRAINT IF EXISTS program_requests_linked_accommodation_id_fkey;

-- Re-add the foreign key as DEFERRABLE INITIALLY DEFERRED
-- This allows the constraint check to happen at the end of the transaction
ALTER TABLE public.program_requests 
ADD CONSTRAINT program_requests_linked_accommodation_id_fkey 
FOREIGN KEY (linked_accommodation_id) 
REFERENCES public.accommodation_requests(id)
DEFERRABLE INITIALLY DEFERRED;