-- Extend customer portal token validity to 5 years (was 90 days).
-- Customers complained that links to their program/lodging pages stopped
-- working after a few months. The token itself is a high-entropy secret
-- and pages are noindex; 5 years keeps them accessible for the lifetime
-- of the project without changing the gating model.

ALTER TABLE public.program_requests
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 years');

ALTER TABLE public.accommodation_requests
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '5 years');

-- Bump existing non-closed rows so already-issued links keep working.
UPDATE public.program_requests
SET expires_at = now() + interval '5 years'
WHERE status NOT IN ('cancelled', 'deleted')
  AND expires_at < now() + interval '5 years';

UPDATE public.accommodation_requests
SET expires_at = now() + interval '5 years'
WHERE status NOT IN ('cancelled', 'deleted', 'rejected')
  AND expires_at < now() + interval '5 years';