-- Eén verkoopreeks per jaar voor alle verkoopfacturen (docs/nummering.md).
--
-- Tot nu toe kreeg een klantfactuur FV-BV-JJMM-NNNN-TTT (negentien tekens,
-- in de browser bedacht door bestaande facturen te tellen) en een
-- commissiefactuur BVC-JJMM-NNNN uit een maandreeks. Vanaf nu:
--
--   * één reeks per jaar, alleen cijfers: JJNNNN (260041 = jaar 26, nr 41);
--   * klantfacturen én commissiefacturen putten uit dezelfde reeks;
--   * het nummer wordt in de database toegekend, in één transactie met de
--     factuur, dus nooit twee keer hetzelfde en geen gat door een weggegooid
--     concept;
--   * het dossiernummer (BV-JJMM-NNNN) blijft bestaan als apart veld, de
--     factuur draagt het niet meer in zijn nummer.
--
-- Bestaande nummers worden nooit hernummerd.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) De reeks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_invoice_sequences (
  year       text PRIMARY KEY,           -- 'JJ'
  last_seq   integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.sales_invoice_sequences IS
  'Verkoopreeks per jaar (JJNNNN) voor bureau_invoices en commission_invoices. Alleen next_sales_invoice_number() schrijft hier.';

ALTER TABLE public.sales_invoice_sequences ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.sales_invoice_sequences TO authenticated;
DROP POLICY IF EXISTS "Admins can view sales invoice sequences" ON public.sales_invoice_sequences;
CREATE POLICY "Admins can view sales invoice sequences"
  ON public.sales_invoice_sequences FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Doorlopen op nummers die al in het nieuwe formaat bestaan (handmatig
-- ingevoerd of uit een eerdere poging).
INSERT INTO public.sales_invoice_sequences (year, last_seq)
SELECT substring(n from '^(\d{2})\d{4,}$'), max(substring(n from '^\d{2}(\d{4,})$')::integer)
  FROM (
    SELECT invoice_number AS n FROM public.bureau_invoices
    UNION ALL
    SELECT invoice_number FROM public.commission_invoices WHERE invoice_number IS NOT NULL
  ) s
 WHERE n ~ '^\d{6,}$'
 GROUP BY 1
ON CONFLICT (year) DO UPDATE
   SET last_seq = GREATEST(sales_invoice_sequences.last_seq, EXCLUDED.last_seq);

CREATE OR REPLACE FUNCTION public.next_sales_invoice_number(p_date date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year   text := to_char(COALESCE(p_date, CURRENT_DATE), 'YY');
  v_seq    integer;
  v_number text;
BEGIN
  -- INSERT ... ON CONFLICT DO UPDATE vergrendelt de rij van dit jaar, dus
  -- twee gelijktijdige registraties krijgen nooit hetzelfde nummer.
  LOOP
    INSERT INTO sales_invoice_sequences (year, last_seq)
    VALUES (v_year, 1)
    ON CONFLICT (year) DO UPDATE
       SET last_seq = sales_invoice_sequences.last_seq + 1,
           updated_at = now()
    RETURNING last_seq INTO v_seq;

    v_number := v_year || lpad(v_seq::text, 4, '0');
    -- Vangnet voor een reeks die achterloopt op handmatig ingevoerde nummers.
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bureau_invoices WHERE invoice_number = v_number)
         AND NOT EXISTS (SELECT 1 FROM commission_invoices WHERE invoice_number = v_number);
  END LOOP;
  RETURN v_number;
END;
$$;
REVOKE ALL ON FUNCTION public.next_sales_invoice_number(date) FROM PUBLIC, anon, authenticated;

-- Commissiefacturen putten uit dezelfde reeks. finalize_commission_invoice en
-- credit_commission_invoice roepen deze functie aan; de handtekening blijft.
CREATE OR REPLACE FUNCTION public.next_commission_invoice_number(p_date date)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.next_sales_invoice_number(p_date);
$$;
REVOKE ALL ON FUNCTION public.next_commission_invoice_number(date) FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.commission_invoice_sequences IS
  'Oude maandreeks BVC-JJMM-NNNN; sinds 2026-11 niet meer gebruikt (zie sales_invoice_sequences). Bewaard voor de historie.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Een factuurnummer is uniek. Bestaan er al dubbele nummers, dan wordt
--    de index overgeslagen met een waarschuwing: de data eerst opschonen.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_dups text;
BEGIN
  SELECT string_agg(invoice_number, ', ') INTO v_dups
    FROM (SELECT invoice_number FROM public.bureau_invoices GROUP BY 1 HAVING count(*) > 1) d;
  IF v_dups IS NOT NULL THEN
    RAISE WARNING 'bureau_invoices heeft dubbele factuurnummers (%); unieke index niet aangemaakt', v_dups;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS bureau_invoices_invoice_number_key
      ON public.bureau_invoices (invoice_number);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Klantfactuur registreren: nummer, kop en regels in één transactie.
--    p_header: request_id, invoice_date, amount_excl_vat, vat_amount,
--              invoice_type, description, invoice_number (optioneel: alleen
--              om een elders gemaakte factuur met haar eigen nummer vast te
--              leggen; leeg = volgende uit de reeks).
--    p_lines:  rijen voor bureau_invoice_lines zonder invoice_id. De tekst
--              '{{nummer}}' in description/sub_description wordt vervangen
--              door het toegekende nummer.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.register_bureau_invoice(
  p_header jsonb,
  p_lines jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (id uuid, invoice_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid := (p_header->>'request_id')::uuid;
  v_date       date := COALESCE((p_header->>'invoice_date')::date, CURRENT_DATE);
  v_number     text := NULLIF(trim(p_header->>'invoice_number'), '');
  v_type       text := COALESCE(NULLIF(p_header->>'invoice_type', ''), 'partial');
  v_id         uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen beheerders registreren facturen' USING ERRCODE = '42501';
  END IF;
  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'request_id ontbreekt';
  END IF;
  IF v_type NOT IN ('partial', 'final', 'credit') THEN
    RAISE EXCEPTION 'Onbekend factuurtype: %', v_type;
  END IF;

  IF v_number IS NULL THEN
    v_number := public.next_sales_invoice_number(v_date);
  ELSIF EXISTS (SELECT 1 FROM bureau_invoices b WHERE b.invoice_number = v_number) THEN
    RAISE EXCEPTION 'Factuurnummer % bestaat al', v_number USING ERRCODE = '23505';
  END IF;

  INSERT INTO bureau_invoices (request_id, invoice_number, invoice_date, amount_excl_vat, vat_amount, invoice_type, description, created_by)
  VALUES (
    v_request_id,
    v_number,
    v_date,
    COALESCE((p_header->>'amount_excl_vat')::numeric, 0),
    COALESCE((p_header->>'vat_amount')::numeric, 0),
    v_type,
    NULLIF(p_header->>'description', ''),
    auth.uid()
  )
  RETURNING bureau_invoices.id INTO v_id;

  IF p_lines IS NOT NULL AND jsonb_typeof(p_lines) = 'array' AND jsonb_array_length(p_lines) > 0 THEN
    INSERT INTO bureau_invoice_lines (
      invoice_id, sort_order, kind, section, item_id, description, sub_description,
      quantity, quantity_label, unit_price_excl_vat, unit_suffix, vat_rate,
      amount_excl_vat, vat_amount, amount_incl_vat
    )
    SELECT
      v_id,
      COALESCE(l.sort_order, ord::integer - 1),
      COALESCE(l.kind, 'item'),
      COALESCE(l.section, ''),
      l.item_id,
      replace(COALESCE(l.description, ''), '{{nummer}}', v_number),
      replace(l.sub_description, '{{nummer}}', v_number),
      COALESCE(l.quantity, 1),
      l.quantity_label,
      COALESCE(l.unit_price_excl_vat, 0),
      COALESCE(l.unit_suffix, ''),
      COALESCE(l.vat_rate, 21),
      COALESCE(l.amount_excl_vat, 0),
      COALESCE(l.vat_amount, 0),
      COALESCE(l.amount_incl_vat, 0)
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS e(elem, ord)
    CROSS JOIN LATERAL jsonb_to_record(e.elem) AS l(
      sort_order integer, kind text, section text, item_id uuid, description text,
      sub_description text, quantity numeric, quantity_label text,
      unit_price_excl_vat numeric, unit_suffix text, vat_rate numeric,
      amount_excl_vat numeric, vat_amount numeric, amount_incl_vat numeric
    );
  END IF;

  RETURN QUERY SELECT v_id, v_number;
END;
$$;
REVOKE ALL ON FUNCTION public.register_bureau_invoice(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_bureau_invoice(jsonb, jsonb) TO authenticated;
