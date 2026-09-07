-- Terugvaloptie als de export geen ACL-regels bevat (zie restore-privileges.sh):
-- de standaardrechten van Supabase plus alle GRANT/REVOKE-regels uit
-- supabase/migrations, chronologisch. Gegenereerd op 8 september 2026.
-- Standaardrechten van een Supabase-project op schema public (wat een nieuw
-- project van zichzelf heeft en wat pg_restore --no-privileges heeft weggelaten).
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- Daarna de bewuste aanscherpingen uit de migraties, in volgorde:
-- 20260430210223_300fd4f4-c0e7-42a6-8ceb-fa9315913eaf.sql
GRANT SELECT ON public.partners_public TO anon, authenticated;
-- 20260512084500_6fdf33a2-2277-4606-9974-80df19b25702.sql
grant execute on function public.match_claudia_documents(vector, text[], int, float) to authenticated, service_role;
-- 20260512084500_6fdf33a2-2277-4606-9974-80df19b25702.sql
grant execute on function public.expire_stale_recommendations() to service_role, authenticated;
-- 20260524120334_8af987a3-f8e5-4fe4-8656-fd70185b1865.sql
GRANT SELECT ON public.program_audit_log TO authenticated;
-- 20260524120334_8af987a3-f8e5-4fe4-8656-fd70185b1865.sql
GRANT EXECUTE ON FUNCTION public.touch_partner_last_seen(text) TO authenticated;
-- 20260524120334_8af987a3-f8e5-4fe4-8656-fd70185b1865.sql
GRANT EXECUTE ON FUNCTION public.get_partner_changes_since_last_seen(text) TO authenticated;
-- 20260524120334_8af987a3-f8e5-4fe4-8656-fd70185b1865.sql
GRANT EXECUTE ON FUNCTION public.get_item_changelog(uuid, text) TO anon, authenticated;
-- 20260524130621_4ad6b281-9122-42b0-b717-a4ce1cc32320.sql
GRANT SELECT ON public.partners_public TO anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.sync_accommodation_program_link() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.sync_program_accommodation_link() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.sync_accommodation_completion_from_program() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.create_program_for_accommodation() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.create_todo_for_new_accommodation_request() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.recalculate_program_completion_status() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.update_accommodation_declined_count() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.scan_stale_pending_changes() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.expire_stale_recommendations() FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.match_claudia_documents(vector, text[], integer, double precision) FROM anon, authenticated;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.get_partner_changes_since_last_seen(text) FROM anon;
-- 20260524153305_f6fd3e3d-fee4-4e4b-a4f9-90f3b5b679f3.sql
REVOKE EXECUTE ON FUNCTION public.touch_partner_last_seen(text) FROM anon;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT INSERT ON public.program_requests TO anon;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_requests TO authenticated;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT ALL ON public.program_requests TO service_role;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT INSERT ON public.program_request_items TO anon;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_request_items TO authenticated;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT ALL ON public.program_request_items TO service_role;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT INSERT ON public.program_request_history TO anon;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_request_history TO authenticated;
-- 20260527121334_3490ad03-9939-485d-a1d6-9743783ea98b.sql
GRANT ALL ON public.program_request_history TO service_role;
-- 20260528102128_1054f65d-b3eb-4bef-aee7-919dbd3e6ef0.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_batches TO authenticated;
-- 20260528102128_1054f65d-b3eb-4bef-aee7-919dbd3e6ef0.sql
GRANT ALL ON public.payment_batches TO service_role;
-- 20260528144225_b8548206-ae8d-41b2-92c8-d04b751e4135.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statements TO authenticated;
-- 20260528144225_b8548206-ae8d-41b2-92c8-d04b751e4135.sql
GRANT ALL ON public.bank_statements TO service_role;
-- 20260528144225_b8548206-ae8d-41b2-92c8-d04b751e4135.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_statement_lines TO authenticated;
-- 20260528144225_b8548206-ae8d-41b2-92c8-d04b751e4135.sql
GRANT ALL ON public.bank_statement_lines TO service_role;
-- 20260529095338_f63deebe-5926-4d59-9ae7-c3499cdd5cea.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_contacts TO authenticated;
-- 20260529095338_f63deebe-5926-4d59-9ae7-c3499cdd5cea.sql
GRANT ALL ON public.whatsapp_contacts TO service_role;
-- 20260602132445_db5a1541-4651-427f-aa42-8973e127ef8c.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_purchase_invoice_ticket_matches TO authenticated;
-- 20260602132445_db5a1541-4651-427f-aa42-8973e127ef8c.sql
GRANT ALL ON public.partner_purchase_invoice_ticket_matches TO service_role;
-- 20260603112039_451aa9f6-8aee-4a94-a13d-5e3fc144989d.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_post_charges TO authenticated;
-- 20260603112039_451aa9f6-8aee-4a94-a13d-5e3fc144989d.sql
GRANT ALL ON public.partner_post_charges TO service_role;
-- 20260609141436_ea889066-0cf3-4fdf-9828-ba6e5c3f6fc9.sql
GRANT ALL ON public.program_drafts TO service_role;
-- 20260615062406_9b3188ca-a0f9-4cbd-9c69-fb6de15552f5.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_settings TO authenticated;
-- 20260615062406_9b3188ca-a0f9-4cbd-9c69-fb6de15552f5.sql
GRANT ALL ON public.social_settings TO service_role;
-- 20260615062406_9b3188ca-a0f9-4cbd-9c69-fb6de15552f5.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_media_assets TO authenticated;
-- 20260615062406_9b3188ca-a0f9-4cbd-9c69-fb6de15552f5.sql
GRANT ALL ON public.social_media_assets TO service_role;
-- 20260615062406_9b3188ca-a0f9-4cbd-9c69-fb6de15552f5.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
-- 20260615062406_9b3188ca-a0f9-4cbd-9c69-fb6de15552f5.sql
GRANT ALL ON public.social_posts TO service_role;
-- 20260617160238_64932371-58f0-46b3-8019-a3d31f013b9e.sql
GRANT SELECT ON public.google_reviews_cache TO anon;
-- 20260617160238_64932371-58f0-46b3-8019-a3d31f013b9e.sql
GRANT SELECT ON public.google_reviews_cache TO authenticated;
-- 20260617160238_64932371-58f0-46b3-8019-a3d31f013b9e.sql
GRANT ALL ON public.google_reviews_cache TO service_role;
-- 20260618150327_b0d4eb07-941e-45b1-af1e-d35562e1f125.sql
GRANT SELECT ON public.building_block_components TO anon, authenticated;
-- 20260618150327_b0d4eb07-941e-45b1-af1e-d35562e1f125.sql
GRANT ALL ON public.building_block_components TO service_role;
-- 20260623174655_9ad673ef-2584-4fa6-ae42-e9df5dbc3870.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_inbox TO authenticated;
-- 20260623174655_9ad673ef-2584-4fa6-ae42-e9df5dbc3870.sql
GRANT ALL ON public.sales_inbox TO service_role;
-- 20260624131854_0707a8da-73aa-4f32-b813-aac643652bec.sql
GRANT SELECT ON public.partner_accommodation_requests_safe TO authenticated;
-- 20260624131854_0707a8da-73aa-4f32-b813-aac643652bec.sql
GRANT EXECUTE ON FUNCTION public.get_partner_linked_program_invoicing_modes(uuid[]) TO authenticated;
-- 20260626094409_8e60e52e-5e43-473c-9dfb-3cefca55ddd2.sql
REVOKE ALL ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) FROM PUBLIC;
-- 20260626094409_8e60e52e-5e43-473c-9dfb-3cefca55ddd2.sql
GRANT EXECUTE ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) TO anon, authenticated, service_role;
-- 20260629044122_3eb56f9e-1f48-45aa-99e9-ba1a4fba275b.sql
REVOKE ALL ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) FROM PUBLIC;
-- 20260629044122_3eb56f9e-1f48-45aa-99e9-ba1a4fba275b.sql
GRANT EXECUTE ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) TO anon, authenticated, service_role;
-- 20260704050829_f4ef4df2-aace-4ae7-b783-66c2a5d4aefe.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_documents TO authenticated;
-- 20260704050829_f4ef4df2-aace-4ae7-b783-66c2a5d4aefe.sql
GRANT ALL ON public.project_documents TO service_role;
-- 20260705181811_8179ab1c-751d-444e-9d22-64b23287879a.sql
REVOKE SELECT (customer_signature_name, customer_terms_ip, customer_terms_accepted_at) ON public.accommodation_quotes FROM authenticated;
-- 20260705181811_8179ab1c-751d-444e-9d22-64b23287879a.sql
REVOKE SELECT (customer_signature_name, customer_terms_ip, customer_terms_accepted_at) ON public.accommodation_quotes FROM anon;
-- 20260705181811_8179ab1c-751d-444e-9d22-64b23287879a.sql
REVOKE ALL ON FUNCTION public.get_accommodation_quote_terms(uuid) FROM PUBLIC;
-- 20260705181811_8179ab1c-751d-444e-9d22-64b23287879a.sql
GRANT EXECUTE ON FUNCTION public.get_accommodation_quote_terms(uuid) TO authenticated;
-- 20260705181850_939e65a8-ee0a-4790-b47e-64e837faae6a.sql
REVOKE ALL ON FUNCTION public.is_any_admin_online() FROM PUBLIC;
-- 20260705181850_939e65a8-ee0a-4790-b47e-64e837faae6a.sql
GRANT EXECUTE ON FUNCTION public.is_any_admin_online() TO authenticated, anon;
-- 20260708171713_be9c2d37-7701-4064-9d93-e8810b4a4f5e.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_suppressions TO authenticated;
-- 20260708171713_be9c2d37-7701-4064-9d93-e8810b4a4f5e.sql
GRANT ALL ON public.email_suppressions TO service_role;
-- 20260709053310_86e545d2-cf22-48ef-9ebe-3bffe29b3de7.sql
GRANT SELECT ON public.auto_close_run_log TO authenticated;
-- 20260709053310_86e545d2-cf22-48ef-9ebe-3bffe29b3de7.sql
GRANT ALL ON public.auto_close_run_log TO service_role;
-- 20260711074600_11c4bdfb-b4bb-485b-ad8f-dcf6747133d3.sql
REVOKE SELECT ON public.shared_programs FROM anon, authenticated;
-- 20260711074600_11c4bdfb-b4bb-485b-ad8f-dcf6747133d3.sql
REVOKE ALL ON FUNCTION public.get_shared_program(text) FROM public;
-- 20260711074600_11c4bdfb-b4bb-485b-ad8f-dcf6747133d3.sql
GRANT EXECUTE ON FUNCTION public.get_shared_program(text) TO anon, authenticated;
-- 20260714184303_349cd9d8-afca-4661-bf01-ed27f7a196ef.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_request_item_quote_lines TO authenticated;
-- 20260714184303_349cd9d8-afca-4661-bf01-ed27f7a196ef.sql
GRANT ALL ON public.program_request_item_quote_lines TO service_role;
-- 20260721204635_44882e0f-6463-4147-83a1-e1f728f68778.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_invoice_reconciliation_findings TO authenticated;
-- 20260721204635_44882e0f-6463-4147-83a1-e1f728f68778.sql
GRANT ALL ON public.purchase_invoice_reconciliation_findings TO service_role;
-- 20260724124912_b178571a-23a4-46aa-ad42-bac6e21c5979.sql
REVOKE UPDATE ( commission_percentage, commission_amount, commission_status, commission_invoiced_at, invoiced_amount, invoiced_number, invoiced_date, actual_invoiced_excl_vat, proforma_commission, customer_terms_accepted_at, customer_signature_name, customer_terms_ip, partner_id, request_id ) ON public.accommodation_quotes FROM authenticated;
-- 20260724124912_b178571a-23a4-46aa-ad42-bac6e21c5979.sql
REVOKE UPDATE ( status, approved_at, paid_at, forwarded_to_accounting_at, forwarded_by, payment_batch_id, amount_excl_vat, amount_incl_vat, vat_amount, vat_rate, partner_id, request_id, item_id, registered_by ) ON public.partner_purchase_invoices FROM authenticated;
-- 20260727094353_fbfed572-ac94-4f6d-b919-fbe044fa629b.sql
GRANT EXECUTE ON FUNCTION public.append_customer_program_history(uuid, text, text, text, jsonb) TO anon, authenticated;
-- 20260810093536_41a80c05-b5f7-46b5-b6a5-3f4e7694fb86.sql
REVOKE SELECT ON public.building_blocks FROM anon;
-- 20260810093536_41a80c05-b5f7-46b5-b6a5-3f4e7694fb86.sql
GRANT SELECT ( id, slug, name, description, short_description, category, block_type, provider_id, min_people, max_people, duration, price_adult, price_adult_note, price_type, price_child, price_child_note, price_child_min_age, price_child_max_age, price_pet, price_pet_note, is_from_price, price_display_override, price_extras, external_url, image_url, image_asset, is_published, is_active, sort_order, tags, seasonal_notes, created_at, updated_at, price_includes_vat, vat_rate, status, location_lat, location_lng, location_address, map_activity_type_id, catering_type, catering_role, required_with, suggested_addons, scaling_rules ) ON public.building_blocks TO anon;
-- 20260813111541_58f10ac4-e31b-4a71-852c-58daee4c9208.sql
GRANT ALL ON public.booking_events TO service_role;
-- 20260814124119_abbfa3ec-7730-4260-a74b-af0083fa480b.sql
GRANT SELECT ON public.booking_events TO authenticated;
-- 20260819084803_f27ff457-0eef-45d2-bf4f-9a2cb6a1808f.sql
GRANT SELECT ON public.building_blocks TO anon;
-- 20260819084803_f27ff457-0eef-45d2-bf4f-9a2cb6a1808f.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.building_blocks TO authenticated;
-- 20260819084803_f27ff457-0eef-45d2-bf4f-9a2cb6a1808f.sql
GRANT ALL ON public.building_blocks TO service_role;
-- 20260824172512_b3fe5351-d2ca-49bc-a8f6-f6961730b918.sql
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
-- 20260824205421_4af3c636-541e-4308-9aae-073666b92185.sql
GRANT SELECT ON public.pricing_structures TO anon;
-- 20260824205421_4af3c636-541e-4308-9aae-073666b92185.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_structures TO authenticated;
-- 20260824205421_4af3c636-541e-4308-9aae-073666b92185.sql
GRANT ALL ON public.pricing_structures TO service_role;
-- 20260824205421_4af3c636-541e-4308-9aae-073666b92185.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.program_revision_charges TO authenticated;
-- 20260824205421_4af3c636-541e-4308-9aae-073666b92185.sql
GRANT ALL ON public.program_revision_charges TO service_role;
-- 20260824210249_5c93912d-271b-4e0c-acae-2e8b20c10bc0.sql
REVOKE ALL ON FUNCTION public.snapshot_fee_structure() FROM PUBLIC, anon, authenticated;
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT SELECT ON public.selftest_runs TO authenticated;
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT ALL ON public.selftest_runs TO service_role;
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT SELECT ON public.building_blocks TO anon, authenticated';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT SELECT ON public.building_block_components TO anon, authenticated';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT SELECT ON public.partners_public TO anon, authenticated';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT SELECT ON public.pricing_structures TO anon, authenticated';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT SELECT ON public.google_reviews_cache TO anon, authenticated';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT EXECUTE ON FUNCTION public.submit_self_service_program_request(jsonb, jsonb) TO anon, authenticated, service_role';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT EXECUTE ON FUNCTION public.get_shared_program(text) TO anon, authenticated';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT EXECUTE ON FUNCTION public.append_customer_program_history(uuid, text, text, text, jsonb) TO anon, authenticated';
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
REVOKE ALL ON FUNCTION public.selftest_autofix() FROM PUBLIC;
-- 20260831124516_23c8d95f-4c63-4946-bdf2-65a6c342aa07.sql
GRANT EXECUTE ON FUNCTION public.selftest_autofix() TO service_role;
-- 20260901201703_193c639a-1f33-4285-91e2-bced33aa6601.sql
GRANT SELECT ON public.email_webhook_attempts TO authenticated;
-- 20260901201703_193c639a-1f33-4285-91e2-bced33aa6601.sql
GRANT ALL ON public.email_webhook_attempts TO service_role;
-- 20260902045914_7045f81b-b1d8-45fb-8660-272319f0bd8c.sql
revoke all on function public.get_scheduled_job_health() from public;
-- 20260902045914_7045f81b-b1d8-45fb-8660-272319f0bd8c.sql
grant execute on function public.get_scheduled_job_health() to authenticated, service_role;
-- 20260902050041_d299a2d4-564b-4808-964c-6cbc999efdb2.sql
grant select on public.cron_dispatch_log to authenticated;
-- 20260902050041_d299a2d4-564b-4808-964c-6cbc999efdb2.sql
grant all on public.cron_dispatch_log to service_role;
-- 20260902050041_d299a2d4-564b-4808-964c-6cbc999efdb2.sql
revoke all on function public.resolve_cron_dispatches() from public;
-- 20260902050041_d299a2d4-564b-4808-964c-6cbc999efdb2.sql
grant execute on function public.resolve_cron_dispatches() to service_role;
-- 20260902050126_384c0d3b-3856-471c-a9c3-cc630b29e685.sql
revoke all on function public.get_scheduled_job_health() from public;
-- 20260902050126_384c0d3b-3856-471c-a9c3-cc630b29e685.sql
grant execute on function public.get_scheduled_job_health() to authenticated, service_role;
-- 20260902050849_a0b519ae-ece3-43c3-b2b2-993611589775.sql
GRANT SELECT ON public.cron_job_first_seen TO authenticated;
-- 20260902050849_a0b519ae-ece3-43c3-b2b2-993611589775.sql
GRANT ALL ON public.cron_job_first_seen TO service_role;
-- 20260902061133_12f1b065-57ee-421e-a635-06c5f2c3bdc0.sql
GRANT SELECT ON public.email_webhook_events TO authenticated;
-- 20260902061133_12f1b065-57ee-421e-a635-06c5f2c3bdc0.sql
GRANT ALL ON public.email_webhook_events TO service_role;
-- 20260903104211_56730f9f-91cf-4d7e-b40b-781b38efd452.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_unavailability TO authenticated;
-- 20260903104211_56730f9f-91cf-4d7e-b40b-781b38efd452.sql
GRANT ALL ON public.partner_unavailability TO service_role;
-- 20260903104211_56730f9f-91cf-4d7e-b40b-781b38efd452.sql
GRANT SELECT ON public.partner_unavailability_public TO anon, authenticated;
-- 20260903104239_67304ef8-7470-4657-b422-494d7f03918d.sql
GRANT EXECUTE ON FUNCTION public.get_public_partner_unavailability() TO anon, authenticated;
