ALTER TABLE public.program_requests
ADD COLUMN IF NOT EXISTS excluded_fees text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.program_requests.excluded_fees IS
'Lijst van automatische kostenposten die op dit project NIET op de factuur komen. Toegestane waarden: tourist_tax, nature_contribution, central_surcharge, coordination_fee.';