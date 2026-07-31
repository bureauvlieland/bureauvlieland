CREATE OR REPLACE FUNCTION public.purchase_invoice_release_email_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending_email_match' AND NEW.file_path IS NOT NULL THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_invoice_release_email_match ON public.partner_purchase_invoices;
CREATE TRIGGER trg_purchase_invoice_release_email_match
BEFORE INSERT OR UPDATE OF file_path, status ON public.partner_purchase_invoices
FOR EACH ROW EXECUTE FUNCTION public.purchase_invoice_release_email_match();