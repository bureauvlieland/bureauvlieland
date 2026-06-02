UPDATE public.program_requests
SET quote_status = 'concept'
WHERE quote_status IS NULL;

ALTER TABLE public.program_requests
  ALTER COLUMN quote_status SET DEFAULT 'concept';