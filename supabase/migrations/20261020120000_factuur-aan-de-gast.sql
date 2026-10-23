-- Facturen die de gast zelf heeft betaald, maar die via het bureau zijn
-- aangeleverd (docs/factuur-aan-de-gast.md).
--
-- Tot nu toe was elke rij in partner_purchase_invoices een factuur van de
-- partner aan Bureau Vlieland: de grondslag voor de commissie én een
-- openstaande post die het bureau moet doorsturen naar Snelstart en betalen
-- (batch of incasso). Rekent de partner rechtstreeks met de gast af, dan is
-- het eerste wel waar en het tweede niet. `billed_to` legt dat onderscheid
-- vast:
--   bureau   — factuur aan Bureau Vlieland (zoals voorheen, de default)
--   customer — factuur aan de gast; de gast heeft betaald, het bureau betaalt
--              niets en stuurt alleen een commissiefactuur
--
-- Een logiesfactuur die de partner in het portaal registreert staat niet in
-- partner_purchase_invoices maar op de offerte (invoiced_*); daarom krijgt
-- accommodation_quotes dezelfde vlag als `invoiced_billed_to`.

ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS billed_to text NOT NULL DEFAULT 'bureau';

ALTER TABLE public.partner_purchase_invoices
  DROP CONSTRAINT IF EXISTS partner_purchase_invoices_billed_to_check;
ALTER TABLE public.partner_purchase_invoices
  ADD CONSTRAINT partner_purchase_invoices_billed_to_check
  CHECK (billed_to IN ('bureau', 'customer'));

COMMENT ON COLUMN public.partner_purchase_invoices.billed_to IS
  'Aan wie de partner factureerde: bureau (Bureau Vlieland betaalt, default) of customer (de gast heeft rechtstreeks betaald; alleen commissiegrondslag, nooit in Snelstart, betaalbatch of bankmatching).';

ALTER TABLE public.accommodation_quotes
  ADD COLUMN IF NOT EXISTS invoiced_billed_to text NOT NULL DEFAULT 'bureau';

ALTER TABLE public.accommodation_quotes
  DROP CONSTRAINT IF EXISTS accommodation_quotes_invoiced_billed_to_check;
ALTER TABLE public.accommodation_quotes
  ADD CONSTRAINT accommodation_quotes_invoiced_billed_to_check
  CHECK (invoiced_billed_to IN ('bureau', 'customer'));

COMMENT ON COLUMN public.accommodation_quotes.invoiced_billed_to IS
  'Aan wie de accommodatie de geregistreerde eindfactuur (invoiced_*) richtte: bureau of customer (de gast heeft rechtstreeks betaald; alleen commissiegrondslag).';

-- Een partner mag de vlag na registratie niet zelf omzetten: van customer
-- naar bureau zou het bureau een factuur laten betalen die de gast al
-- betaalde. Alleen admin en service role (de edge functions) mogen dat.
CREATE OR REPLACE FUNCTION public.protect_partner_purchase_invoice_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status_changed boolean;
BEGIN
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Toegestane automatische overgang: 'wacht op PDF' -> 'in afwachting'
  -- zodra de PDF gekoppeld is (zie purchase_invoice_release_email_match).
  v_status_changed := NEW.status IS DISTINCT FROM OLD.status;
  IF v_status_changed
     AND OLD.status = 'pending_email_match'
     AND NEW.status = 'pending'
     AND NEW.file_path IS NOT NULL
  THEN
    v_status_changed := false;
  END IF;

  IF v_status_changed
     OR NEW.approved_at               IS DISTINCT FROM OLD.approved_at
     OR NEW.paid_at                   IS DISTINCT FROM OLD.paid_at
     OR NEW.forwarded_to_accounting_at IS DISTINCT FROM OLD.forwarded_to_accounting_at
     OR NEW.forwarded_by              IS DISTINCT FROM OLD.forwarded_by
     OR NEW.payment_batch_id          IS DISTINCT FROM OLD.payment_batch_id
     OR NEW.amount_excl_vat           IS DISTINCT FROM OLD.amount_excl_vat
     OR NEW.amount_incl_vat           IS DISTINCT FROM OLD.amount_incl_vat
     OR NEW.vat_amount                IS DISTINCT FROM OLD.vat_amount
     OR NEW.vat_rate                  IS DISTINCT FROM OLD.vat_rate
     OR NEW.partner_id                IS DISTINCT FROM OLD.partner_id
     OR NEW.request_id                IS DISTINCT FROM OLD.request_id
     OR NEW.item_id                   IS DISTINCT FROM OLD.item_id
     OR NEW.registered_by             IS DISTINCT FROM OLD.registered_by
     OR NEW.billed_to                 IS DISTINCT FROM OLD.billed_to
  THEN
    RAISE EXCEPTION 'Partner mag status / bedragen / koppelingen niet wijzigen op partner_purchase_invoices';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_partner_accommodation_quote_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins en service_role: vrij spel
  IF public.is_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Alleen partners mogen hieronder komen via hun eigen RLS-policy.
  -- Blokkeer wijzigingen op financiële / commissie / bureau-velden.
  IF NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
     OR NEW.commission_amount     IS DISTINCT FROM OLD.commission_amount
     OR NEW.commission_status     IS DISTINCT FROM OLD.commission_status
     OR NEW.commission_invoiced_at IS DISTINCT FROM OLD.commission_invoiced_at
     OR NEW.invoiced_amount       IS DISTINCT FROM OLD.invoiced_amount
     OR NEW.invoiced_number       IS DISTINCT FROM OLD.invoiced_number
     OR NEW.invoiced_date         IS DISTINCT FROM OLD.invoiced_date
     OR NEW.invoiced_file_path    IS DISTINCT FROM OLD.invoiced_file_path
     OR NEW.invoiced_billed_to    IS DISTINCT FROM OLD.invoiced_billed_to
     OR NEW.proforma_amount_excl_vat IS DISTINCT FROM OLD.proforma_amount_excl_vat
     OR NEW.proforma_commission   IS DISTINCT FROM OLD.proforma_commission
     OR NEW.proforma_sent_at      IS DISTINCT FROM OLD.proforma_sent_at
     OR NEW.proforma_deadline     IS DISTINCT FROM OLD.proforma_deadline
     OR NEW.actual_invoiced_excl_vat IS DISTINCT FROM OLD.actual_invoiced_excl_vat
     OR NEW.partner_id            IS DISTINCT FROM OLD.partner_id
     OR NEW.request_id            IS DISTINCT FROM OLD.request_id
     OR NEW.selected_at           IS DISTINCT FROM OLD.selected_at
     OR NEW.forwarded_at          IS DISTINCT FROM OLD.forwarded_at
  THEN
    RAISE EXCEPTION 'Partner mag deze administratieve/financiële velden niet wijzigen op accommodation_quotes';
  END IF;

  RETURN NEW;
END;
$$;
