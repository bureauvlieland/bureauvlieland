-- Fase 1: catering-aanvragen datamodel uitbreiding

-- building_blocks: catering-specifieke metadata
ALTER TABLE public.building_blocks
  ADD COLUMN IF NOT EXISTS catering_type text,
  ADD COLUMN IF NOT EXISTS catering_role text,
  ADD COLUMN IF NOT EXISTS required_with jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suggested_addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scaling_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.building_blocks.catering_type IS 'lunch | borrel | bbq | diner | ontbijt | drank | versnapering | addon';
COMMENT ON COLUMN public.building_blocks.catering_role IS 'hoofd | huur | personeel | meubilair | drank | servies | versnapering';
COMMENT ON COLUMN public.building_blocks.required_with IS 'Array of building_block ids auto-added when this hoofd-item is chosen';
COMMENT ON COLUMN public.building_blocks.suggested_addons IS 'Array of building_block ids suggested when this hoofd-item is chosen';
COMMENT ON COLUMN public.building_blocks.scaling_rules IS 'Array of {min_guests:int, suggest:block_id} rules';

-- Indexen voor wizard-filtering
CREATE INDEX IF NOT EXISTS idx_building_blocks_catering_type
  ON public.building_blocks (catering_type)
  WHERE catering_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_building_blocks_catering_role
  ON public.building_blocks (catering_role)
  WHERE catering_role IS NOT NULL;

-- program_requests: catering-context velden
ALTER TABLE public.program_requests
  ADD COLUMN IF NOT EXISTS catering_location_text text,
  ADD COLUMN IF NOT EXISTS catering_start_time text,
  ADD COLUMN IF NOT EXISTS has_horeca_on_site boolean;

COMMENT ON COLUMN public.program_requests.catering_location_text IS 'Vrije locatie-omschrijving voor catering_only aanvragen';
COMMENT ON COLUMN public.program_requests.catering_start_time IS 'Starttijd HH:MM voor catering_only aanvragen';
COMMENT ON COLUMN public.program_requests.has_horeca_on_site IS 'Triggert servies/bediening-suggesties bij diner';
