-- Stap 1: Corrigeer foutieve linked_accommodation_id koppelingen
-- Behoud alleen de programma's die daadwerkelijk als linked_program_id in accommodation_requests staan
UPDATE public.program_requests pr
SET linked_accommodation_id = NULL,
    updated_at = now()
WHERE linked_accommodation_id IS NOT NULL
  AND id NOT IN (
    SELECT ar.linked_program_id 
    FROM public.accommodation_requests ar 
    WHERE ar.linked_program_id IS NOT NULL
  );

-- Stap 2: Voeg unique constraint toe om toekomstige duplicaten te voorkomen
ALTER TABLE public.program_requests
ADD CONSTRAINT program_requests_linked_accommodation_id_unique 
UNIQUE (linked_accommodation_id);