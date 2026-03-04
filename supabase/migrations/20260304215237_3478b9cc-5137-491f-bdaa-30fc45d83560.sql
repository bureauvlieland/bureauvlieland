
-- Add contact_email column to partners table
ALTER TABLE public.partners ADD COLUMN contact_email text NULL;

-- Set contact_email for all three Island Events hotels
UPDATE public.partners SET contact_email = 'info@islandevents.nl' WHERE id IN ('hotel-de-wadden', 'hotel-doniastate', 'strandhotel-seeduyn');

-- Restore login emails for De Wadden and Doniastate to match their auth accounts
UPDATE public.partners SET email = 'dewadden@westcordhotels.nl' WHERE id = 'hotel-de-wadden';
UPDATE public.partners SET email = 'info@doniastatevlieland.nl' WHERE id = 'hotel-doniastate';
