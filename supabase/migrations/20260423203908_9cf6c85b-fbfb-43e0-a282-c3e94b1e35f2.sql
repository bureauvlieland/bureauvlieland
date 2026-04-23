-- Verwijder plaintext wachtwoorden en de kolom zelf
UPDATE public.partners SET initial_password = NULL WHERE initial_password IS NOT NULL;
ALTER TABLE public.partners DROP COLUMN initial_password;