-- Fase 1 van docs/plan-proforma-factuur.md: de proforma bestaat.
--
-- De proforma is de klantfactuur in wording: bij akkoord ontstaat uit de
-- offerte één concept met eigen regels, dat daarna het werkdocument wordt
-- waarop offerte en inkoop samenkomen (fase 2). In fase 1 loopt hij parallel
-- aan de bestaande berekening en worden totalen vergeleken.
--
-- Eigen tabellen in plaats van een status 'concept' op bureau_invoices:
-- alles wat bureau_invoices leest (voltooiingsstatus, facturatiepagina,
-- bankmatching, Snelstart, dashboard) telt elke rij als geregistreerde
-- factuur. Een concept ernaast zou op al die plekken een filter vragen; een
-- eigen tabel vraagt dat nergens. De regels hebben dezelfde kolommen als
-- bureau_invoice_lines, zodat voorbeeld, PDF en (in fase 3) registreren
-- dezelfde regels gebruiken.

-- ---------------------------------------------------------------------------
-- 1. Proforma (kop): één per project
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_proformas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.program_requests(id) ON DELETE CASCADE,
  -- concept | registered (fase 3: bevroren tot bureau_invoices)
  status text NOT NULL DEFAULT 'concept',
  -- Moment waarop de offerte voor deze proforma is bevroren.
  accepted_at timestamptz NOT NULL DEFAULT now(),
  registered_invoice_id uuid REFERENCES public.bureau_invoices(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_proformas_status_check CHECK (status IN ('concept', 'registered'))
);

COMMENT ON TABLE public.project_proformas IS
  'Klantfactuur in wording per project (docs/plan-proforma-factuur.md). Eén concept per project; ontstaat bij akkoord uit projectInvoiceSpec.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_proformas_one_concept
  ON public.project_proformas(request_id)
  WHERE status = 'concept';

CREATE INDEX IF NOT EXISTS idx_project_proformas_request
  ON public.project_proformas(request_id);

ALTER TABLE public.project_proformas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_proformas TO authenticated;
GRANT ALL ON public.project_proformas TO service_role;

DROP POLICY IF EXISTS "Admins beheren proforma's" ON public.project_proformas;
CREATE POLICY "Admins beheren proforma's"
  ON public.project_proformas
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_project_proformas_updated_at ON public.project_proformas;
CREATE TRIGGER update_project_proformas_updated_at
  BEFORE UPDATE ON public.project_proformas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. Proformaregels: dezelfde kolommen als bureau_invoice_lines, plus herkomst
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_proforma_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proforma_id uuid NOT NULL REFERENCES public.project_proformas(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  -- Zoals bureau_invoice_lines.kind: item, item_group, sub, cost, lodging, lodging_extra, fee, revision
  kind text NOT NULL DEFAULT 'item',
  section text NOT NULL DEFAULT '',
  item_id uuid REFERENCES public.program_request_items(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  sub_description text,
  quantity numeric NOT NULL DEFAULT 1,
  quantity_label text,
  unit_price_excl_vat numeric NOT NULL DEFAULT 0,
  unit_suffix text NOT NULL DEFAULT '',
  vat_rate numeric NOT NULL DEFAULT 21,
  amount_excl_vat numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  amount_incl_vat numeric NOT NULL DEFAULT 0,

  -- Herkomst (plan §4)
  -- quote_item | lodging | fee | purchase_line | post_charge | manual
  origin text NOT NULL DEFAULT 'quote_item',
  -- active | replaced | hidden
  line_status text NOT NULL DEFAULT 'active',
  -- Sleutel van de specificatieregel (item:<id>, lodging:<id>, fee:<key>, …)
  -- waarmee de volg-logica een regel terugvindt; leeg voor handmatige regels.
  line_key text,
  replaces_line_id uuid REFERENCES public.project_proforma_lines(id) ON DELETE SET NULL,
  hidden_reason text,
  purchase_invoice_line_id uuid REFERENCES public.purchase_invoice_lines(id) ON DELETE RESTRICT,
  purchase_invoice_id uuid REFERENCES public.partner_purchase_invoices(id) ON DELETE RESTRICT,
  accommodation_quote_id uuid REFERENCES public.accommodation_quotes(id) ON DELETE SET NULL,
  fee_key text,
  -- Offertebedrag van dit moment (volgt de offerte zolang de regel uit de offerte komt).
  quote_amount_incl_vat numeric,
  -- Offertebedrag bij het eerste bevriezen; verandert nooit meer.
  accepted_amount_incl_vat numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_proforma_lines_origin_check
    CHECK (origin IN ('quote_item', 'lodging', 'fee', 'purchase_line', 'post_charge', 'manual')),
  CONSTRAINT project_proforma_lines_status_check
    CHECK (line_status IN ('active', 'replaced', 'hidden'))
);

COMMENT ON TABLE public.project_proforma_lines IS
  'Regels van de proforma. origin: waar de regel vandaan komt; line_status: active telt mee, replaced is vervangen door inkoopregels (doorgestreept), hidden telt niet mee.';

CREATE INDEX IF NOT EXISTS idx_project_proforma_lines_proforma
  ON public.project_proforma_lines(proforma_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_proforma_lines_purchase_line
  ON public.project_proforma_lines(purchase_invoice_line_id)
  WHERE purchase_invoice_line_id IS NOT NULL;

ALTER TABLE public.project_proforma_lines ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_proforma_lines TO authenticated;
GRANT ALL ON public.project_proforma_lines TO service_role;

DROP POLICY IF EXISTS "Admins beheren proformaregels" ON public.project_proforma_lines;
CREATE POLICY "Admins beheren proformaregels"
  ON public.project_proforma_lines
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_project_proforma_lines_updated_at ON public.project_proforma_lines;
CREATE TRIGGER update_project_proforma_lines_updated_at
  BEFORE UPDATE ON public.project_proforma_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Een geregistreerde proforma is bevroren (fase 3 zet de status; de grendel staat er nu al).
CREATE OR REPLACE FUNCTION public.guard_project_proforma_lines_frozen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_proforma_id uuid := COALESCE(NEW.proforma_id, OLD.proforma_id);
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.project_proformas WHERE id = v_proforma_id;
  IF v_status = 'registered' THEN
    RAISE EXCEPTION 'De regels van een geregistreerde proforma zijn bevroren.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_project_proforma_lines_frozen ON public.project_proforma_lines;
CREATE TRIGGER trg_project_proforma_lines_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON public.project_proforma_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_project_proforma_lines_frozen();
