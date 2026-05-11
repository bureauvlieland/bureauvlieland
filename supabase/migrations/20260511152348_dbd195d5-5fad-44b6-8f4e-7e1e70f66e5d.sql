
-- Fase 4b — datacorrectie BV-2604-0010
-- Beach Golf: admin-intent per klantverzoek = 11:30
UPDATE public.program_request_items
SET confirmed_time = '11:30',
    preferred_time = '11:30',
    proposed_time = NULL,
    status_note = 'Tijd 11:30 ingesteld door Bureau Vlieland (op verzoek klant)',
    status_updated_at = now()
WHERE id = '4891b55b-354f-4579-82f8-bfa08fa6e749';

-- Rondleiding Brouwerij Fortuna: admin-intent = 11:15 (per status_note)
UPDATE public.program_request_items
SET preferred_time = '11:15',
    proposed_time = NULL,
    status_updated_at = now()
WHERE id = 'f5c135d5-5055-475f-a8a0-ce03db61320b';

-- Vrije tijd: admin-intent = 14:45
UPDATE public.program_request_items
SET preferred_time = '14:45',
    proposed_time = NULL,
    status_updated_at = now()
WHERE id = '6da95bea-080f-4461-b534-860d8f7550cd';
