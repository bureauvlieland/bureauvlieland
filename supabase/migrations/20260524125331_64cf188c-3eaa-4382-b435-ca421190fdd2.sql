
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.app_settings
SET is_public = true
WHERE id IN (
  'tourist_tax_pp_per_day',
  'nature_contribution_pp',
  'bureau_central_surcharge_pp',
  'coordination_fee_tiers',
  'default_partner_commission',
  'default_accommodation_commission',
  'default_vat_rate',
  'accommodation_vat_rate',
  'request_expiry_days',
  'proforma_deadline_days',
  'customer_portal_enabled',
  'portal_beta_banner_enabled',
  'bureau_company_name',
  'bureau_legal_name',
  'bureau_website',
  'bureau_phone',
  'bureau_address',
  'bureau_street',
  'bureau_postal_code',
  'bureau_city'
);

DROP POLICY IF EXISTS "Public can read app settings" ON public.app_settings;

CREATE POLICY "Public can read public app settings"
  ON public.app_settings
  FOR SELECT
  USING (is_public = true OR public.is_admin(auth.uid()));
