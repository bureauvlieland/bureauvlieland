#!/usr/bin/env bash
# Herstelt de Lovable-export (pg_dump custom format, versie 1.16) in het nieuwe
# Supabase-project. Gevalideerd op een lokale PostgreSQL 17 met de export van
# 7 september 2026 (docs/migratie-supabase.md).
#
# Gebruik:
#   NEW_DB_URL='postgresql://postgres.<ref>:<wachtwoord>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres' \
#   supabase/scripts/restore-from-lovable.sh pad/naar/bureauvlieland_260907.backup
#
# Vereist pg_restore 17 of hoger (de export is gemaakt met pg_dump 18; oudere
# pg_restore weigert het bestand met "unsupported version (1.16)").
#
# Drie fasen, omdat de data 27 rijen in program_template_items bevat die naar
# verwijderde templates wijzen (wellness-natuur-3d, complete-eilandervaring).
# Met die rijen kan de foreign key in de post-data-fase niet worden aangemaakt;
# daarom ruimen we ze op tussen data en post-data.
set -euo pipefail

DUMP="${1:?pad naar het .backup-bestand}"
: "${NEW_DB_URL:?NEW_DB_URL ontbreekt}"

if ! pg_restore --version | grep -qE ' (1[7-9]|[2-9][0-9])\.'; then
  echo "pg_restore 17 of hoger nodig; gevonden: $(pg_restore --version)" >&2
  exit 1
fi

# Fouten die we verwachten en negeren: schema's en extensies die Supabase al
# heeft (extensions, graphql_public, vault, pg_cron, pg_net, supabase_vault).
COMMON=(--no-owner --no-privileges --no-comments --dbname "$NEW_DB_URL")

echo "== Fase 1: structuur (pre-data)"
pg_restore "${COMMON[@]}" --section=pre-data "$DUMP" 2>&1 | tee restore-pre-data.log | grep -E "error:" || true

echo "== Fase 2: data"
pg_restore "${COMMON[@]}" --section=data "$DUMP" 2>&1 | tee restore-data.log | grep -E "error:" || true

echo "== Opruimen: wees-rijen in program_template_items"
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -c "
  delete from public.program_template_items
  where template_id not in (select id from public.program_templates);"

echo "== Fase 3: indexes, constraints, triggers (post-data)"
pg_restore "${COMMON[@]}" --section=post-data "$DUMP" 2>&1 | tee restore-post-data.log | grep -E "error:" || true

echo "== Fase 4: wat in fase 2 niet kon"
# a) auth.identities (de koppeling gebruiker <-> inlogmethode) staat in de export
#    vóór auth.users; met Supabase's eigen foreign keys faalt die COPY dan.
#    Nu de gebruikers er zijn lukt hij wel. Zonder deze rijen kan niemand inloggen.
if [ "$(psql "$NEW_DB_URL" -Atc 'select count(*) from auth.identities')" = "0" ]; then
  pg_restore "${COMMON[@]}" --data-only -n auth -t identities "$DUMP" 2>&1 | tee restore-identities.log | grep -E "error:" || true
fi
echo "identities: $(psql "$NEW_DB_URL" -Atc 'select count(*) from auth.identities') (verwacht: evenveel als gebruikers)"

# b) cron.job mag niet rechtstreeks gevuld worden (alleen via cron.schedule()).
#    De rijen uit de export gaan in een tijdelijke tabel en worden van daaruit
#    opnieuw ingepland. Bestaande jobs met dezelfde naam worden overschreven.
pg_restore --data-only -n cron -t job -f cron-job.sql "$DUMP"
{
  echo "create temp table _mig_cron_job (like cron.job);"
  sed 's/^COPY cron\.job /COPY _mig_cron_job /'
  cat <<'SQL'
select cron.schedule(jobname, schedule, command) from _mig_cron_job where jobname is not null order by jobid;
select cron.schedule(schedule, command) from _mig_cron_job where jobname is null order by jobid;
select cron.alter_job(j.jobid, active := false) from cron.job j join _mig_cron_job m on m.jobname = j.jobname where not m.active;
select count(*) as cron_jobs_ingepland from cron.job;
SQL
} < cron-job.sql > cron-schedule.sql
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -q -f cron-schedule.sql

# --- Fase 5: toegangsrechten -----------------------------------------------
# De drie secties draaien met --no-privileges; zonder deze fase heeft geen
# enkele app-rol (anon, authenticated, service_role) toegang en kan niemand
# inloggen (zo ging het op 7 september 2026).
echo "== Fase 5: toegangsrechten op schema public"
"$(dirname "$0")/restore-privileges.sh" "$DUMP"

echo
echo "Klaar. Controleer de logs op 'error:' regels die NIET over Supabase's eigen schema's (auth/storage/realtime/extensions/vault) gaan."
echo "Volgende stap: supabase/scripts/after-restore.sql (zie docs/migratie-supabase.md)."
