INSERT INTO app_settings (id, category, label, description, value_type, value)
VALUES ('bureau_central_surcharge_pp', 'pricing', 'Opslag centrale facturatie p.p.', 'Opslag per persoon wanneer Bureau Vlieland centraal factureert', 'number', '2.50')
ON CONFLICT (id) DO NOTHING;