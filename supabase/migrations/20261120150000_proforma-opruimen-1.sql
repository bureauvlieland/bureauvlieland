-- Database-opruiming na docs/plan-proforma-factuur.md, stap 1.
--
-- Weg: de schrijfactie van het oude werkblad (apply_purchase_line_charges,
-- sinds fase 4 zonder aanroeper) en de drie vlaggen op onderdelen die
-- alleen dat werkblad las: keep_quoted_price ("offerteprijs houden"; op de
-- proforma is dat gewoon een regel niet vervangen), final_billing_locked_at
-- ("regels leidend"; de proforma kent geen vlag, een regel is vervangen of
-- niet) en created_from_purchase_lines (kostenposten van het werkblad; de
-- proforma maakt geen onderdelen meer aan). De partnerguard noemde de twee
-- eerste vlaggen en wordt zonder ze opnieuw aangemaakt.
--
-- Blijft bewust staan: program_item_billing_lines (klantregels van
-- projecten die vóór de proforma al volledig gefactureerd waren; de knop
-- "Proforma's aanmaken" slaat die over), charge_status en skip_reason op
-- purchase_invoice_lines (commissiewerklijst), excluded_fees (projecten
-- zonder akkoord en het klantportaal) en de dag −1 kostenposten
-- (offertefase). Stap 2 kan de klantregels laten vallen zodra elk
-- gefactureerd project een proforma heeft.

DROP FUNCTION IF EXISTS public.apply_purchase_line_charges(uuid, jsonb);

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

ALTER TABLE public.program_request_items
  DROP COLUMN IF EXISTS keep_quoted_price,
  DROP COLUMN IF EXISTS final_billing_locked_at,
  DROP COLUMN IF EXISTS created_from_purchase_lines;
