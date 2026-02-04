-- Add feature flag for customer portal
INSERT INTO public.app_settings (id, category, label, value, value_type, description)
VALUES (
  'customer_portal_enabled',
  'features',
  'Klantportaal actief',
  'false',
  'boolean',
  'Wanneer uitgeschakeld worden klanten doorgestuurd naar een "Binnenkort beschikbaar" pagina. Zet aan wanneer alle partners actief zijn.'
)
ON CONFLICT (id) DO NOTHING;