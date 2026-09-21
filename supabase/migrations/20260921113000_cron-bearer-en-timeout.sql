-- Cron-jobs na de verhuizing (8 september 2026). Onder Lovable Cloud stond
-- verify_jwt bij elke edge function uit; een apikey-header volstond. In het
-- eigen project bepaalt supabase/config.toml dat per functie, met de
-- CLI-standaard `true` voor functies die er niet in staan. De gateway
-- weigert een aanroep zonder Authorization-header dan met 401 "Missing
-- authorization header": cron-watchdog, critical-selftest,
-- flag-missing-partner-invoices, auto-close-past-execution,
-- auto-close-monitor, send-arrival-reminder en map-sync-blocks draaiden
-- daardoor sinds 8 september geen enkele keer, en de watchdog kon dat niet
-- melden omdat hij zelf ook geweigerd werd.
--
-- Fix: elke job die een edge function aanroept krijgt de anon key als
-- `apikey` én als `Authorization: Bearer …`. Dat is de publieke sleutel uit
-- .env, geen geheim. De jobs zijn in de loop van de tijd op verschillende
-- manieren geschreven (JSON-literal met alleen apikey, Lovable-stijl met
-- alleen Authorization, jsonb_build_object, zonder headers); elke vorm wordt
-- aangevuld met wat ontbreekt, zonder een bestaande header te vervangen.
--
-- Daarnaast wachtte pg_net maar 5 seconden op antwoord (de standaard).
-- check-pending-items, send-guest-details-reminder en
-- notify-partners-missing-invoice-pdf doen er langer over en werden elke
-- dag als "fout" gemeld terwijl ze gewoon doorliepen. Twee minuten wachten
-- past bij de maximale looptijd van een edge function.
--
-- De job refresh-google-reviews-daily riep een functie aan die niet meer
-- bestaat; de opvolger heet fetch-google-reviews.
--
-- Een job die na afloop nog steeds geen Authorization-header of timeout
-- heeft (een vorm die dit script niet kent), geeft een WARNING met de naam;
-- de migratie faalt daar niet op, want dan blijven alle andere jobs ook
-- kapot. De watchdog meldt zo'n job daarna vanzelf.
do $$
declare
  j record;
  cmd text;
  key text;
  named boolean;
  todo text[] := '{}';
begin
  -- De anon key: uit een job met een apikey-header, anders uit een Bearer-token.
  select coalesce(
           (select substring(command from '"apikey"\s*:\s*"([^"]+)"') from cron.job where command ~ '"apikey"\s*:\s*"' limit 1),
           (select substring(command from '''apikey''\s*,\s*''([^'']+)''') from cron.job where command ~ '''apikey''\s*,\s*''' limit 1),
           (select substring(command from '"Authorization"\s*:\s*"Bearer ([^"]+)"') from cron.job where command ~ '"Authorization"\s*:\s*"Bearer ' limit 1)
         )
    into key;
  if key is null then
    raise exception 'geen anon key gevonden in cron.job; de headers kunnen niet worden aangevuld';
  end if;

  for j in
    select jobid, jobname, command
      from cron.job
     where command like '%net.http_post(%'
  loop
    cmd := j.command;
    named := cmd ~ 'url\s*:=';

    -- Verkeerde functienaam.
    cmd := replace(cmd, '/functions/v1/refresh-google-reviews', '/functions/v1/fetch-google-reviews');

    if cmd ~ 'headers\s*:=\s*''\{' then
      -- Headers als JSON-literal.
      if cmd !~* '"authorization"\s*:' and cmd ~ '"apikey"\s*:\s*"' then
        cmd := regexp_replace(cmd, '"apikey"\s*:\s*"([^"]+)"', '"apikey":"\1","Authorization":"Bearer \1"');
      elsif cmd !~ '"apikey"\s*:' and cmd ~* '"authorization"\s*:\s*"Bearer ' then
        cmd := regexp_replace(cmd, '("authorization"\s*:\s*"Bearer ([^"]+)")', '\1,"apikey":"\2"', 'i');
      elsif cmd !~ '"apikey"\s*:' and cmd !~* '"authorization"\s*:' then
        if cmd ~ 'headers\s*:=\s*''\{\}''' then
          cmd := regexp_replace(cmd, 'headers\s*:=\s*''\{\}''', 'headers := ''{"apikey":"' || key || '","Authorization":"Bearer ' || key || '"}''');
        else
          cmd := regexp_replace(cmd, '(headers\s*:=\s*''\{)', '\1"apikey":"' || key || '","Authorization":"Bearer ' || key || '",');
        end if;
      end if;
    elsif cmd ~ 'headers\s*:=\s*jsonb_build_object\(' then
      -- Headers via jsonb_build_object.
      if cmd !~* '''authorization''' then
        cmd := regexp_replace(cmd, '(headers\s*:=\s*jsonb_build_object\()', '\1''Authorization'', ''Bearer ' || key || ''', ');
      end if;
      if cmd !~ '''apikey''' then
        cmd := regexp_replace(cmd, '(headers\s*:=\s*jsonb_build_object\()', '\1''apikey'', ''' || key || ''', ');
      end if;
      cmd := replace(cmd, ', )', ')');
    elsif named and cmd !~ 'headers\s*:=' then
      -- Geen headers-argument.
      cmd := regexp_replace(cmd, 'net\.http_post\(\s*', 'net.http_post(headers := ''{"Content-Type":"application/json","apikey":"' || key || '","Authorization":"Bearer ' || key || '"}''::jsonb, ');
    end if;

    -- Ruimere wachttijd; alleen bij benoemde argumenten, want een benoemd
    -- argument vóór positionele argumenten is een syntaxfout.
    if named and cmd !~ 'timeout_milliseconds' then
      cmd := regexp_replace(cmd, 'net\.http_post\(\s*', 'net.http_post(timeout_milliseconds := 120000, ');
    end if;

    if cmd <> j.command then
      perform cron.alter_job(j.jobid, command := cmd);
      raise notice 'cron-job % bijgewerkt', j.jobname;
    end if;

    if cmd !~* 'authorization' or cmd !~ 'timeout_milliseconds' then
      todo := todo || coalesce(j.jobname, j.jobid::text);
    end if;
  end loop;

  if array_length(todo, 1) > 0 then
    raise warning 'cron-job(s) met de hand nakijken, geen Authorization-header of timeout: %', array_to_string(todo, ', ');
  end if;
end $$;
