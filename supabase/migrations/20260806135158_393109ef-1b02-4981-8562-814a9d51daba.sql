ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS override_children integer,
  ADD COLUMN IF NOT EXISTS child_unit_price numeric,
  ADD COLUMN IF NOT EXISTS child_min_age integer,
  ADD COLUMN IF NOT EXISTS child_max_age integer,
  ADD COLUMN IF NOT EXISTS pending_override_children integer,
  ADD COLUMN IF NOT EXISTS pending_child_unit_price numeric;

COMMENT ON COLUMN public.program_request_items.override_children IS 'Aantal kinderen tegen het kindtarief; staat los van override_people (volwassenen).';
COMMENT ON COLUMN public.program_request_items.child_unit_price IS 'Kinderprijs per persoon (incl. btw), overgenomen uit de bouwsteen of handmatig gezet.';

ALTER TABLE public.program_request_items
  ADD CONSTRAINT program_request_items_override_children_nonneg
    CHECK (override_children IS NULL OR override_children >= 0),
  ADD CONSTRAINT program_request_items_pending_override_children_nonneg
    CHECK (pending_override_children IS NULL OR pending_override_children >= 0),
  ADD CONSTRAINT program_request_items_child_unit_price_nonneg
    CHECK (child_unit_price IS NULL OR child_unit_price >= 0),
  ADD CONSTRAINT program_request_items_pending_child_unit_price_nonneg
    CHECK (pending_child_unit_price IS NULL OR pending_child_unit_price >= 0);