
CREATE OR REPLACE FUNCTION public.sanitize_anon_program_request_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'anon' THEN
    -- Pricing & commission are admin-only concerns
    NEW.admin_price_override := NULL;
    NEW.commission_percentage := NULL;
    -- Re-derive provider attribution from the referenced building block when present
    IF NEW.block_id IS NOT NULL THEN
      SELECT bb.provider_id,
             COALESCE(p.name, bb.provider_id, 'Bureau Vlieland'),
             p.email,
             COALESCE(bb.block_type, NEW.block_type)
        INTO NEW.provider_id, NEW.provider_name, NEW.provider_email, NEW.block_type
      FROM public.building_blocks bb
      LEFT JOIN public.partners p ON p.id = bb.provider_id
      WHERE bb.id = NEW.block_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_anon_program_request_item_trg ON public.program_request_items;
CREATE TRIGGER sanitize_anon_program_request_item_trg
BEFORE INSERT ON public.program_request_items
FOR EACH ROW EXECUTE FUNCTION public.sanitize_anon_program_request_item();

CREATE OR REPLACE FUNCTION public.sanitize_anon_program_request_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.role()) = 'anon' THEN
    NEW.actor := 'customer';
    NEW.actor_name := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_anon_program_request_history_trg ON public.program_request_history;
CREATE TRIGGER sanitize_anon_program_request_history_trg
BEFORE INSERT ON public.program_request_history
FOR EACH ROW EXECUTE FUNCTION public.sanitize_anon_program_request_history();
