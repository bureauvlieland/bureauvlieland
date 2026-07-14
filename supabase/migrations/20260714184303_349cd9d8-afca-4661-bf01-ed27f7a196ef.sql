
-- 1. Uitbreiding program_request_items
ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS is_custom_quote boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_briefing text;

-- 2. Nieuwe tabel voor offerteregels
CREATE TABLE public.program_request_item_quote_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid NOT NULL REFERENCES public.program_request_items(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text,
  unit_price_incl_vat numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 21,
  created_by_partner_id text REFERENCES public.partners(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_lines_item ON public.program_request_item_quote_lines(item_id);

-- 3. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_request_item_quote_lines TO authenticated;
GRANT ALL ON public.program_request_item_quote_lines TO service_role;

-- 4. RLS
ALTER TABLE public.program_request_item_quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all quote lines"
  ON public.program_request_item_quote_lines
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Partners view own item quote lines"
  ON public.program_request_item_quote_lines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_request_items i
      WHERE i.id = program_request_item_quote_lines.item_id
        AND i.provider_id = public.get_partner_id(auth.uid())
    )
  );

CREATE POLICY "Partners insert own item quote lines"
  ON public.program_request_item_quote_lines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_request_items i
      WHERE i.id = program_request_item_quote_lines.item_id
        AND i.provider_id = public.get_partner_id(auth.uid())
    )
  );

CREATE POLICY "Partners update own item quote lines"
  ON public.program_request_item_quote_lines
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_request_items i
      WHERE i.id = program_request_item_quote_lines.item_id
        AND i.provider_id = public.get_partner_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.program_request_items i
      WHERE i.id = program_request_item_quote_lines.item_id
        AND i.provider_id = public.get_partner_id(auth.uid())
    )
  );

CREATE POLICY "Partners delete own item quote lines"
  ON public.program_request_item_quote_lines
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.program_request_items i
      WHERE i.id = program_request_item_quote_lines.item_id
        AND i.provider_id = public.get_partner_id(auth.uid())
    )
  );

-- 5. updated_at trigger
CREATE TRIGGER trg_quote_lines_updated_at
  BEFORE UPDATE ON public.program_request_item_quote_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Trigger: herbereken quoted_price op item bij mutatie van regels
CREATE OR REPLACE FUNCTION public.recalc_item_quoted_price_from_lines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_id uuid;
  v_total numeric;
BEGIN
  v_item_id := COALESCE(NEW.item_id, OLD.item_id);
  SELECT COALESCE(SUM(quantity * unit_price_incl_vat), 0)
    INTO v_total
    FROM public.program_request_item_quote_lines
    WHERE item_id = v_item_id;

  UPDATE public.program_request_items
    SET quoted_price = CASE WHEN v_total > 0 THEN v_total ELSE NULL END
    WHERE id = v_item_id
      AND is_custom_quote = true;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_item_price_after_line_change
  AFTER INSERT OR UPDATE OR DELETE ON public.program_request_item_quote_lines
  FOR EACH ROW EXECUTE FUNCTION public.recalc_item_quoted_price_from_lines();
