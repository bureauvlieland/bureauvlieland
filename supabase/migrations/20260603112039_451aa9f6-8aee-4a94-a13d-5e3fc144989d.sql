
-- Partner post-charges (nacalculatie) — partners voegen achteraf kosten toe; admin verwerkt naar Overige kosten

CREATE TABLE public.partner_post_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  partner_id text NOT NULL,
  request_id uuid NULL,
  accommodation_request_id uuid NULL,
  related_item_id uuid NULL,
  description text NOT NULL,
  notes text NULL,
  amount_incl_vat numeric NOT NULL,
  vat_rate numeric NOT NULL DEFAULT 21,
  service_date date NULL,
  status text NOT NULL DEFAULT 'submitted',
  processed_at timestamptz NULL,
  processed_by uuid NULL,
  processed_item_id uuid NULL,
  reject_reason text NULL,
  CONSTRAINT partner_post_charges_status_check CHECK (status IN ('submitted','processed','rejected')),
  CONSTRAINT partner_post_charges_target_check CHECK (request_id IS NOT NULL OR accommodation_request_id IS NOT NULL)
);

CREATE INDEX idx_partner_post_charges_request ON public.partner_post_charges(request_id);
CREATE INDEX idx_partner_post_charges_accommodation ON public.partner_post_charges(accommodation_request_id);
CREATE INDEX idx_partner_post_charges_partner ON public.partner_post_charges(partner_id);
CREATE INDEX idx_partner_post_charges_status ON public.partner_post_charges(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_post_charges TO authenticated;
GRANT ALL ON public.partner_post_charges TO service_role;

ALTER TABLE public.partner_post_charges ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admins manage partner_post_charges"
ON public.partner_post_charges
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Partner: select own
CREATE POLICY "Partners can view own post charges"
ON public.partner_post_charges
FOR SELECT
TO authenticated
USING (partner_id = get_partner_id(auth.uid()));

-- Partner: insert own (only as submitted, no processed fields)
CREATE POLICY "Partners can insert own post charges"
ON public.partner_post_charges
FOR INSERT
TO authenticated
WITH CHECK (
  partner_id = get_partner_id(auth.uid())
  AND status = 'submitted'
  AND processed_at IS NULL
  AND processed_item_id IS NULL
);

-- Partner: update own only while still submitted, and may not flip status / processed fields
CREATE POLICY "Partners can update own submitted post charges"
ON public.partner_post_charges
FOR UPDATE
TO authenticated
USING (partner_id = get_partner_id(auth.uid()) AND status = 'submitted')
WITH CHECK (
  partner_id = get_partner_id(auth.uid())
  AND status = 'submitted'
  AND processed_at IS NULL
  AND processed_item_id IS NULL
);

-- Partner: delete own while still submitted
CREATE POLICY "Partners can delete own submitted post charges"
ON public.partner_post_charges
FOR DELETE
TO authenticated
USING (partner_id = get_partner_id(auth.uid()) AND status = 'submitted');

-- updated_at trigger
CREATE TRIGGER trg_partner_post_charges_updated_at
BEFORE UPDATE ON public.partner_post_charges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-todo on insert
CREATE OR REPLACE FUNCTION public.create_todo_for_new_partner_post_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_name text;
  v_request_id uuid;
  v_customer_label text;
  v_ref text;
  v_title text;
  v_desc text;
BEGIN
  SELECT name INTO v_partner_name FROM partners WHERE id = NEW.partner_id;

  IF NEW.request_id IS NOT NULL THEN
    v_request_id := NEW.request_id;
    SELECT COALESCE(NULLIF(customer_company,''), customer_name), reference_number
      INTO v_customer_label, v_ref
      FROM program_requests WHERE id = NEW.request_id;
  ELSIF NEW.accommodation_request_id IS NOT NULL THEN
    SELECT linked_program_id, COALESCE(NULLIF(customer_company,''), customer_name), reference_number
      INTO v_request_id, v_customer_label, v_ref
      FROM accommodation_requests WHERE id = NEW.accommodation_request_id;
  END IF;

  v_title := 'Nacalculatie van ' || COALESCE(v_partner_name, NEW.partner_id)
    || ': € ' || to_char(NEW.amount_incl_vat, 'FM999G999G990D00');

  v_desc := COALESCE(v_partner_name, NEW.partner_id)
    || ' heeft een nacalculatie ingediend voor '
    || COALESCE(v_customer_label, 'project')
    || COALESCE(' (' || v_ref || ')', '')
    || ': "' || NEW.description || '" — € '
    || to_char(NEW.amount_incl_vat, 'FM999G999G990D00')
    || ' incl. BTW. Verwerk als Overige kosten of wijs af.';

  INSERT INTO admin_todos (
    title, description, priority, status,
    related_request_id, related_partner_id,
    auto_type, auto_entity_id
  ) VALUES (
    v_title, v_desc, 'normal', 'todo',
    v_request_id, NEW.partner_id,
    'partner_post_charge', NEW.id::text
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_partner_post_charge_create_todo
AFTER INSERT ON public.partner_post_charges
FOR EACH ROW EXECUTE FUNCTION public.create_todo_for_new_partner_post_charge();

-- Auto-close todo when charge is processed or rejected
CREATE OR REPLACE FUNCTION public.close_todo_for_partner_post_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('processed','rejected') AND OLD.status = 'submitted' THEN
    UPDATE admin_todos
       SET status = 'done',
           completed_at = now(),
           updated_at = now()
     WHERE auto_type = 'partner_post_charge'
       AND auto_entity_id = NEW.id::text
       AND status <> 'done';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_partner_post_charge_close_todo
AFTER UPDATE ON public.partner_post_charges
FOR EACH ROW EXECUTE FUNCTION public.close_todo_for_partner_post_charge();
