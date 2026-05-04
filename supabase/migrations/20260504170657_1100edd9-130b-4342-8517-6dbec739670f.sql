ALTER TABLE public.accommodation_quotes
  ADD COLUMN IF NOT EXISTS customer_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_signature_name text,
  ADD COLUMN IF NOT EXISTS customer_terms_ip text;

COMMENT ON COLUMN public.accommodation_quotes.customer_terms_accepted_at IS 'Tijdstip waarop de klant bij de selectie van deze offerte akkoord heeft gegeven op de relevante voorwaarden (deel-akkoord, juridisch ankerpunt voor logies).';
COMMENT ON COLUMN public.accommodation_quotes.customer_signature_name IS 'Volledige naam ingetypt door de klant als digitale handtekening op het deel-akkoord.';
COMMENT ON COLUMN public.accommodation_quotes.customer_terms_ip IS 'IP-adres van de klant op het moment van het deel-akkoord (audit trail).';