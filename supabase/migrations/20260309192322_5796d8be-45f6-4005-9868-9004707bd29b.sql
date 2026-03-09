ALTER TABLE public.program_requests 
ADD COLUMN program_published_at timestamptz DEFAULT NULL;

UPDATE public.program_requests 
SET program_published_at = created_at 
WHERE status != 'deleted';