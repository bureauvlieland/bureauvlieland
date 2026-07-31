ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS commission_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_exempt_reason text,
  ADD COLUMN IF NOT EXISTS commission_exempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_exempt_by uuid;

ALTER TABLE public.accommodation_quotes
  ADD COLUMN IF NOT EXISTS commission_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_exempt_reason text,
  ADD COLUMN IF NOT EXISTS commission_exempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_exempt_by uuid;

ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS commission_exempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_exempt_by uuid;

-- Partners mogen commissievrij-velden nooit zelf zetten.
CREATE OR REPLACE FUNCTION public.guard_commission_exempt_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.commission_exempt, false) IS DISTINCT FROM COALESCE(OLD.commission_exempt, false)
     OR NEW.commission_exempt_reason IS DISTINCT FROM OLD.commission_exempt_reason
     OR NEW.commission_exempt_at IS DISTINCT FROM OLD.commission_exempt_at
     OR NEW.commission_exempt_by IS DISTINCT FROM OLD.commission_exempt_by THEN
    RAISE EXCEPTION 'Commissievrij-velden kunnen alleen door een beheerder worden aangepast';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_commission_exempt_items ON public.program_request_items;
CREATE TRIGGER trg_guard_commission_exempt_items
  BEFORE UPDATE ON public.program_request_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_commission_exempt_fields();

DROP TRIGGER IF EXISTS trg_guard_commission_exempt_quotes ON public.accommodation_quotes;
CREATE TRIGGER trg_guard_commission_exempt_quotes
  BEFORE UPDATE ON public.accommodation_quotes
  FOR EACH ROW EXECUTE FUNCTION public.guard_commission_exempt_fields();

DROP TRIGGER IF EXISTS trg_guard_commission_exempt_invoices ON public.partner_purchase_invoices;
CREATE TRIGGER trg_guard_commission_exempt_invoices
  BEFORE UPDATE ON public.partner_purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_commission_exempt_fields();