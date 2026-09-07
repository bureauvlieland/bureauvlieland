#!/usr/bin/env bash
# Voert de verhuizing van Lovable Cloud naar het eigen Supabase-project uit,
# stap voor stap en herhaalbaar. Zie docs/migratie-supabase.md.
#
# Omgevingsvariabelen (zet ze in de instellingen van de Claude-omgeving, dan
# staan ze in geen enkele chat of bestand):
#   NEW_DB_PASSWORD        databasewachtwoord van het nieuwe project
#   NEW_SERVICE_ROLE_KEY   service_role key van het nieuwe project
#   SUPABASE_ACCESS_TOKEN  personal access token (supabase.com/dashboard/account/tokens)
#   ADMIN_EMAIL/ADMIN_PASSWORD  admin-login van de app, voor het kopiëren van bestanden
#
# Gebruik:
#   supabase/scripts/run-migration.sh check                  # netwerk en sleutels testen
#   supabase/scripts/run-migration.sh restore <dump.backup>  # database terugzetten + nascript
#   supabase/scripts/run-migration.sh storage [--dry-run]    # bestanden kopiëren
#   supabase/scripts/run-migration.sh functions              # 134 edge functions deployen
set -euo pipefail
cd "$(dirname "$0")/../.."

NEW_REF="utshmnyrjzwtrpttxdlw"
NEW_URL="https://${NEW_REF}.supabase.co"
NEW_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0c2htbnlyanp3dHJwdHR4ZGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTEwMTksImV4cCI6MjEwNDM2NzAxOX0.FR8Ia5dJaNtoL5yGBhiidmW1VKR1gvl-B29C7JnpZ9I"
OLD_URL="https://blhspuifehausilnzwio.supabase.co"
OLD_ANON_KEY="$(grep '^VITE_SUPABASE_PUBLISHABLE_KEY=' .env | cut -d'"' -f2)"
POOLER_HOST="aws-0-eu-west-1.pooler.supabase.com"

db_url() {
  : "${NEW_DB_PASSWORD:?NEW_DB_PASSWORD ontbreekt}"
  # Session pooler (poort 5432); wachtwoord URL-encoded.
  local pw; pw="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$NEW_DB_PASSWORD")"
  echo "postgresql://postgres.${NEW_REF}:${pw}@${POOLER_HOST}:5432/postgres"
}

cmd="${1:-check}"; shift || true
case "$cmd" in
  check)
    echo "== Netwerk"
    for h in "$NEW_URL" "https://api.supabase.com" "$OLD_URL"; do
      printf "%-45s " "$h"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 15 "$h/" || true
    done
    echo "== Database (session pooler)"
    psql "$(db_url)" -Atc "select current_database(), version();" || echo "GEEN databaseverbinding"
    echo "== Storage-API nieuw project (service_role)"
    curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer ${NEW_SERVICE_ROLE_KEY:?}" -H "apikey: ${NEW_SERVICE_ROLE_KEY}" "$NEW_URL/storage/v1/bucket"
    echo "== Supabase CLI"
    SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:?}" npx --yes supabase@latest projects list 2>&1 | grep -E "$NEW_REF|error" || true
    ;;
  restore)
    dump="${1:?pad naar .backup}"
    export NEW_DB_URL; NEW_DB_URL="$(db_url)"
    supabase/scripts/restore-from-lovable.sh "$dump"
    psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 \
      -v old_url="$OLD_URL" -v new_url="$NEW_URL" \
      -v old_key="$OLD_ANON_KEY" -v new_key="$NEW_ANON_KEY" \
      -f supabase/scripts/after-restore.sql
    ;;
  storage)
    OLD_URL="$OLD_URL" OLD_ANON_KEY="$OLD_ANON_KEY" \
    ADMIN_EMAIL="${ADMIN_EMAIL:?}" ADMIN_PASSWORD="${ADMIN_PASSWORD:?}" \
    NEW_URL="$NEW_URL" NEW_SERVICE_ROLE_KEY="${NEW_SERVICE_ROLE_KEY:?}" \
      npx tsx scripts/migrate-storage.ts "$@"
    ;;
  functions)
    export SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:?}"
    npx --yes supabase@latest link --project-ref "$NEW_REF" --password "${NEW_DB_PASSWORD:?}"
    npx --yes supabase@latest functions deploy --project-ref "$NEW_REF"
    ;;
  *) echo "onbekend commando: $cmd" >&2; exit 1 ;;
esac
