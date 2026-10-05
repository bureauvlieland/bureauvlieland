-- Commissies fase 2 (deel 3): crediteren, en commission_invoice_id als enige
-- waarheid op de bronnen (docs/plan-commissiefacturen.md, fase 2).
--
--  * Onderdeel, logies-offerte en losse inkoopfactuur dragen elk één kolom
--    commission_invoice_id (foreign key). Die wordt gezet bij "Concept
--    opslaan" en gewist bij verwijderen of crediteren. commission_status op
--    de bron is voortaan afgeleid: een trigger op commission_invoices zet hem
--    bij definitief maken (invoiced), betaald (paid) en crediteren (pending).
--  * Crediteren: een definitieve factuur (final/sent/forwarded/paid) krijgt
--    een creditnota met eigen nummer en negatieve regels; de bronnen komen
--    weer vrij. De oorspronkelijke factuur krijgt status credited.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Koppelkolommen
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS commission_invoice_id uuid
    REFERENCES public.commission_invoices(id) ON DELETE SET NULL;
ALTER TABLE public.accommodation_quotes
  ADD COLUMN IF NOT EXISTS commission_invoice_id uuid
    REFERENCES public.commission_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pri_commission_invoice
  ON public.program_request_items (commission_invoice_id)
  WHERE commission_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aq_commission_invoice
  ON public.accommodation_quotes (commission_invoice_id)
  WHERE commission_invoice_id IS NOT NULL;

ALTER TABLE public.commission_invoices
  ADD COLUMN IF NOT EXISTS credits_invoice_id uuid
    REFERENCES public.commission_invoices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS credited_at timestamptz,
  ADD COLUMN IF NOT EXISTS credited_by uuid,
  ADD COLUMN IF NOT EXISTS credit_reason text;

CREATE INDEX IF NOT EXISTS idx_commission_invoices_credits
  ON public.commission_invoices (credits_invoice_id)
  WHERE credits_invoice_id IS NOT NULL;

-- Vullen uit de regels van levende facturen (alles wat niet gecrediteerd is).
UPDATE public.program_request_items i
   SET commission_invoice_id = l.invoice_id
  FROM public.commission_invoice_lines l
  JOIN public.commission_invoices ci ON ci.id = l.invoice_id
 WHERE l.item_id = i.id
   AND ci.status <> 'credited'
   AND i.commission_invoice_id IS NULL;

UPDATE public.accommodation_quotes q
   SET commission_invoice_id = l.invoice_id
  FROM public.commission_invoice_lines l
  JOIN public.commission_invoices ci ON ci.id = l.invoice_id
 WHERE l.quote_id = q.id
   AND ci.status <> 'credited'
   AND q.commission_invoice_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Partners mogen de koppeling niet aanraken (zelfde guards als de andere
--    commissievelden; een REVOKE op kolomniveau werkt niet naast het
--    tabelbrede UPDATE-recht van authenticated).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_partner_request_item_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id text;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  v_partner_id := public.get_partner_id(auth.uid());
  IF v_partner_id IS NULL OR NEW.provider_id IS DISTINCT FROM v_partner_id THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.commission_status IS DISTINCT FROM OLD.commission_status
     OR NEW.commission_invoiced_at IS DISTINCT FROM OLD.commission_invoiced_at
     OR NEW.commission_invoice_id IS DISTINCT FROM OLD.commission_invoice_id
     OR NEW.commission_notes IS DISTINCT FROM OLD.commission_notes
     OR COALESCE(NEW.commission_exempt, false) IS DISTINCT FROM COALESCE(OLD.commission_exempt, false)
     OR NEW.commission_exempt_at IS DISTINCT FROM OLD.commission_exempt_at
     OR NEW.commission_exempt_by IS DISTINCT FROM OLD.commission_exempt_by
     OR NEW.commission_exempt_reason IS DISTINCT FROM OLD.commission_exempt_reason
     OR NEW.invoiced_amount IS DISTINCT FROM OLD.invoiced_amount
     OR NEW.invoiced_number IS DISTINCT FROM OLD.invoiced_number
     OR NEW.invoiced_date IS DISTINCT FROM OLD.invoiced_date
     OR NEW.actual_invoiced_excl_vat IS DISTINCT FROM OLD.actual_invoiced_excl_vat
     OR NEW.proforma_commission IS DISTINCT FROM OLD.proforma_commission
     OR NEW.purchase_invoice_id IS DISTINCT FROM OLD.purchase_invoice_id
     OR NEW.purchase_invoice_matched_at IS DISTINCT FROM OLD.purchase_invoice_matched_at
     OR NEW.final_billing_locked_at IS DISTINCT FROM OLD.final_billing_locked_at
     OR NEW.use_actual_costs IS DISTINCT FROM OLD.use_actual_costs
     OR NEW.admin_price_override IS DISTINCT FROM OLD.admin_price_override
     OR NEW.admin_price_notes IS DISTINCT FROM OLD.admin_price_notes
     OR NEW.admin_price_override_updated_at IS DISTINCT FROM OLD.admin_price_override_updated_at
     OR NEW.pending_admin_price_override IS DISTINCT FROM OLD.pending_admin_price_override
     OR NEW.pending_admin_price_notes IS DISTINCT FROM OLD.pending_admin_price_notes
     OR NEW.pending_price_type IS DISTINCT FROM OLD.pending_price_type
     OR NEW.pending_override_people IS DISTINCT FROM OLD.pending_override_people
     OR NEW.pending_child_unit_price IS DISTINCT FROM OLD.pending_child_unit_price
     OR NEW.price_type IS DISTINCT FROM OLD.price_type
     OR NEW.override_people IS DISTINCT FROM OLD.override_people
     OR NEW.child_unit_price IS DISTINCT FROM OLD.child_unit_price
     OR COALESCE(NEW.skip_partner_notification, false) IS DISTINCT FROM COALESCE(OLD.skip_partner_notification, false)
     OR NEW.customer_approved_at IS DISTINCT FROM OLD.customer_approved_at
     OR NEW.customer_accepted_at IS DISTINCT FROM OLD.customer_accepted_at
     OR NEW.admin_status_override_reason IS DISTINCT FROM OLD.admin_status_override_reason
     OR NEW.provider_id IS DISTINCT FROM OLD.provider_id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.block_id IS DISTINCT FROM OLD.block_id
  THEN
    RAISE EXCEPTION 'Partners cannot modify commission, billing, pricing-override or audit fields on program request items.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_partner_quote_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_partner_id text;
BEGIN
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  v_partner_id := public.get_partner_id(auth.uid());
  IF v_partner_id IS NULL OR NEW.partner_id IS DISTINCT FROM v_partner_id THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
     OR NEW.commission_status IS DISTINCT FROM OLD.commission_status
     OR NEW.commission_invoiced_at IS DISTINCT FROM OLD.commission_invoiced_at
     OR NEW.commission_invoice_id IS DISTINCT FROM OLD.commission_invoice_id
     OR COALESCE(NEW.commission_exempt, false) IS DISTINCT FROM COALESCE(OLD.commission_exempt, false)
     OR NEW.commission_exempt_at IS DISTINCT FROM OLD.commission_exempt_at
     OR NEW.commission_exempt_by IS DISTINCT FROM OLD.commission_exempt_by
     OR NEW.commission_exempt_reason IS DISTINCT FROM OLD.commission_exempt_reason
     OR NEW.invoiced_amount IS DISTINCT FROM OLD.invoiced_amount
     OR NEW.invoiced_number IS DISTINCT FROM OLD.invoiced_number
     OR NEW.invoiced_date IS DISTINCT FROM OLD.invoiced_date
     OR NEW.invoiced_file_path IS DISTINCT FROM OLD.invoiced_file_path
     OR NEW.actual_invoiced_excl_vat IS DISTINCT FROM OLD.actual_invoiced_excl_vat
     OR NEW.proforma_commission IS DISTINCT FROM OLD.proforma_commission
     OR NEW.proforma_amount_excl_vat IS DISTINCT FROM OLD.proforma_amount_excl_vat
     OR NEW.proforma_sent_at IS DISTINCT FROM OLD.proforma_sent_at
     OR NEW.proforma_deadline IS DISTINCT FROM OLD.proforma_deadline
     OR NEW.selected_at IS DISTINCT FROM OLD.selected_at
     OR NEW.forwarded_at IS DISTINCT FROM OLD.forwarded_at
     OR NEW.customer_terms_accepted_at IS DISTINCT FROM OLD.customer_terms_accepted_at
     OR NEW.customer_signature_name IS DISTINCT FROM OLD.customer_signature_name
     OR NEW.customer_terms_ip IS DISTINCT FROM OLD.customer_terms_ip
     OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
  THEN
    RAISE EXCEPTION 'Partners cannot modify commission, billing, or customer-acceptance fields on accommodation quotes.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) commission_status op de bronnen volgt de factuurstatus
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_commission_sources_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'final' THEN
    UPDATE program_request_items
       SET commission_status = 'invoiced',
           commission_invoiced_at = COALESCE(commission_invoiced_at, v_now)
     WHERE commission_invoice_id = NEW.id;
    UPDATE accommodation_quotes
       SET commission_status = 'invoiced',
           commission_invoiced_at = COALESCE(commission_invoiced_at, v_now)
     WHERE commission_invoice_id = NEW.id;
    UPDATE partner_purchase_invoices
       SET commission_invoiced_at = COALESCE(commission_invoiced_at, v_now)
     WHERE commission_invoice_id = NEW.id;

  ELSIF NEW.status = 'paid' THEN
    UPDATE program_request_items SET commission_status = 'paid'
     WHERE commission_invoice_id = NEW.id;
    UPDATE accommodation_quotes SET commission_status = 'paid'
     WHERE commission_invoice_id = NEW.id;

  ELSIF NEW.status = 'credited' THEN
    -- De bronnen zijn weer vrij: terug naar "Te factureren".
    UPDATE program_request_items
       SET commission_status = 'pending',
           commission_invoiced_at = NULL,
           commission_invoice_id = NULL
     WHERE commission_invoice_id = NEW.id;
    UPDATE accommodation_quotes
       SET commission_status = 'pending',
           commission_invoiced_at = NULL,
           commission_invoice_id = NULL
     WHERE commission_invoice_id = NEW.id;
    UPDATE partner_purchase_invoices
       SET commission_invoiced_at = NULL,
           commission_invoice_id = NULL
     WHERE commission_invoice_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_sources_from_invoice ON public.commission_invoices;
CREATE TRIGGER trg_sync_commission_sources_from_invoice
  AFTER UPDATE OF status ON public.commission_invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_commission_sources_from_invoice();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Concept opslaan: ook onderdelen en offertes koppelen
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

    -- Oude koppelingen losmaken; hieronder komen de nieuwe.
    UPDATE program_request_items SET commission_invoice_id = NULL
     WHERE commission_invoice_id = v_id;
    UPDATE accommodation_quotes SET commission_invoice_id = NULL
     WHERE commission_invoice_id = v_id;
    UPDATE partner_purchase_invoices SET commission_invoice_id = NULL
     WHERE commission_invoice_id = v_id AND commission_invoiced_at IS NULL;

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

  -- De bronnen aan dit concept koppelen: de enige waarheid over "staat op
  -- een factuur". commission_status volgt bij definitief maken.
  UPDATE program_request_items SET commission_invoice_id = v_id
   WHERE id IN (SELECT item_id FROM commission_invoice_lines WHERE invoice_id = v_id AND item_id IS NOT NULL);
  UPDATE accommodation_quotes SET commission_invoice_id = v_id
   WHERE id IN (SELECT quote_id FROM commission_invoice_lines WHERE invoice_id = v_id AND quote_id IS NOT NULL);
  UPDATE partner_purchase_invoices SET commission_invoice_id = v_id
   WHERE id IN (SELECT purchase_invoice_id FROM commission_invoice_lines WHERE invoice_id = v_id AND purchase_invoice_id IS NOT NULL);

  RETURN v_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Definitief maken: nummer, bevriezen, terugschrijven. De status van de
--    bronnen zet de trigger hierboven.
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

  IF COALESCE(v_inv.recipient_name, '') = '' THEN v_missing := v_missing || 'naam'; END IF;
  IF COALESCE(v_inv.recipient_email, '') = '' THEN v_missing := v_missing || 'e-mailadres'; END IF;
  IF COALESCE(v_inv.recipient_address_street, '') = '' THEN v_missing := v_missing || 'straat'; END IF;
  IF COALESCE(v_inv.recipient_address_city, '') = '' THEN v_missing := v_missing || 'plaats'; END IF;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'Partnergegevens onvolledig: %', array_to_string(v_missing, ', ');
  END IF;

  -- Koppelingen zeker stellen (idempotent), zodat de statustrigger ze vindt.
  UPDATE program_request_items i SET commission_invoice_id = p_invoice_id
   WHERE i.id IN (SELECT l.item_id FROM commission_invoice_lines l WHERE l.invoice_id = p_invoice_id AND l.item_id IS NOT NULL);
  UPDATE accommodation_quotes q SET commission_invoice_id = p_invoice_id
   WHERE q.id IN (SELECT l.quote_id FROM commission_invoice_lines l WHERE l.invoice_id = p_invoice_id AND l.quote_id IS NOT NULL);
  UPDATE partner_purchase_invoices p SET commission_invoice_id = p_invoice_id
   WHERE p.id IN (SELECT l.purchase_invoice_id FROM commission_invoice_lines l WHERE l.invoice_id = p_invoice_id AND l.purchase_invoice_id IS NOT NULL);

  -- Grondslag, percentage en bedrag terug naar het onderdeel, zoals ze op de
  -- factuur staan. Bij meerdere regels per bron (kamer + extra's) is het
  -- percentage niet eenduidig; dan gaat alleen het bedrag mee.
  UPDATE program_request_items i
     SET commission_amount = s.amount,
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
     SET commission_amount = s.amount,
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

  -- Totalen nog één keer uit de regels, dan het nummer en de status.
  SELECT COALESCE(SUM(l.commission_amount), 0) INTO v_excl
    FROM commission_invoice_lines l WHERE l.invoice_id = p_invoice_id;
  v_vat := ROUND(v_excl * v_inv.vat_rate / 100.0, 2);
  v_number := public.next_commission_invoice_number(v_inv.invoice_date);

  UPDATE commission_invoices ci
     SET invoice_number = v_number,
         status = 'final',
         finalized_at = now(),
         finalized_by = auth.uid(),
         amount_excl_vat = v_excl,
         vat_amount = v_vat,
         amount_incl_vat = v_excl + v_vat
   WHERE ci.id = p_invoice_id;

  RETURN QUERY SELECT p_invoice_id, v_number;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Concept verwijderen: ook onderdelen en offertes loskoppelen
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

  UPDATE program_request_items SET commission_invoice_id = NULL
   WHERE commission_invoice_id = p_invoice_id;
  UPDATE accommodation_quotes SET commission_invoice_id = NULL
   WHERE commission_invoice_id = p_invoice_id;
  UPDATE partner_purchase_invoices SET commission_invoice_id = NULL
   WHERE commission_invoice_id = p_invoice_id AND commission_invoiced_at IS NULL;

  DELETE FROM commission_invoice_lines WHERE invoice_id = p_invoice_id;
  DELETE FROM commission_invoices WHERE id = p_invoice_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Crediteren
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.credit_commission_invoice(p_invoice_id uuid, p_reason text)
RETURNS TABLE (id uuid, invoice_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_inv       commission_invoices%ROWTYPE;
  v_credit_id uuid;
  v_number    text;
  v_notes     text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Alleen admins kunnen commissiefacturen crediteren'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_inv FROM commission_invoices ci WHERE ci.id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commissiefactuur niet gevonden';
  END IF;
  IF v_inv.status NOT IN ('final', 'sent', 'forwarded', 'paid') THEN
    RAISE EXCEPTION 'Alleen een definitieve factuur kan worden gecrediteerd (status: %)', v_inv.status;
  END IF;
  IF v_inv.credits_invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Een creditnota kan niet worden gecrediteerd';
  END IF;
  IF EXISTS (SELECT 1 FROM commission_invoices c WHERE c.credits_invoice_id = p_invoice_id) THEN
    RAISE EXCEPTION 'Factuur % is al gecrediteerd', v_inv.invoice_number;
  END IF;

  v_notes := 'Creditnota bij factuur ' || v_inv.invoice_number
             || CASE WHEN COALESCE(btrim(p_reason), '') <> '' THEN '. ' || btrim(p_reason) ELSE '.' END;

  -- Eerst als concept (de regel-guard laat alleen regels toe op een concept),
  -- dan in één keer nummer en status final.
  INSERT INTO commission_invoices (
    partner_id, invoice_date, due_date,
    recipient_name, recipient_email, recipient_address_street,
    recipient_address_postal, recipient_address_city, recipient_kvk_number,
    notes, status, vat_rate, amount_excl_vat, vat_amount, amount_incl_vat,
    credits_invoice_id, created_by
  ) VALUES (
    v_inv.partner_id, CURRENT_DATE, CURRENT_DATE,
    v_inv.recipient_name, v_inv.recipient_email, v_inv.recipient_address_street,
    v_inv.recipient_address_postal, v_inv.recipient_address_city, v_inv.recipient_kvk_number,
    v_notes, 'draft', v_inv.vat_rate, -v_inv.amount_excl_vat, -v_inv.vat_amount, -v_inv.amount_incl_vat,
    p_invoice_id, auth.uid()
  )
  RETURNING commission_invoices.id INTO v_credit_id;

  -- Regels gespiegeld, zonder bronkoppeling: de bronnen komen vrij en mogen
  -- opnieuw gefactureerd worden.
  INSERT INTO commission_invoice_lines (
    invoice_id, item_type, block_name, customer_label, event_date, reference_number,
    invoiced_amount_excl_vat, commission_percentage, commission_amount,
    description, sort_order, commission_basis
  )
  SELECT v_credit_id, l.item_type, l.block_name, l.customer_label, l.event_date, l.reference_number,
         -l.invoiced_amount_excl_vat, l.commission_percentage, -l.commission_amount,
         'Credit: ' || COALESCE(l.description, l.block_name), l.sort_order, l.commission_basis
    FROM commission_invoice_lines l
   WHERE l.invoice_id = p_invoice_id
   ORDER BY l.sort_order;

  v_number := public.next_commission_invoice_number(CURRENT_DATE);
  UPDATE commission_invoices ci
     SET invoice_number = v_number,
         status = 'final',
         finalized_at = now(),
         finalized_by = auth.uid()
   WHERE ci.id = v_credit_id;

  -- De oorspronkelijke factuur: gecrediteerd. De trigger maakt de bronnen vrij.
  UPDATE commission_invoices ci
     SET status = 'credited',
         credited_at = now(),
         credited_by = auth.uid(),
         credit_reason = NULLIF(btrim(p_reason), '')
   WHERE ci.id = p_invoice_id;

  RETURN QUERY SELECT v_credit_id, v_number;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_commission_invoice(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.credit_commission_invoice(uuid, text) TO authenticated;
