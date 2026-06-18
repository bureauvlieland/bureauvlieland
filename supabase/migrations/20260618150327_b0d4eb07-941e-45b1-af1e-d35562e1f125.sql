
-- 1. Components table
CREATE TABLE public.building_block_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_block_id text NOT NULL REFERENCES public.building_blocks(id) ON DELETE CASCADE,
  child_block_id  text NOT NULL REFERENCES public.building_blocks(id) ON DELETE RESTRICT,
  is_required boolean NOT NULL DEFAULT true,
  quantity_mode text NOT NULL DEFAULT 'fixed'
    CHECK (quantity_mode IN ('fixed','per_group','per_n_people','per_people_per_day')),
  quantity_value numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bbc_no_self_ref CHECK (parent_block_id <> child_block_id),
  CONSTRAINT bbc_unique_pair UNIQUE (parent_block_id, child_block_id)
);

CREATE INDEX bbc_parent_idx ON public.building_block_components(parent_block_id);
CREATE INDEX bbc_child_idx  ON public.building_block_components(child_block_id);

GRANT SELECT ON public.building_block_components TO anon, authenticated;
GRANT ALL    ON public.building_block_components TO service_role;

ALTER TABLE public.building_block_components ENABLE ROW LEVEL SECURITY;

-- Public read mirrors building_blocks readability: anyone can read components
-- whose PARENT block is published; admins can read all.
CREATE POLICY "bbc read published parents"
ON public.building_block_components FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.building_blocks bb
    WHERE bb.id = parent_block_id
      AND bb.status = 'published'
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "bbc admin write"
ON public.building_block_components FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER set_bbc_updated_at
BEFORE UPDATE ON public.building_block_components
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guard: prevent 2+ levels of composition (child may not itself have components).
CREATE OR REPLACE FUNCTION public.bbc_guard_no_recursion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.building_block_components
    WHERE parent_block_id = NEW.child_block_id
  ) THEN
    RAISE EXCEPTION 'Child block % is itself a composite (would create nested composition).', NEW.child_block_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.building_block_components
    WHERE child_block_id = NEW.parent_block_id
  ) THEN
    RAISE EXCEPTION 'Parent block % is already a child of another composite (would create nested composition).', NEW.parent_block_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bbc_guard_no_recursion_trg
BEFORE INSERT OR UPDATE ON public.building_block_components
FOR EACH ROW EXECUTE FUNCTION public.bbc_guard_no_recursion();

-- 2. Link children program items to their parent
ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS parent_item_id uuid
    REFERENCES public.program_request_items(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS pri_parent_item_idx
  ON public.program_request_items(parent_item_id);
