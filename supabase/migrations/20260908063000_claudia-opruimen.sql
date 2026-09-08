-- Claudia (AI-assistent in de Werkbank) verwijderd: werd niet gebruikt en was
-- het enige onderdeel dat een OpenAI-sleutel nodig had (embeddings voor de
-- zoekindex). Weg: de dagelijkse scan en de nachtelijke herindexering
-- (cron), de drie tabellen en de twee functies uit migratie 20260512084500.
-- De edge functions claudia-chat, claudia-daily-scan en claudia-reindex zijn
-- uit de repo verwijderd; op het project verdwijnen ze via
-- `supabase functions delete` (zie docs/deployen.md).

select cron.unschedule(jobid) from cron.job
 where jobname in ('claudia-daily-scan-0600-nl', 'claudia-reindex-nightly');

drop function if exists public.match_claudia_documents(vector, text[], integer, double precision);
drop function if exists public.expire_stale_recommendations();

drop table if exists public.claudia_run_log;
drop table if exists public.claudia_documents;
drop table if exists public.admin_recommendations;
-- De extensie vector blijft staan (Supabase-standaard, onschuldig zonder tabellen).
