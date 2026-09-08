-- Social-media-planner verwijderd (werd niet gebruikt): tabellen uit migratie
-- 20260615062406. De edge functions social-* en de admin-pagina's /admin/social*
-- zijn uit de repo; op het project verdwijnen de functies via de deploy-workflow
-- (delete_functions). Blijven handmatig over: storage-bucket "social-media"
-- (kan geüploade beelden bevatten) en de secrets META_APP_ID / META_APP_SECRET.
drop table if exists public.social_posts cascade;
drop table if exists public.social_media_assets cascade;
drop table if exists public.social_settings cascade;
