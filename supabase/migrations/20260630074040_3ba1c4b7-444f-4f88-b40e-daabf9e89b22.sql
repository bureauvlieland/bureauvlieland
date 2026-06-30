-- Tighten anon append rule on program_request_history so anonymous callers
-- cannot impersonate admins/partners in the audit trail. The existing
-- sanitize_anon_program_request_history() trigger already overwrites these
-- fields, but enforcing it at the policy layer makes the table fail-closed
-- against future trigger regressions.

DROP POLICY IF EXISTS "Anon can append history to recent requests only" ON public.program_request_history;

CREATE POLICY "Anon can append history to recent requests only"
ON public.program_request_history
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.program_request_is_recent(request_id)
  AND (
    -- Authenticated admins keep full freedom.
    public.is_admin(auth.uid())
    OR (
      -- Anonymous / non-admin callers may only log themselves as "customer"
      -- with no custom actor name and a bounded action label.
      COALESCE(actor, 'customer') = 'customer'
      AND actor_name IS NULL
      AND action IS NOT NULL
      AND char_length(action) <= 100
    )
  )
);
