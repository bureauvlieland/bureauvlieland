-- Cron-jobs na de verhuizing (8 september 2026): sinds de restore sturen ze
-- alleen een apikey-header mee. Onder Lovable Cloud stond verify_jwt bij
-- elke edge function uit, dus dat volstond. In het eigen project bepaalt
-- supabase/config.toml dat per functie, met de CLI-standaard `true` voor
-- functies die er niet in staan. De gateway weigert die aanroepen dan met
-- 401 "Missing authorization header": cron-watchdog, critical-selftest,
-- flag-missing-partner-invoices, auto-close-past-execution,
-- auto-close-monitor, send-arrival-reminder en map-sync-blocks draaiden
-- daardoor sinds 8 september geen enkele keer, en de watchdog kon dat niet
-- melden omdat hij zelf ook geweigerd werd.
--
-- Fix: dezelfde anon key ook als `Authorization: Bearer …` meesturen. Dat is
-- de publieke sleutel uit .env, geen geheim.
--
-- Daarnaast wachtte pg_net maar 5 seconden op antwoord (de standaard).
-- check-pending-items, send-guest-details-reminder en
-- notify-partners-missing-invoice-pdf doen er langer over en werden elke
-- dag als "fout" gemeld terwijl ze gewoon doorliepen. Twee minuten wachten
-- past bij de maximale looptijd van een edge function.
--
-- De job refresh-google-reviews-daily riep een functie aan die niet meer
-- bestaat; de opvolger heet fetch-google-reviews.
do $$
declare
  j record;
  cmd text;
begin
  for j in
    select jobid, jobname, command
      from cron.job
     where command like '%net.http_post(%'
  loop
    cmd := j.command;

    -- Verkeerde functienaam.
    cmd := replace(cmd, '/functions/v1/refresh-google-reviews', '/functions/v1/fetch-google-reviews');

    -- Bestaande Authorization-header eruit, zodat dit script vaker mag draaien.
    cmd := regexp_replace(cmd, ',\s*"Authorization"\s*:\s*"[^"]*"', '', 'g');

    -- Authorization = Bearer <dezelfde sleutel als apikey>.
    cmd := regexp_replace(cmd, '"apikey"\s*:\s*"([^"]+)"', '"apikey":"\1","Authorization":"Bearer \1"');

    -- Ruimere wachttijd op het antwoord.
    if cmd !~ 'timeout_milliseconds' then
      cmd := regexp_replace(cmd, 'net\.http_post\(\s*', 'net.http_post(timeout_milliseconds := 120000, ');
    end if;

    if cmd <> j.command then
      perform cron.alter_job(j.jobid, command := cmd);
      raise notice 'cron-job % bijgewerkt', j.jobname;
    end if;
  end loop;
end $$;

-- Controle: geen http-job meer zonder Authorization-header of met de oude timeout.
do $$
declare
  n integer;
begin
  select count(*) into n
    from cron.job
   where command like '%net.http_post(%'
     and (command not like '%"Authorization"%' or command not like '%timeout_milliseconds%');
  if n > 0 then
    raise exception '% cron-job(s) nog zonder Authorization-header of timeout', n;
  end if;
end $$;
