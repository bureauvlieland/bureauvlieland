#!/usr/bin/env bash
# Zet de toegangsrechten (GRANT/REVOKE en default privileges) op schema public
# uit de Lovable-export in het nieuwe project.
#
# Waarom apart: restore-from-lovable.sh draait pg_restore met --no-privileges,
# zodat rechten voor rollen die alleen bij Lovable bestaan geen fouten geven.
# Daardoor ontbraken na de restore van 7 september álle rechten voor anon,
# authenticated en service_role, en kon niemand inloggen. Dit script haalt
# alleen de ACL-regels voor schema public (en de default privileges) uit de
# export en voert die uit. Fouten (bijv. een onbekende rol) worden gelogd,
# de rest gaat door.
#
# Gebruik: NEW_DB_URL=postgresql://... supabase/scripts/restore-privileges.sh <dump.backup>
# Vereist pg_restore 17 of hoger (zie restore-from-lovable.sh).
set -uo pipefail
DUMP="${1:?pad naar .backup}"
: "${NEW_DB_URL:?NEW_DB_URL ontbreekt}"

# Inhoudsopgave; alleen ACL-regels van schema public en de default privileges
# (schema "-" = globaal). Andere schema's (auth, storage, cron, ...) beheert
# Supabase zelf.
pg_restore -l "$DUMP" > toc-all.list
grep -E '^[0-9]+; [0-9]+ [0-9]+ (DEFAULT )?ACL (public|-) ' toc-all.list > toc-acl.list || true
n=$(wc -l < toc-acl.list | tr -d ' ')
echo "ACL-regels voor schema public in de export: $n"
if [ "$n" = "0" ]; then
  echo "::warning::Geen ACL-regels gevonden in de export; terugvallen op supabase/scripts/privileges-fallback.sql"
  psql "$NEW_DB_URL" -f "$(dirname "$0")/privileges-fallback.sql" 2>&1 | tee restore-privileges.log | grep -E "ERROR" || true
else
  pg_restore -L toc-acl.list -f privileges.sql "$DUMP"
  grep -cE '^(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES)' privileges.sql | xargs echo "SQL-regels:"
  # Niet stoppen bij een fout: een enkele onbekende rol mag de rest niet blokkeren.
  psql "$NEW_DB_URL" -f privileges.sql 2>&1 | tee restore-privileges.log | grep -E "ERROR" || true
fi

echo "== Controle: tabelrechten per rol in schema public"
psql "$NEW_DB_URL" -Atc "select grantee || ': ' || count(*) from information_schema.role_table_grants where table_schema='public' group by grantee order by 1;"
echo "== Controle: mag authenticated user_roles lezen, mag anon partners_public lezen?"
psql "$NEW_DB_URL" -Atc "select has_table_privilege('authenticated','public.user_roles','select'), has_table_privilege('anon','public.partners_public','select'), has_table_privilege('service_role','public.partners','select');"
