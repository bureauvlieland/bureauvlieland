-- Snapshot de actieve prijsstructuur bij het aanmaken van een project, zodat
-- lopende offertes en facturen nooit van bedrag veranderen als de tarieven wijzigen.
CREATE OR REPLACE FUNCTION public.snapshot_fee_structure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coordination jsonb;
  v_revision jsonb;
  v_rush jsonb;
  v_central jsonb;
  v_rush_weeks numeric;
  v_arrival date;
  v_applies boolean := false;
BEGIN
  IF NEW.fee_snapshot IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_coordination FROM public.pricing_structures
   WHERE key = 'coordination_fee' AND effective_from <= CURRENT_DATE
   ORDER BY effective_from DESC LIMIT 1;
  SELECT value INTO v_revision FROM public.pricing_structures
   WHERE key = 'revision_fee' AND effective_from <= CURRENT_DATE
   ORDER BY effective_from DESC LIMIT 1;
  SELECT value INTO v_rush FROM public.pricing_structures
   WHERE key = 'rush_surcharge' AND effective_from <= CURRENT_DATE
   ORDER BY effective_from DESC LIMIT 1;
  SELECT value INTO v_central FROM public.pricing_structures
   WHERE key = 'central_invoicing_surcharge' AND effective_from <= CURRENT_DATE
   ORDER BY effective_from DESC LIMIT 1;

  IF v_coordination IS NULL THEN
    RETURN NEW;
  END IF;

  v_rush_weeks := COALESCE((v_rush->>'weeks')::numeric, 0);
  BEGIN
    v_arrival := (NEW.selected_dates)[1]::date;
  EXCEPTION WHEN others THEN
    v_arrival := NULL;
  END;

  IF v_rush_weeks > 0 AND v_arrival IS NOT NULL THEN
    v_applies := v_arrival >= CURRENT_DATE
      AND v_arrival <= CURRENT_DATE + (v_rush_weeks * 7)::int;
  END IF;

  NEW.fee_snapshot := jsonb_build_object(
    'model', 'tiered_v2',
    'snapshot_at', now(),
    'coordination_fee', v_coordination,
    'revision_fee', COALESCE(v_revision, jsonb_build_object('amount', 0)),
    'rush_surcharge', COALESCE(v_rush, jsonb_build_object('pct', 0, 'weeks', 0)) || jsonb_build_object('applies', v_applies),
    'central_invoicing_surcharge', COALESCE(v_central, jsonb_build_object('mode', 'percentage', 'pct', 0, 'minimum', 0))
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_fee_structure ON public.program_requests;
CREATE TRIGGER trg_snapshot_fee_structure
BEFORE INSERT ON public.program_requests
FOR EACH ROW EXECUTE FUNCTION public.snapshot_fee_structure();