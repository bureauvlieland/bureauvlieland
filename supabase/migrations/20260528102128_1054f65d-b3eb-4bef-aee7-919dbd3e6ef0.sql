-- 1. partners: voeg IBAN + BIC toe
ALTER TABLE public.partners 
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bic text;

-- 2. partner_purchase_invoices: koppeling naar batch
ALTER TABLE public.partner_purchase_invoices
  ADD COLUMN IF NOT EXISTS payment_batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_partner_purchase_invoices_payment_batch_id
  ON public.partner_purchase_invoices(payment_batch_id);

-- 3. payment_batches tabel
CREATE TABLE IF NOT EXISTS public.payment_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_reference text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  requested_execution_date date NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  transaction_count integer NOT NULL DEFAULT 0,
  xml_file_path text,
  status text NOT NULL DEFAULT 'generated',
  notes text,
  CONSTRAINT valid_payment_batch_status CHECK (status IN ('generated', 'cancelled'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_batches TO authenticated;
GRANT ALL ON public.payment_batches TO service_role;

ALTER TABLE public.payment_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment batches"
  ON public.payment_batches
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- FK van invoices naar batches (na batches-tabel)
ALTER TABLE public.partner_purchase_invoices
  DROP CONSTRAINT IF EXISTS partner_purchase_invoices_payment_batch_fk;
ALTER TABLE public.partner_purchase_invoices
  ADD CONSTRAINT partner_purchase_invoices_payment_batch_fk
  FOREIGN KEY (payment_batch_id) REFERENCES public.payment_batches(id) ON DELETE SET NULL;

-- 4. Batch reference generator (BATCH-YYMM-NNNN)
CREATE OR REPLACE FUNCTION public.generate_payment_batch_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  year_month text;
  next_seq int;
BEGIN
  IF NEW.batch_reference IS NOT NULL AND NEW.batch_reference <> '' THEN
    RETURN NEW;
  END IF;

  year_month := to_char(now(), 'YYMM');

  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(SUBSTRING(batch_reference FROM 'BATCH-' || year_month || '-(\d{4})'), '')
        AS integer
      )
    ), 0
  ) + 1 INTO next_seq
  FROM public.payment_batches
  WHERE batch_reference LIKE 'BATCH-' || year_month || '-%';

  NEW.batch_reference := 'BATCH-' || year_month || '-' || lpad(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_payment_batch_reference ON public.payment_batches;
CREATE TRIGGER set_payment_batch_reference
  BEFORE INSERT ON public.payment_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_payment_batch_reference();

-- 5. Storage bucket voor SEPA XML-bestanden (privé, admin-only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-batches', 'payment-batches', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read payment-batch files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-batches' AND is_admin(auth.uid()));

CREATE POLICY "Admins can insert payment-batch files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-batches' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete payment-batch files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'payment-batches' AND is_admin(auth.uid()));

-- 6. App settings voor Bureau Vlieland IBAN/BIC
INSERT INTO app_settings (id, category, label, description, value, value_type)
VALUES 
  ('bureau_iban', 'bureau', 'IBAN Bureau Vlieland',
   'IBAN waarvan SEPA-betaalbatches worden uitgevoerd', '""', 'text'),
  ('bureau_bic', 'bureau', 'BIC Bureau Vlieland',
   'BIC (optioneel binnen Nederland)', '""', 'text'),
  ('bureau_account_name', 'bureau', 'Tenaamstelling rekening',
   'Naam zoals geregistreerd bij de bank', '"Bureau Vlieland"', 'text')
ON CONFLICT (id) DO NOTHING;