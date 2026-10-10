-- Bankmatching voor commissiefacturen (vervolg op docs/plan-commissiefacturen.md,
-- "Betaald: later te koppelen aan de bankmatching").
--
-- Een inkomende betaling van een partner wordt door match-bank-lines herkend
-- op BVC-nummer en bedrag; bevestigen zet de factuur op betaald via de gewone
-- statuswissel (sent/forwarded → paid), zodat de trigger de bronregels
-- meeneemt. De bankregel komt op de factuur te staan, zoals bij verkoop- en
-- inkoopfacturen.

-- 1. Het type 'commission' op een bankregel.
DO $$
DECLARE
  v_name text;
BEGIN
  SELECT conname INTO v_name
    FROM pg_constraint
   WHERE conrelid = 'public.bank_statement_lines'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%matched_invoice_type%';
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.bank_statement_lines DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE public.bank_statement_lines
  ADD CONSTRAINT bank_statement_lines_matched_invoice_type_check
  CHECK (matched_invoice_type IN ('sales', 'purchase', 'batch', 'commission'));

-- 2. De bankregel op de commissiefactuur.
ALTER TABLE public.commission_invoices
  ADD COLUMN IF NOT EXISTS bank_line_id uuid REFERENCES public.bank_statement_lines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commission_invoices_bank_line
  ON public.commission_invoices(bank_line_id) WHERE bank_line_id IS NOT NULL;

COMMENT ON COLUMN public.commission_invoices.bank_line_id IS
  'Bankregel waarmee de betaling is gematcht (Bankafschriften); gezet bij bevestigen van de match.';
