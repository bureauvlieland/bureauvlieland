-- Klantportaal fase 3c (docs/plan-klantportaal-ontwerpsysteem.md, besluit 8):
-- de beta-banner "Nieuwe klantomgeving" is weg uit het portaal; de instelling
-- erachter heeft geen lezer meer.
DELETE FROM public.app_settings WHERE id = 'portal_beta_banner_enabled';
