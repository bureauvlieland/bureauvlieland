DROP TRIGGER IF EXISTS trg_sync_program_origin ON public.program_requests;
DROP FUNCTION IF EXISTS public.sync_program_origin_from_type();