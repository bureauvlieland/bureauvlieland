ALTER TABLE public.program_request_items
  ADD COLUMN IF NOT EXISTS admin_price_override_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_price_change_acknowledged_at timestamptz;

-- Backfill: voor bestaande items met een override gaan we ervan uit dat de
-- prijs al door de partner gezien is (geen open prijswijziging).
UPDATE public.program_request_items
SET admin_price_override_updated_at = COALESCE(updated_at, created_at, now())
WHERE admin_price_override IS NOT NULL
  AND admin_price_override_updated_at IS NULL;

UPDATE public.program_request_items
SET partner_price_change_acknowledged_at = COALESCE(quoted_at, updated_at, created_at, now())
WHERE quoted_price IS NOT NULL
  AND partner_price_change_acknowledged_at IS NULL;