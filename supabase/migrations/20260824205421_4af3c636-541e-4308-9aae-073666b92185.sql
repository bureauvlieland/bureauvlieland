-- 1. Pricing structures with effective dates
CREATE TABLE public.pricing_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  label text NOT NULL,
  value jsonb NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (key, effective_from)
);

GRANT SELECT ON public.pricing_structures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_structures TO authenticated;
GRANT ALL ON public.pricing_structures TO service_role;

ALTER TABLE public.pricing_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing structures"
  ON public.pricing_structures FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert pricing structures"
  ON public.pricing_structures FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pricing structures"
  ON public.pricing_structures FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete pricing structures"
  ON public.pricing_structures FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_pricing_structures_updated_at
  BEFORE UPDATE ON public.pricing_structures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pricing_structures_key_effective
  ON public.pricing_structures (key, effective_from DESC);

-- 2. Seed the new structure, active from today
INSERT INTO public.pricing_structures (key, label, value, effective_from) VALUES
  ('coordination_fee', 'Organisatiefee staffels', '{
     "tiers": [
       {"min_people": 1, "max_people": 10, "base": 175},
       {"min_people": 11, "max_people": 25, "base": 250},
       {"min_people": 26, "max_people": 50, "base": 395},
       {"min_people": 51, "max_people": 100, "base": 595},
       {"min_people": 101, "max_people": 150, "base": 895},
       {"min_people": 151, "max_people": 999999, "base": 1250}
     ],
     "extra_day_pct": 60
   }'::jsonb, CURRENT_DATE),
  ('revision_fee', 'Wijzigingsfee per ronde', '{"amount": 95}'::jsonb, CURRENT_DATE),
  ('rush_surcharge', 'Spoedtoeslag', '{"pct": 25, "weeks": 4}'::jsonb, CURRENT_DATE),
  ('central_invoicing_surcharge', 'Opslag centrale facturatie', '{"pct": 3, "minimum": 75}'::jsonb, CURRENT_DATE);

-- 3. Snapshot column on projects
ALTER TABLE public.program_requests ADD COLUMN fee_snapshot jsonb;

COMMENT ON COLUMN public.program_requests.fee_snapshot IS
  'Vastgelegde feestructuur op moment van aanmaak. Legacy-projecten houden model=legacy.';

-- Backfill: existing projects keep the old model (flat tiers + EUR 2.50 p.p.)
UPDATE public.program_requests
SET fee_snapshot = jsonb_build_object(
  'model', 'legacy',
  'snapshot_at', COALESCE(created_at, now()),
  'coordination_fee', jsonb_build_object(
    'legacy_tiers', jsonb_build_array(
      jsonb_build_object('maxPeople', 10, 'fee', 150),
      jsonb_build_object('maxPeople', 25, 'fee', 200),
      jsonb_build_object('maxPeople', 100, 'fee', 250),
      jsonb_build_object('maxPeople', 150, 'fee', 400),
      jsonb_build_object('maxPeople', 999999, 'fee', 500)
    ),
    'extra_day_pct', 0
  ),
  'revision_fee', jsonb_build_object('amount', 0),
  'rush_surcharge', jsonb_build_object('pct', 0, 'weeks', 0, 'applies', false),
  'central_invoicing_surcharge', jsonb_build_object('mode', 'per_person', 'per_person', 2.50)
)
WHERE fee_snapshot IS NULL;

-- 4. Revision rounds
CREATE TABLE public.program_revision_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.program_requests(id) ON DELETE CASCADE,
  round integer NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  billable boolean NOT NULL DEFAULT false,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, round)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_revision_charges TO authenticated;
GRANT ALL ON public.program_revision_charges TO service_role;

ALTER TABLE public.program_revision_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage revision charges"
  ON public.program_revision_charges FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_program_revision_charges_updated_at
  BEFORE UPDATE ON public.program_revision_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_program_revision_charges_request ON public.program_revision_charges (request_id);