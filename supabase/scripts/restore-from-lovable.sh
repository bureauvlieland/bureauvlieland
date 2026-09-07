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

echo
echo "Klaar. Controleer de logs op 'error:' regels die NIET over extensions/graphql_public/vault/pg_cron/pg_net/supabase_vault gaan."
echo "Volgende stap: supabase/scripts/after-restore.sql (zie docs/migratie-supabase.md)."
