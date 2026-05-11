-- Fase 5 stap 5: 'origin' is nu enige bron-of-truth voor project-classificatie.
-- Achtergrond: 'program_type' werd zowel als label als als workflow-driver gebruikt.
-- Sinds Fase 5 schrijft alle code 'origin' direct (geen DB-trigger meer nodig) en alle reads
-- gebruiken 'origin' met fallback op 'program_type' tijdens deploy. Nu kan de kolom weg.

-- 1) Zorg dat origin gevuld is voor alle bestaande rijen (defensief, zou al zo moeten zijn)
UPDATE public.program_requests
SET origin = COALESCE(origin, program_type, 'self_service')
WHERE origin IS NULL;

-- 2) Maak origin NOT NULL met default 'self_service'
ALTER TABLE public.program_requests ALTER COLUMN origin SET DEFAULT 'self_service';
ALTER TABLE public.program_requests ALTER COLUMN origin SET NOT NULL;

-- 3) Drop legacy kolom program_type
ALTER TABLE public.program_requests DROP COLUMN program_type;