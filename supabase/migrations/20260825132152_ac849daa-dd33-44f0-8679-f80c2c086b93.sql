ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS admin_status_override_reason text;

CREATE OR REPLACE FUNCTION public.guard_item_status_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_status_change boolean;
  v_is_quote_status_change boolean;
  v_is_bureau_managed boolean;
BEGIN
  v_is_status_change := (TG_OP = 'INSERT')
    OR (OLD.status IS DISTINCT FROM NEW.status);
  v_is_quote_status_change := (TG_OP = 'INSERT')
    OR (OLD.item_quote_status IS DISTINCT FROM NEW.item_quote_status);

  -- Niets te valideren als status én item_quote_status onveranderd zijn.
  IF NOT v_is_status_change AND NOT v_is_quote_status_change THEN
    RETURN NEW;
  END IF;

  -- Lifecycle-statussen ná bevestiging (uitgevoerd/gefactureerd/geannuleerd/
  -- niet beschikbaar) mogen altijd gezet worden; de guard gaat uitsluitend over
  -- het te vroeg bevestigen van een onderdeel.
  IF NEW.status IN ('executed', 'invoiced', 'cancelled', 'unavailable') THEN
    RETURN NEW;
  END IF;

  -- Alleen ingrijpen bij een echte transitie NAAR confirmed/accepted, of NAAR
  -- item_quote_status 'bevestigd'. Een ongewijzigde 'bevestigd' telt niet mee.
  IF NOT (
    (v_is_status_change AND NEW.status IN ('confirmed','accepted'))
    OR (v_is_quote_status_change AND COALESCE(NEW.item_quote_status,'') = 'bevestigd')
  ) THEN
    RETURN NEW;
  END IF;

  -- 1) Echte bureau-interne post (uren, materiaal, toeristenbelasting, etc.)
  IF NEW.provider_id = 'bureau' OR NEW.provider_id = 'bureau-vlieland' THEN
    RETURN NEW;
  END IF;

  -- 2) Managed services: ferries, fietsen, bagagevervoer (category 'vervoer')
  v_is_bureau_managed := NEW.block_type = 'bureau'
    AND NEW.provider_id IN ('rederij','fietsverhuur','bagagevervoer-vlieland')
    AND NEW.block_category = 'vervoer';
  IF v_is_bureau_managed THEN
    RETURN NEW;
  END IF;

  -- 3) Partner heeft daadwerkelijk gereageerd: geofferd of prijswijziging gezien.
  IF NEW.quoted_at IS NOT NULL
     OR NEW.partner_price_change_acknowledged_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- 4) Alternative-pad blijft toegestaan (admin/klant beslist).
  IF NEW.status = 'alternative' THEN
    RETURN NEW;
  END IF;

  -- 5) Expliciete admin-override: alleen de override-item-status edge function
  --    (admin-only) zet deze kolom; partners worden geblokkeerd door
  --    guard_partner_request_item_self_update.
  IF TG_OP = 'UPDATE'
     AND NEW.admin_status_override_reason IS NOT NULL
     AND OLD.admin_status_override_reason IS DISTINCT FROM NEW.admin_status_override_reason
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Item % (%) kan niet op status "%"/"%" worden gezet voordat partner % het heeft bevestigd of een tegenvoorstel heeft gedaan.',
    NEW.id, NEW.block_name, NEW.status, NEW.item_quote_status, NEW.provider_name
    USING HINT = 'Stuur het item eerst naar de partner via "Versturen naar partners" of laat de partner een offerte/prijsbevestiging geven.',
          ERRCODE = 'check_violation';
END;
$function$;

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