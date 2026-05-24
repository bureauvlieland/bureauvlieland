
-- Trigger-functies en interne functies: nooit direct aan te roepen
REVOKE EXECUTE ON FUNCTION public.sync_accommodation_program_link() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_program_accommodation_link() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_accommodation_completion_from_program() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_program_for_accommodation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_todo_for_new_accommodation_request() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_program_completion_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_accommodation_declined_count() FROM anon, authenticated;

-- Admin/cron-only
REVOKE EXECUTE ON FUNCTION public.scan_stale_pending_changes() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_recommendations() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_claudia_documents(vector, text[], integer, double precision) FROM anon, authenticated;

-- Partner-only (auth nodig)
REVOKE EXECUTE ON FUNCTION public.get_partner_changes_since_last_seen(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_partner_last_seen(text) FROM anon;

-- Klant-portaal helper: blijft anon-aanroepbaar omdat hij customer_token zelf valideert
-- public.get_item_changelog(uuid, text) — behouden

-- RLS-helpers blijven beschikbaar (worden in policies aangeroepen):
-- has_role, is_admin, is_partner, get_partner_id, partner_can_view_accommodation_request,
-- partner_has_published_block, get_invoicing_mode_for_accommodation
