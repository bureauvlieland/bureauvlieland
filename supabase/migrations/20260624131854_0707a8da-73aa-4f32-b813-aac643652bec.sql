
-- 1) Fix mutable search_path on public.slugify
ALTER FUNCTION public.slugify(text) SET search_path = public, pg_temp;

-- 2) accommodation_quotes: add WITH CHECK and trigger protecting financial fields from partner edits
DROP POLICY IF EXISTS "Partners can update their accommodation quotes" ON public.accommodation_quotes;
CREATE POLICY "Partners can update their accommodation quotes"
  ON public.accommodation_quotes
  FOR UPDATE
  USING (partner_id = public.get_partner_id(auth.uid()))
  WITH CHECK (partner_id = public.get_partner_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_partner_accommodation_quote_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Admins can change anything
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Otherwise (partner edits) restore admin/financial controlled fields
  NEW.partner_id := OLD.partner_id;
  NEW.commission_percentage := OLD.commission_percentage;
  NEW.commission_amount := OLD.commission_amount;
  NEW.commission_status := OLD.commission_status;
  NEW.commission_invoiced_at := OLD.commission_invoiced_at;
  NEW.invoiced_amount := OLD.invoiced_amount;
  NEW.invoiced_number := OLD.invoiced_number;
  NEW.invoiced_date := OLD.invoiced_date;
  NEW.invoiced_file_path := OLD.invoiced_file_path;
  NEW.purchase_invoice_id := OLD.purchase_invoice_id;
  NEW.purchase_room_cost_incl_vat := OLD.purchase_room_cost_incl_vat;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_partner_accommodation_quote_fields ON public.accommodation_quotes;
CREATE TRIGGER trg_protect_partner_accommodation_quote_fields
  BEFORE UPDATE ON public.accommodation_quotes
  FOR EACH ROW EXECUTE FUNCTION public.protect_partner_accommodation_quote_fields();

-- 3) partner_purchase_invoices: add WITH CHECK so partner cannot reassign partner_id
DROP POLICY IF EXISTS "Partners can update their purchase invoices" ON public.partner_purchase_invoices;
CREATE POLICY "Partners can update their purchase invoices"
  ON public.partner_purchase_invoices
  FOR UPDATE
  USING (partner_id = public.get_partner_id(auth.uid()))
  WITH CHECK (partner_id = public.get_partner_id(auth.uid()));

-- 4) email-attachments storage bucket: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can read email attachments" ON storage.objects;
CREATE POLICY "Admins can read email attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'email-attachments' AND public.is_admin(auth.uid()));

-- 5) accommodation_requests partner PII: drop direct partner SELECT policy; expose a sanitized view
DROP POLICY IF EXISTS "Partners can view requests with their quotes" ON public.accommodation_requests;

CREATE OR REPLACE VIEW public.partner_accommodation_requests_safe
WITH (security_invoker = false) AS
SELECT
  ar.id,
  ar.reference_number,
  ar.status,
  ar.created_at,
  ar.updated_at,
  ar.expires_at,
  ar.arrival_date,
  ar.departure_date,
  ar.number_of_guests,
  ar.accommodation_type,
  ar.room_count,
  ar.room_occupancy,
  ar.room_types,
  ar.location_preference,
  ar.facilities_required,
  ar.budget_range,
  ar.special_requests,
  ar.wants_activities,
  ar.linked_program_id,
  ar.room_assignment,
  ar.guest_details_updated_at,
  ar.completion_status,
  ar.completed_at,
  ar.customer_name,
  ar.customer_email,
  ar.customer_phone,
  ar.customer_company
  -- intentionally excluded (admin-only PII): customer_token, admin_notes, attribution,
  -- quotes_requested_count, quotes_declined_count, completed_by, reopened_reason
FROM public.accommodation_requests ar
WHERE EXISTS (
  SELECT 1
  FROM public.accommodation_quotes aq
  WHERE aq.request_id = ar.id
    AND aq.partner_id = public.get_partner_id(auth.uid())
);

GRANT SELECT ON public.partner_accommodation_requests_safe TO authenticated;

-- 6) program_requests partner PII: drop broad partner SELECT, expose only the minimal field partner code needs
DROP POLICY IF EXISTS "Partners can view linked program details for selected quotes" ON public.program_requests;

CREATE OR REPLACE FUNCTION public.get_partner_linked_program_invoicing_modes(p_program_ids uuid[])
RETURNS TABLE(id uuid, invoicing_mode text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pr.id, pr.invoicing_mode
  FROM public.program_requests pr
  WHERE pr.id = ANY (p_program_ids)
    AND EXISTS (
      SELECT 1
      FROM public.accommodation_requests ar
      JOIN public.accommodation_quotes aq ON aq.request_id = ar.id
      JOIN public.partners p ON p.id = aq.partner_id
      WHERE ar.linked_program_id = pr.id
        AND p.auth_user_id = auth.uid()
        AND aq.status = 'selected'
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_linked_program_invoicing_modes(uuid[]) TO authenticated;
