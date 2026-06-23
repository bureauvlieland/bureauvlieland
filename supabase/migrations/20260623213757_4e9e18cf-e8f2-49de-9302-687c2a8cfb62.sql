UPDATE public.program_request_items
SET status_note = NULL,
    status_updated_at = NULL
WHERE status_note ~* '^Tijd (\d{1,2}:\d{2} ingesteld|verwijderd) door (admin|Bureau Vlieland)';