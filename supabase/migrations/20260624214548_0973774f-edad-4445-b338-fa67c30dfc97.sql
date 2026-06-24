ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS bureau_guide_name text,
  ADD COLUMN IF NOT EXISTS bureau_guide_contact text,
  ADD COLUMN IF NOT EXISTS bureau_arranged_at timestamptz,
  ADD COLUMN IF NOT EXISTS bureau_arranged_notes text;

COMMENT ON COLUMN public.program_request_items.bureau_guide_name IS 'Naam van de begeleider voor bureau-uitvoeringen (vuurtorenwachter, gids fietstocht, etc.)';
COMMENT ON COLUMN public.program_request_items.bureau_arranged_at IS 'Wanneer admin het bureau-onderdeel als geregeld heeft gemarkeerd';