-- Commissies fase 2 (deel 2): de factuur een levenscyclus geven
-- (docs/plan-commissiefacturen.md §4, besluit 4 en fase 2).
--
--  * Een concept heeft géén factuurnummer. Het nummer wordt pas uitgegeven bij
--    "Definitief maken", uit een echte reeks per maand (BVC-JJMM-NNNN) met een
--    rijvergrendeling, in plaats van MAX+1 bij het aanmaken van het concept.
--    Zo blijft de reeks aaneengesloten, ook als concepten worden weggegooid.
--  * Statussen: draft → final → sent → forwarded → paid, plus credited (later).
--  * Concept opslaan, definitief maken en concept verwijderen zijn
--    databasefuncties, zodat kop, regels, bronnen en nummer in één transactie
--    veranderen. Een edge function kan dat niet (geen transacties via
--    supabase-js); daarom hier in plaats van in een aparte function.
--  * Guards: een definitieve factuur kan niet worden verwijderd en haar
--    regels, bedragen en nummer kunnen niet meer veranderen. Fout → creditnota.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Concept zonder nummer
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.commission_invoices ALTER COLUMN invoice_number DROP NOT NULL;

-- De oude MAX+1-trigger bij INSERT gaat weg: het nummer komt voortaan uit
-- next_commission_invoice_number() bij definitief maken.
DROP TRIGGER IF EXISTS trg_commission_invoices_number ON public.commission_invoices;
DROP FUNCTION IF EXISTS public.generate_commission_invoice_number();

ALTER TABLE public.commission_invoices
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid;

-- Bestaande concepten (nooit verstuurd) leveren hun nummer in; ze krijgen er
-- een bij definitief maken. De reeks hieronder wordt gevuld uit de nummers
-- die overblijven, dus die van echt verstuurde facturen.
UPDATE public.commission_invoices
   SET invoice_number = NULL
 WHERE status = 'draft'
   AND sent_at IS NULL
   AND forwarded_to_accounting_at IS NULL
   AND paid_at IS NULL;

ALTER TABLE public.commission_invoices
  DROP CONSTRAINT IF EXISTS commission_invoices_status_check;
ALTER TABLE public.commission_invoices
  ADD CONSTRAINT commission_invoices_status_check
  CHECK (status IN ('draft', 'final', 'sent', 'forwarded', 'paid', 'credited'));

-- Alles wat geen concept is, heeft een nummer.
ALTER TABLE public.commission_invoices
  DROP CONSTRAINT IF EXISTS commission_invoices_number_when_final_check;
ALTER TABLE public.commission_invoices
  ADD CONSTRAINT commission_invoices_number_when_final_check
  CHECK (status = 'draft' OR invoice_number IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Nummerreeks per maand
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commission_invoice_sequences (
  year_month text PRIMARY KEY,          -- 'JJMM'
  last_seq   integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_invoice_sequences ENABLE ROW LEVEL SECURITY;
-- Alleen next_commission_invoice_number() schrijft hier; admins mogen de
-- stand van de reeks zien.
GRANT SELECT ON public.commission_invoice_sequences TO authenticated;
DROP POLICY IF EXISTS "Admins can view commission invoice sequences" ON public.commission_invoice_sequences;
CREATE POLICY "Admins can view commission invoice sequences"
  ON public.commission_invoice_sequences FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Vullen uit de nummers die al zijn uitgegeven, zodat de reeks doorloopt.
INSERT INTO public.commission_invoice_sequences (year_month, last_seq)
SELECT substring(invoice_number from '^BVC-(\d{4})-\d{4}$'),
       max(substring(invoice_number from '^BVC-\d{4}-(\d{4})$')::integer)
  FROM public.commission_invoices
 WHERE invoice_number ~ '^BVC-\d{4}-\d{4}$'
 GROUP BY 1
ON CONFLICT (year_month) DO UPDATE
   SET last_seq = GREATEST(commission_invoice_sequences.last_seq, EXCLUDED.last_seq);

CREATE OR REPLACE FUNCTION public.next_commission_invoice_number(p_date date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ym     text := to_char(COALESCE(p_date, CURRENT_DATE), 'YYMM');
  v_seq    integer;
  v_number text;
BEGIN
  -- INSERT ... ON CONFLICT DO UPDATE vergrendelt de rij van deze maand, dus
  -- twee gelijktijdige "Definitief maken" krijgen nooit hetzelfde nummer.
  LOOP
    INSERT INTO commission_invoice_sequences (year_month, last_seq)
    VALUES (v_ym, 1)
    ON CONFLICT (year_month) DO UPDATE
       SET last_seq = commission_invoice_sequences.last_seq + 1,
           updated_at = now()
    RETURNING last_seq INTO v_seq;

    v_number := 'BVC-' || v_ym || '-' || lpad(v_seq::text, 4, '0');
    -- Vangnet voor een reeks die achterloopt op handmatig ingevoerde nummers.
    EXIT WHEN NOT EXISTS (SELECT 1 FROM commission_invoices WHERE invoice_number = v_number);
  END LOOP;
  RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.next_commission_invoice_number(date) FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Concept opslaan (nieuw of bestaand): kop, regels, totalen en koppeling
--    van losse inkoopfacturen in één transactie. De server rekent de
--    regelbedragen en de totalen zelf uit (per regel afronden, dan optellen;
--    dezelfde regel als calculateCommissionInvoiceTotals in de frontend).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.save_commission_invoice_draft(
  p_invoice_id uuid,
  p_header jsonb,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id         uuid;
  v_status     text;
  v_partner_id text;
  v_vat_rate   numeric;
  v_excl       numeric;
  v_vat        numeric;
  v_conflict   text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen admins kunnen commissiefacturen opslaan'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Een commissiefactuur heeft minimaal één regel';
  END IF;

  v_partner_id := NULLIF(p_header->>'partner_id', '');
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Partner ontbreekt';
  END IF;
  v_vat_rate := COALESCE(NULLIF(p_header->>'vat_rate', '')::numeric, 21);

  IF p_invoice_id IS NULL THEN
    INSERT INTO commission_invoices (
      partner_id, invoice_date, due_date,
      recipient_name, recipient_email, recipient_address_street,
      recipient_address_postal, recipient_address_city, recipient_kvk_number,
      notes, status, vat_rate, created_by
    ) VALUES (
      v_partner_id,
      COALESCE(NULLIF(p_header->>'invoice_date', '')::date, CURRENT_DATE),
      NULLIF(p_header->>'due_date', '')::date,
      COALESCE(NULLIF(p_header->>'recipient_name', ''), ''),
      NULLIF(p_header->>'recipient_email', ''),
      NULLIF(p_header->>'recipient_address_street', ''),
      NULLIF(p_header->>'recipient_address_postal', ''),
      NULLIF(p_header->>'recipient_address_city', ''),
      NULLIF(p_header->>'recipient_kvk_number', ''),
      NULLIF(p_header->>'notes', ''),
      'draft', v_vat_rate, auth.uid()
    )
    RETURNING id INTO v_id;
  ELSE
    SELECT id, status INTO v_id, v_status
      FROM commission_invoices WHERE id = p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Commissiefactuur niet gevonden';
    END IF;
    IF v_status <> 'draft' THEN
      RAISE EXCEPTION 'Alleen een concept kan worden bewerkt (status: %)', v_status;
    END IF;

    UPDATE commission_invoices
       SET partner_id = v_partner_id,
           invoice_date = COALESCE(NULLIF(p_header->>'invoice_date', '')::date, invoice_date),
           due_date = COALESCE(NULLIF(p_header->>'due_date', '')::date, due_date),
           recipient_name = COALESCE(NULLIF(p_header->>'recipient_name', ''), recipient_name),
           recipient_email = NULLIF(p_header->>'recipient_email', ''),
           recipient_address_street = NULLIF(p_header->>'recipient_address_street', ''),
           recipient_address_postal = NULLIF(p_header->>'recipient_address_postal', ''),
           recipient_address_city = NULLIF(p_header->>'recipient_address_city', ''),
           recipient_kvk_number = NULLIF(p_header->>'recipient_kvk_number', ''),
           notes = NULLIF(p_header->>'notes', ''),
           vat_rate = v_vat_rate
     WHERE id = v_id;

    -- Oude koppelingen van losse inkoopfacturen losmaken; hieronder komen de
    -- nieuwe. Alleen zolang ze niet al als gefactureerd zijn gemarkeerd.
    UPDATE partner_purchase_invoices
       SET commission_invoice_id = NULL
     WHERE commission_invoice_id = v_id
       AND commission_invoiced_at IS NULL;

    DELETE FROM commission_invoice_lines WHERE invoice_id = v_id;
  END IF;

  -- Dubbel factureren voorkomen: een bron mag maar op één levende factuur staan.
  SELECT string_agg(DISTINCT COALESCE(l.block_name, ''), ', ')
    INTO v_conflict
    FROM jsonb_array_elements(p_lines) AS t(j)
    JOIN commission_invoice_lines l
      ON l.item_id = NULLIF(t.j->>'item_id', '')::uuid
      OR l.quote_id = NULLIF(t.j->>'quote_id', '')::uuid
      OR l.purchase_invoice_id = NULLIF(t.j->>'purchase_invoice_id', '')::uuid
    JOIN commission_invoices ci ON ci.id = l.invoice_id
   WHERE ci.id <> v_id
     AND ci.status <> 'credited';
  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Staat al op een andere commissiefactuur: %', v_conflict;
  END IF;

  INSERT INTO commission_invoice_lines (
    invoice_id, item_id, quote_id, purchase_invoice_id, commission_basis,
    item_type, block_name, customer_label, event_date, reference_number,
    invoiced_amount_excl_vat, commission_percentage, commission_amount,
    description, sort_order
  )
  SELECT v_id,
         NULLIF(j->>'item_id', '')::uuid,
         NULLIF(j->>'quote_id', '')::uuid,
         NULLIF(j->>'purchase_invoice_id', '')::uuid,
         NULLIF(j->>'commission_basis', ''),
         COALESCE(NULLIF(j->>'item_type', ''), 'activity'),
         COALESCE(j->>'block_name', ''),
         NULLIF(j->>'customer_label', ''),
         NULLIF(j->>'event_date', '')::date,
         NULLIF(j->>'reference_number', ''),
         ROUND(COALESCE(NULLIF(j->>'invoiced_amount_excl_vat', '')::numeric, 0), 2),
         COALESCE(NULLIF(j->>'commission_percentage', '')::numeric, 0),
         ROUND(
           ROUND(COALESCE(NULLIF(j->>'invoiced_amount_excl_vat', '')::numeric, 0), 2)
           * COALESCE(NULLIF(j->>'commission_percentage', '')::numeric, 0) / 100.0,
           2
         ),
         NULLIF(j->>'description', ''),
         (ord - 1)::integer
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS t(j, ord);

  IF EXISTS (
    SELECT 1 FROM commission_invoice_lines
     WHERE invoice_id = v_id
       AND item_id IS NULL AND quote_id IS NULL AND purchase_invoice_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Elke regel hoort bij een onderdeel, logies-offerte of inkoopfactuur';
  END IF;

  -- Totalen uit de opgeslagen regels: de som van afgeronde centen.
  SELECT COALESCE(SUM(commission_amount), 0) INTO v_excl
    FROM commission_invoice_lines WHERE invoice_id = v_id;
  v_vat := ROUND(v_excl * v_vat_rate / 100.0, 2);
  UPDATE commission_invoices
     SET amount_excl_vat = v_excl,
         vat_amount = v_vat,
         amount_incl_vat = v_excl + v_vat
   WHERE id = v_id;

  -- Losse inkoopfacturen aan dit concept koppelen (commission_invoiced_at
  -- volgt pas bij definitief maken).
  UPDATE partner_purchase_invoices
     SET commission_invoice_id = v_id
   WHERE id IN (
     SELECT purchase_invoice_id FROM commission_invoice_lines
      WHERE invoice_id = v_id AND purchase_invoice_id IS NOT NULL
   );

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_commission_invoice_draft(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_commission_invoice_draft(uuid, jsonb, jsonb) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Definitief maken: nummer uitgeven, bevriezen, bronnen markeren en
--    grondslag/percentage/bedrag terugschrijven naar het onderdeel.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.finalize_commission_invoice(p_invoice_id uuid)
RETURNS TABLE (id uuid, invoice_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- De uitvoerkolommen heten als tabelkolommen; onbenoemde namen zijn kolommen.
#variable_conflict use_column
DECLARE
  v_inv     commission_invoices%ROWTYPE;
  v_lines   integer;
  v_missing text[] := '{}';
  v_number  text;
  v_excl    numeric;
  v_vat     numeric;
  v_now     timestamptz := now();
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen admins kunnen commissiefacturen definitief maken'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_inv FROM commission_invoices ci WHERE ci.id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commissiefactuur niet gevonden';
  END IF;
  IF v_inv.status <> 'draft' THEN
    RAISE EXCEPTION 'Alleen een concept kan definitief worden gemaakt (status: %)', v_inv.status;
  END IF;

  SELECT count(*) INTO v_lines FROM commission_invoice_lines l WHERE l.invoice_id = p_invoice_id;
  IF v_lines = 0 THEN
    RAISE EXCEPTION 'Een factuur zonder regels kan niet definitief worden gemaakt';
  END IF;

  -- Een factuur moet naam en adres van de ontvanger dragen, en we moeten hem
  -- kunnen versturen.
  IF COALESCE(v_inv.recipient_name, '') = '' THEN v_missing := v_missing || 'naam'; END IF;
  IF COALESCE(v_inv.recipient_email, '') = '' THEN v_missing := v_missing || 'e-mailadres'; END IF;
  IF COALESCE(v_inv.recipient_address_street, '') = '' THEN v_missing := v_missing || 'straat'; END IF;
  IF COALESCE(v_inv.recipient_address_city, '') = '' THEN v_missing := v_missing || 'plaats'; END IF;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Partnergegevens onvolledig: %', array_to_string(v_missing, ', ');
  END IF;

  -- Totalen nog één keer uit de regels, zodat kop en regels altijd kloppen.
  SELECT COALESCE(SUM(l.commission_amount), 0) INTO v_excl
    FROM commission_invoice_lines l WHERE l.invoice_id = p_invoice_id;
  v_vat := ROUND(v_excl * v_inv.vat_rate / 100.0, 2);

  v_number := public.next_commission_invoice_number(v_inv.invoice_date);

  UPDATE commission_invoices ci
     SET invoice_number = v_number,
         status = 'final',
         finalized_at = v_now,
         finalized_by = auth.uid(),
         amount_excl_vat = v_excl,
         vat_amount = v_vat,
         amount_incl_vat = v_excl + v_vat
   WHERE ci.id = p_invoice_id;

  -- Bronnen: gefactureerd, met de bedragen zoals ze op de factuur staan.
  -- Bij meerdere regels per bron (kamer + extra's) is het percentage niet
  -- eenduidig; dan blijft het staan en gaat alleen het bedrag mee.
  UPDATE program_request_items i
     SET commission_status = 'invoiced',
         commission_invoiced_at = v_now,
         commission_amount = s.amount,
         commission_percentage = COALESCE(s.pct, i.commission_percentage),
         commission_basis = COALESCE(s.basis, i.commission_basis)
    FROM (
      SELECT l.item_id,
             SUM(l.commission_amount) AS amount,
             CASE WHEN count(*) = 1 THEN max(l.commission_percentage) END AS pct,
             CASE WHEN count(*) = 1 AND max(l.commission_basis) IN ('purchase', 'sales')
                  THEN max(l.commission_basis) END AS basis
        FROM commission_invoice_lines l
       WHERE l.invoice_id = p_invoice_id AND l.item_id IS NOT NULL
       GROUP BY l.item_id
    ) s
   WHERE i.id = s.item_id;

  UPDATE accommodation_quotes q
     SET commission_status = 'invoiced',
         commission_invoiced_at = v_now,
         commission_amount = s.amount,
         commission_percentage = COALESCE(s.pct, q.commission_percentage)
    FROM (
      SELECT l.quote_id,
             SUM(l.commission_amount) AS amount,
             CASE WHEN count(*) = 1 THEN max(l.commission_percentage) END AS pct
        FROM commission_invoice_lines l
       WHERE l.invoice_id = p_invoice_id AND l.quote_id IS NOT NULL
       GROUP BY l.quote_id
    ) s
   WHERE q.id = s.quote_id;

  UPDATE partner_purchase_invoices p
     SET commission_invoiced_at = v_now,
         commission_invoice_id = p_invoice_id
   WHERE p.id IN (
     SELECT l.purchase_invoice_id FROM commission_invoice_lines l
      WHERE l.invoice_id = p_invoice_id AND l.purchase_invoice_id IS NOT NULL
   );

  RETURN QUERY SELECT p_invoice_id, v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_commission_invoice(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_commission_invoice(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Concept verwijderen: kop en regels weg, bronnen weer vrij.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_commission_invoice_draft(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen admins kunnen conceptfacturen verwijderen'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT status INTO v_status FROM commission_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commissiefactuur niet gevonden';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Alleen een concept kan worden verwijderd; een definitieve factuur crediteer je';
  END IF;

  UPDATE partner_purchase_invoices
     SET commission_invoice_id = NULL
   WHERE commission_invoice_id = p_invoice_id
     AND commission_invoiced_at IS NULL;

  -- Regels eerst, dan de kop: de regel-guard hieronder kijkt naar de status
  -- van de kop, en die moet er dan nog zijn.
  DELETE FROM commission_invoice_lines WHERE invoice_id = p_invoice_id;
  DELETE FROM commission_invoices WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_commission_invoice_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_commission_invoice_draft(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Guards: definitief is definitief.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_commission_invoice_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Een definitieve commissiefactuur (%) kan niet worden verwijderd; maak een creditnota',
        OLD.invoice_number;
    END IF;
    RETURN OLD;
  END IF;

  -- Een uitgegeven nummer verandert nooit meer.
  IF OLD.invoice_number IS NOT NULL AND NEW.invoice_number IS DISTINCT FROM OLD.invoice_number THEN
    RAISE EXCEPTION 'Factuurnummer % kan niet worden gewijzigd', OLD.invoice_number;
  END IF;

  -- Toegestane statuswissels.
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'draft'     AND NEW.status = 'final')
    OR (OLD.status = 'final'     AND NEW.status IN ('sent', 'credited'))
    OR (OLD.status = 'sent'      AND NEW.status IN ('forwarded', 'paid', 'credited'))
    OR (OLD.status = 'forwarded' AND NEW.status IN ('paid', 'credited'))
    OR (OLD.status = 'paid'      AND NEW.status = 'credited')
  ) THEN
    RAISE EXCEPTION 'Commissiefactuur kan niet van "%" naar "%"', OLD.status, NEW.status;
  END IF;

  -- Na definitief maken liggen partner, data, ontvanger en bedragen vast.
  IF OLD.status <> 'draft' AND (
       NEW.partner_id IS DISTINCT FROM OLD.partner_id
    OR NEW.invoice_date IS DISTINCT FROM OLD.invoice_date
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.recipient_name IS DISTINCT FROM OLD.recipient_name
    OR NEW.recipient_address_street IS DISTINCT FROM OLD.recipient_address_street
    OR NEW.recipient_address_postal IS DISTINCT FROM OLD.recipient_address_postal
    OR NEW.recipient_address_city IS DISTINCT FROM OLD.recipient_address_city
    OR NEW.recipient_kvk_number IS DISTINCT FROM OLD.recipient_kvk_number
    OR NEW.amount_excl_vat IS DISTINCT FROM OLD.amount_excl_vat
    OR NEW.vat_rate IS DISTINCT FROM OLD.vat_rate
    OR NEW.vat_amount IS DISTINCT FROM OLD.vat_amount
    OR NEW.amount_incl_vat IS DISTINCT FROM OLD.amount_incl_vat
  ) THEN
    RAISE EXCEPTION 'Commissiefactuur % is definitief en kan niet meer worden gewijzigd; maak een creditnota',
      OLD.invoice_number;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_commission_invoice_lifecycle ON public.commission_invoices;
CREATE TRIGGER trg_guard_commission_invoice_lifecycle
  BEFORE UPDATE OR DELETE ON public.commission_invoices
  FOR EACH ROW EXECUTE FUNCTION public.guard_commission_invoice_lifecycle();

CREATE OR REPLACE FUNCTION public.guard_commission_invoice_lines_frozen()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
    FROM commission_invoices
   WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'De regels van een definitieve commissiefactuur kunnen niet meer worden gewijzigd';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_commission_invoice_lines_frozen ON public.commission_invoice_lines;
CREATE TRIGGER trg_guard_commission_invoice_lines_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON public.commission_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.guard_commission_invoice_lines_frozen();
